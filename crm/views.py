from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.db.models import Count, Q, Sum
from rest_framework import filters, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import SAFE_METHODS, AllowAny, BasePermission, IsAuthenticated
from rest_framework.response import Response

from .models import Customer, Order, Product, Profile, ReturnRequest, SupportCase
from .serializers import (CaseSerializer, CustomerSerializer, OrderSerializer, ProductSerializer, ReturnSerializer)


# ---------- roles and data scope ----------
def role_of(user):
    if user.is_superuser:
        return 'admin'
    p = getattr(user, 'profile', None)
    return p.role if p else 'customer'


def scope(qs, user, prefix):
    """Admin sees all, sales sees their assigned customers, customer sees own data."""
    r = role_of(user)
    if r == 'admin':
        return qs
    if r == 'sales':
        return qs.filter(**{prefix + 'assigned_to': user})
    return qs.filter(**{prefix + 'user': user})


def guard(user, customer):
    """Staff may only act on customers they are allowed to see."""
    if role_of(user) == 'sales' and customer.assigned_to_id != user.id:
        raise PermissionDenied('This customer is not assigned to you.')


def pick_rep():
    """New customers go to the sales person with the fewest customers."""
    return (User.objects.filter(profile__role='sales', is_active=True)
            .annotate(n=Count('assigned_customers')).order_by('n', 'id').first())


class RolePerm(BasePermission):
    def has_permission(self, request, view):
        m = request.method
        if m in SAFE_METHODS:
            return True
        roles = view.create_roles if m == 'POST' else view.delete_roles if m == 'DELETE' else view.write_roles
        return role_of(request.user) in roles


class Base(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, RolePerm]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    prefix = 'customer__'
    create_roles = write_roles = delete_roles = ('admin',)

    def get_queryset(self):
        qs = scope(super().get_queryset(), self.request.user, self.prefix)
        st = self.request.query_params.get('status')
        return qs.filter(status=st) if st and hasattr(self.queryset.model, 'status') else qs


# ---------- customers and products ----------
class CustomerViewSet(Base):
    queryset = Customer.objects.select_related('assigned_to')
    serializer_class = CustomerSerializer
    prefix = ''
    create_roles = write_roles = ('admin', 'sales')
    search_fields = ['name', 'email']

    def perform_create(self, serializer):
        u = self.request.user
        rep = u if role_of(u) == 'sales' else (serializer.validated_data.get('assigned_to') or pick_rep())
        serializer.save(assigned_to=rep)

    def perform_update(self, serializer):
        if role_of(self.request.user) == 'sales':
            serializer.save(assigned_to=serializer.instance.assigned_to)
        else:
            serializer.save()


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated, RolePerm]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']
    create_roles = write_roles = delete_roles = ('admin',)

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(active=True) if role_of(self.request.user) == 'customer' else qs


# ---------- orders, returns, cases ----------
class OrderViewSet(Base):
    queryset = Order.objects.select_related('customer')
    serializer_class = OrderSerializer
    create_roles = ('admin', 'sales', 'customer')
    write_roles = ('admin', 'sales')
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']
    search_fields = ['item', 'customer__name']

    def perform_create(self, serializer):
        u, d = self.request.user, serializer.validated_data
        p = d['product']
        if not p.active:
            raise ValidationError({'product': 'This product is not available.'})
        if role_of(u) == 'customer':
            cust = getattr(u, 'customer', None)
            if not cust:
                raise ValidationError({'detail': 'No customer record for this account.'})
        else:
            cust = d.get('customer')
            if not cust:
                raise ValidationError({'customer': 'Choose a customer.'})
            guard(u, cust)
        serializer.save(customer=cust, item=p.name, total=p.price, status='placed')

    def partial_update(self, request, *a, **k):
        st = request.data.get('status')
        if st not in dict(Order.STATUS):
            raise ValidationError({'status': 'Choose a valid status.'})
        obj = self.get_object()
        obj.status = st
        obj.save()
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        obj = self.get_object()
        if role_of(request.user) == 'customer' and obj.status != 'placed':
            raise ValidationError({'detail': 'Only orders that have not shipped can be cancelled.'})
        obj.status = 'cancelled'
        obj.save()
        return Response(self.get_serializer(obj).data)


class ReturnViewSet(Base):
    queryset = ReturnRequest.objects.select_related('order__customer')
    serializer_class = ReturnSerializer
    prefix = 'order__customer__'
    create_roles = ('admin', 'customer')
    http_method_names = ['get', 'post', 'head', 'options']
    search_fields = ['order__item', 'reason']

    def perform_create(self, serializer):
        order = serializer.validated_data['order']
        u = self.request.user
        if role_of(u) == 'customer' and order.customer.user_id != u.id:
            raise PermissionDenied('This is not your order.')
        if order.status != 'delivered':
            raise ValidationError({'order': 'Only delivered orders can be returned.'})
        if order.returns.exclude(status='rejected').exists():
            raise ValidationError({'order': 'A return already exists for this order.'})
        serializer.save(refund_amount=order.total)

    def _move(self, request, frm, to):
        if role_of(request.user) != 'admin':
            raise PermissionDenied('Only admins can change a return.')
        obj = self.get_object()
        if obj.status not in frm:
            raise ValidationError({'detail': f'A {obj.status} return cannot become {to}.'})
        obj.status = to
        obj.save()
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        return self._move(request, ('requested',), 'approved')

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        return self._move(request, ('requested',), 'rejected')

    @action(detail=True, methods=['post'])
    def refund(self, request, pk=None):
        return self._move(request, ('approved',), 'refunded')


class CaseViewSet(Base):
    queryset = SupportCase.objects.select_related('customer')
    serializer_class = CaseSerializer
    create_roles = ('admin', 'sales', 'customer')
    write_roles = ('admin', 'sales')
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']
    search_fields = ['subject', 'customer__name']

    def perform_create(self, serializer):
        u = self.request.user
        if role_of(u) == 'customer':
            cust = getattr(u, 'customer', None)
            if not cust:
                raise ValidationError({'detail': 'No customer record for this account.'})
            return serializer.save(customer=cust, status='open')
        cust = serializer.validated_data.get('customer')
        if not cust:
            raise ValidationError({'customer': 'Choose a customer.'})
        guard(u, cust)
        serializer.save()


# ---------- team (admin only) ----------
class UserViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _admin(self, request):
        if role_of(request.user) != 'admin':
            raise PermissionDenied('Only admins can manage the team.')

    def _row(self, u):
        return {'id': u.id, 'username': u.username, 'name': u.get_full_name() or u.username, 'role': role_of(u), 'is_active': u.is_active}

    def list(self, request):
        self._admin(request)
        users = User.objects.filter(Q(is_superuser=True) | Q(profile__role__in=['admin', 'sales'])).order_by('username')
        return Response([self._row(u) for u in users])

    def create(self, request):
        self._admin(request)
        d = request.data
        name, username, password, role = str(d.get('name', '')).strip(), str(d.get('username', '')).strip(), d.get('password', ''), d.get('role')
        if not name:
            raise ValidationError({'name': 'Enter the full name.'})
        if len(username) < 3 or ' ' in username:
            raise ValidationError({'username': 'Username must be 3+ characters with no spaces.'})
        if User.objects.filter(username__iexact=username).exists():
            raise ValidationError({'username': 'This username is already taken.'})
        if len(password) < 6:
            raise ValidationError({'password': 'Password must be at least 6 characters.'})
        if role not in ('sales', 'admin'):
            raise ValidationError({'role': 'Choose Sales person or Admin.'})
        u = User.objects.create_user(username=username, password=password, first_name=name)
        Profile.objects.create(user=u, role=role)
        return Response(self._row(u), status=201)

    def partial_update(self, request, pk=None):
        self._admin(request)
        u = User.objects.get(pk=pk)
        if u.id == request.user.id:
            raise ValidationError({'detail': 'You cannot deactivate your own account.'})
        u.is_active = bool(request.data.get('is_active'))
        u.save()
        return Response(self._row(u))


# ---------- dashboard ----------
@api_view(['GET'])
def dashboard(request):
    u = request.user
    cs = scope(Customer.objects.all(), u, '')
    os_ = scope(Order.objects.all(), u, 'customer__')
    rs = scope(ReturnRequest.objects.all(), u, 'order__customer__').filter(status__in=['requested', 'approved'])
    ks = scope(SupportCase.objects.all(), u, 'customer__').exclude(status='resolved')
    money = lambda q, f: float(q.aggregate(s=Sum(f))['s'] or 0)
    return Response({
        'role': role_of(u),
        'customers': cs.count(), 'at_risk': cs.filter(segment='at_risk').count(),
        'orders': os_.count(), 'in_transit': os_.filter(status__in=['shipped', 'out_for_delivery']).count(),
        'revenue': money(os_.exclude(status='cancelled'), 'total'),
        'open_returns': rs.count(), 'refunds_pending': money(rs, 'refund_amount'),
        'open_cases': ks.count(),
        'by_status': list(os_.values('status').annotate(n=Count('id')).order_by('-n')),
    })


# ---------- auth ----------
def session_payload(user):
    token, _ = Token.objects.get_or_create(user=user)
    return {'token': token.key, 'username': user.username, 'name': user.get_full_name() or user.username, 'role': role_of(user)}


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Each login page sends its own role, so an admin cannot sign in on the sales page and so on."""
    want = request.data.get('role')
    username = str(request.data.get('username', '')).strip()
    if want == 'customer':
        username = username.lower()
    user = authenticate(username=username, password=request.data.get('password', ''))
    if not user or not user.is_active:
        return Response({'detail': 'Username or password is incorrect.'}, status=400)
    if want and role_of(user) != want:
        names = {'admin': 'an Admin', 'sales': 'a Sales person', 'customer': 'a Customer'}
        return Response({'detail': f'This is not {names.get(want, want)} account. Please use the correct login page.'}, status=400)
    return Response(session_payload(user))


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Customers create their own account. Staff accounts are created by an admin."""
    name = str(request.data.get('name', '')).strip()
    email = str(request.data.get('email', '')).strip().lower()
    password = request.data.get('password', '')
    if not name:
        raise ValidationError({'name': 'Enter your full name.'})
    try:
        validate_email(email)
    except DjangoValidationError:
        raise ValidationError({'email': 'Enter a valid email address.'})
    if len(password) < 6:
        raise ValidationError({'password': 'Password must be at least 6 characters.'})
    existing = Customer.objects.filter(email=email).first()
    if User.objects.filter(username=email).exists() or (existing and existing.user_id):
        raise ValidationError({'email': 'An account with this email already exists.'})
    user = User.objects.create_user(username=email, email=email, password=password, first_name=name)
    Profile.objects.create(user=user, role='customer')
    if existing:  # a sales person or admin already added this customer: link the new login to it
        existing.user = user
        existing.save()
    else:
        Customer.objects.create(user=user, name=name, email=email, assigned_to=pick_rep())
    return Response(session_payload(user), status=201)


@api_view(['POST'])
def logout(request):
    request.auth.delete()
    return Response(status=204)

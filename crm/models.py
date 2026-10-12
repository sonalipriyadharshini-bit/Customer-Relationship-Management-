from django.conf import settings
from django.db import models


class Profile(models.Model):
    """Gives every login a role: admin, sales or customer."""
    ROLES = [('admin', 'Admin'), ('sales', 'Sales person'), ('customer', 'Customer')]
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=10, choices=ROLES, default='customer')

    def __str__(self):
        return f'{self.user.username} ({self.role})'


class Customer(models.Model):
    SEGMENTS = [('new', 'New'), ('standard', 'Standard'), ('prime', 'Prime'), ('at_risk', 'At risk')]
    user = models.OneToOneField(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='customer')
    name = models.CharField(max_length=120)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    segment = models.CharField(max_length=10, choices=SEGMENTS, default='new')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='assigned_customers')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Order(models.Model):
    STATUS = [('placed', 'Placed'), ('shipped', 'Shipped'), ('out_for_delivery', 'Out for delivery'),
              ('delivered', 'Delivered'), ('cancelled', 'Cancelled')]
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='orders')
    product = models.ForeignKey(Product, null=True, blank=True, on_delete=models.SET_NULL)
    item = models.CharField(max_length=200)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS, default='placed')
    placed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-placed_at', '-id']


class ReturnRequest(models.Model):
    STATUS = [('requested', 'Requested'), ('approved', 'Approved'), ('refunded', 'Refunded'), ('rejected', 'Rejected')]
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='returns')
    reason = models.CharField(max_length=200)
    status = models.CharField(max_length=10, choices=STATUS, default='requested')
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']


class SupportCase(models.Model):
    PRIORITY = [('low', 'Low'), ('medium', 'Medium'), ('high', 'High')]
    STATUS = [('open', 'Open'), ('in_progress', 'In progress'), ('resolved', 'Resolved')]
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='cases')
    subject = models.CharField(max_length=200)
    details = models.TextField(blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY, default='medium')
    status = models.CharField(max_length=12, choices=STATUS, default='open')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']

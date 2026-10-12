import re
from django.db.models import Sum
from rest_framework import serializers
from .models import Customer, Order, Product, ReturnRequest, SupportCase


class CustomerSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()
    lifetime_value = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = ['id', 'name', 'email', 'phone', 'segment', 'lifetime_value', 'assigned_to', 'assigned_to_name', 'created_at']

    def get_assigned_to_name(self, obj):
        u = obj.assigned_to
        return (u.get_full_name() or u.username) if u else ''

    def get_lifetime_value(self, obj):
        return float(obj.orders.exclude(status='cancelled').aggregate(s=Sum('total'))['s'] or 0)

    def validate_phone(self, v):
        if v and not re.fullmatch(r'\+?[\d\s-]{7,15}', v):
            raise serializers.ValidationError('Enter a valid phone number.')
        return v

    def validate_assigned_to(self, u):
        if u and getattr(getattr(u, 'profile', None), 'role', None) != 'sales':
            raise serializers.ValidationError('Choose a sales person.')
        return u


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'name', 'price', 'active']

    def validate_price(self, v):
        if v <= 0:
            raise serializers.ValidationError('Price must be greater than zero.')
        return v


class OrderSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'customer', 'customer_name', 'product', 'item', 'total', 'status', 'placed_at']
        read_only_fields = ['item', 'total', 'status']
        extra_kwargs = {'customer': {'required': False}, 'product': {'required': True, 'allow_null': False}}


class ReturnSerializer(serializers.ModelSerializer):
    item = serializers.CharField(source='order.item', read_only=True)
    customer_name = serializers.CharField(source='order.customer.name', read_only=True)

    class Meta:
        model = ReturnRequest
        fields = ['id', 'order', 'item', 'customer_name', 'reason', 'status', 'refund_amount', 'created_at']
        read_only_fields = ['status', 'refund_amount']


class CaseSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)

    class Meta:
        model = SupportCase
        fields = ['id', 'customer', 'customer_name', 'subject', 'details', 'priority', 'status', 'created_at']
        extra_kwargs = {'customer': {'required': False}}

    def validate_subject(self, v):
        if len(v.strip()) < 3:
            raise serializers.ValidationError('Subject must be at least 3 characters.')
        return v.strip()

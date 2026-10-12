from django.contrib import admin
from .models import Customer, Order, Product, Profile, ReturnRequest, SupportCase

for m in (Profile, Customer, Product, Order, ReturnRequest, SupportCase):
    admin.site.register(m)

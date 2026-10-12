from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register('customers', views.CustomerViewSet, basename='customer')
router.register('products', views.ProductViewSet, basename='product')
router.register('orders', views.OrderViewSet, basename='order')
router.register('returns', views.ReturnViewSet, basename='return')
router.register('cases', views.CaseViewSet, basename='case')
router.register('users', views.UserViewSet, basename='user')

urlpatterns = [
    path('auth/login/', views.login),
    path('auth/register/', views.register),
    path('auth/logout/', views.logout),
    path('dashboard/', views.dashboard),
    path('', include(router.urls)),
]

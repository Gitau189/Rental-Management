from django.urls import path

from . import views

urlpatterns = [
    path('apartments/', views.apartment_list, name='apartment-list'),
    path('apartments/<int:pk>/', views.apartment_detail, name='apartment-detail'),
    path('units/', views.unit_list, name='unit-list'),
    path('units/<int:pk>/', views.unit_detail, name='unit-detail'),
    path('units/<int:pk>/audit/', views.unit_audit, name='unit-audit'),
    path('tenants/', views.tenant_list, name='tenant-list'),
    path('tenants/<int:pk>/', views.tenant_detail, name='tenant-detail'),
]

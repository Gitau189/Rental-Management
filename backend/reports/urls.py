from django.urls import path

from . import views

urlpatterns = [
    path('dashboard/', views.dashboard, name='landlord-dashboard'),
    path('payments/', views.payment_report, name='payment-report'),
    path('outstanding/', views.outstanding_report, name='outstanding-report'),
    path('tenant/dashboard/', views.tenant_dashboard, name='tenant-dashboard'),
]

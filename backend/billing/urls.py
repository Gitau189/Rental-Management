from django.urls import path

from . import views

urlpatterns = [
    # Landlord invoice endpoints
    path('invoices/', views.invoice_list, name='invoice-list'),
    path('invoices/<int:pk>/', views.invoice_detail, name='invoice-detail'),
    path('invoices/<int:pk>/pdf/', views.invoice_pdf, name='invoice-pdf'),

    # Landlord payment endpoints
    path('payments/', views.payment_list, name='payment-list'),
    path('payments/<int:pk>/', views.payment_detail, name='payment-detail'),
    path('payments/<int:pk>/receipt/', views.payment_receipt, name='payment-receipt'),

    # Tenant portal
    path('tenant/invoices/', views.tenant_invoices, name='tenant-invoices'),
    path('tenant/invoices/<int:pk>/', views.tenant_invoice_detail, name='tenant-invoice-detail'),
    path('tenant/invoices/<int:pk>/pdf/', views.invoice_pdf, name='tenant-invoice-pdf'),
    path('tenant/payments/', views.tenant_payments, name='tenant-payments'),
]

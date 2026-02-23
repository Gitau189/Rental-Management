from django.contrib import admin

from .models import Invoice, InvoiceLineItem, Payment


class InvoiceLineItemInline(admin.TabularInline):
    model = InvoiceLineItem
    extra = 1
    fields = ('description', 'amount', 'order')


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    readonly_fields = ('created_at',)
    fields = ('amount', 'payment_date', 'method', 'reference_number', 'recorded_by', 'created_at')


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'tenant', 'total_amount', 'amount_paid', 'status', 'due_date')
    list_filter = ('status', 'year', 'month')
    search_fields = ('unit__unit_number', 'tenant__first_name', 'tenant__last_name')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [InvoiceLineItemInline, PaymentInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('invoice', 'amount', 'payment_date', 'method', 'reference_number')
    list_filter = ('method', 'payment_date')
    search_fields = ('invoice__tenant__first_name', 'reference_number')
    readonly_fields = ('created_at',)

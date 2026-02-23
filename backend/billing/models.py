from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone


class Invoice(models.Model):
    UNPAID = 'unpaid'
    PARTIAL = 'partial'
    PAID = 'paid'
    OVERDUE = 'overdue'
    STATUS_CHOICES = [
        (UNPAID, 'Unpaid'),
        (PARTIAL, 'Partially Paid'),
        (PAID, 'Paid'),
        (OVERDUE, 'Overdue'),
    ]

    unit = models.ForeignKey('properties.Unit', on_delete=models.PROTECT, related_name='invoices')
    tenant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='invoices',
        limit_choices_to={'role': 'tenant'},
    )
    landlord = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='created_invoices',
        limit_choices_to={'role': 'landlord'},
    )
    month = models.IntegerField()   # 1–12
    year = models.IntegerField()
    invoice_date = models.DateField()
    due_date = models.DateField()
    base_rent = models.DecimalField(max_digits=12, decimal_places=2)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=UNPAID)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-year', '-month', '-created_at']
        unique_together = ['unit', 'month', 'year']

    def __str__(self):
        from calendar import month_name
        return f'{self.unit} – {month_name[self.month]} {self.year}'

    @property
    def remaining_balance(self):
        balance = self.total_amount - self.amount_paid
        return max(balance, Decimal('0.00'))

    @property
    def overpayment(self):
        excess = self.amount_paid - self.total_amount
        return max(excess, Decimal('0.00'))

    def refresh_status(self):
        today = timezone.now().date()
        if self.amount_paid >= self.total_amount:
            self.status = self.PAID
        elif self.amount_paid > 0:
            if self.due_date < today:
                self.status = self.OVERDUE
            else:
                self.status = self.PARTIAL
        elif self.due_date < today:
            self.status = self.OVERDUE
        else:
            self.status = self.UNPAID
        self.save(update_fields=['status', 'updated_at'])


class InvoiceLineItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='line_items')
    description = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f'{self.description}: {self.amount}'


class Payment(models.Model):
    CASH = 'cash'
    BANK_TRANSFER = 'bank_transfer'
    MPESA = 'mpesa'
    CHEQUE = 'cheque'
    OTHER = 'other'
    METHOD_CHOICES = [
        (CASH, 'Cash'),
        (BANK_TRANSFER, 'Bank Transfer'),
        (MPESA, 'M-Pesa'),
        (CHEQUE, 'Cheque'),
        (OTHER, 'Other'),
    ]

    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default=CASH)
    reference_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='recorded_payments',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        return f'Payment of {self.amount} for {self.invoice} on {self.payment_date}'

    @property
    def balance_after(self):
        """Running balance on the invoice after this payment."""
        payments_before = self.invoice.payments.filter(
            created_at__lt=self.created_at
        ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
        paid_so_far = payments_before + self.amount
        balance = self.invoice.total_amount - paid_so_far
        return max(balance, Decimal('0.00'))

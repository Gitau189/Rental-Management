from decimal import Decimal

from rest_framework import serializers

from properties.models import TenantProfile, Unit
from users.serializers import UserSerializer

from .models import Invoice, InvoiceLineItem, Payment


class InvoiceLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceLineItem
        fields = ('id', 'description', 'amount', 'order')


class InvoiceListSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.get_full_name', read_only=True)
    unit_display = serializers.CharField(source='unit.__str__', read_only=True)
    apartment_name = serializers.CharField(source='unit.apartment.name', read_only=True)
    remaining_balance = serializers.ReadOnlyField()
    month_name = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = (
            'id', 'unit', 'unit_display', 'apartment_name',
            'tenant', 'tenant_name',
            'month', 'year', 'month_name',
            'invoice_date', 'due_date',
            'base_rent', 'total_amount', 'amount_paid', 'remaining_balance',
            'status', 'created_at',
        )

    def get_month_name(self, obj):
        from calendar import month_name
        return month_name[obj.month]


class InvoiceDetailSerializer(serializers.ModelSerializer):
    tenant = UserSerializer(read_only=True)
    line_items = InvoiceLineItemSerializer(many=True, read_only=True)
    remaining_balance = serializers.ReadOnlyField()
    overpayment = serializers.ReadOnlyField()
    unit_display = serializers.CharField(source='unit.__str__', read_only=True)
    apartment_name = serializers.CharField(source='unit.apartment.name', read_only=True)
    apartment_address = serializers.CharField(source='unit.apartment.address', read_only=True)
    apartment_city = serializers.CharField(source='unit.apartment.city', read_only=True)
    month_name = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = (
            'id', 'unit', 'unit_display', 'apartment_name', 'apartment_address', 'apartment_city',
            'tenant', 'month', 'year', 'month_name',
            'invoice_date', 'due_date',
            'base_rent', 'line_items',
            'total_amount', 'amount_paid', 'remaining_balance', 'overpayment',
            'status', 'notes', 'created_at', 'updated_at',
        )

    def get_month_name(self, obj):
        from calendar import month_name
        return month_name[obj.month]


class InvoiceCreateSerializer(serializers.ModelSerializer):
    line_items = InvoiceLineItemSerializer(many=True, required=False)

    class Meta:
        model = Invoice
        fields = (
            'unit', 'tenant', 'month', 'year',
            'invoice_date', 'due_date',
            'base_rent', 'line_items', 'notes',
        )

    def validate(self, data):
        unit = data.get('unit')
        month = data.get('month')
        year = data.get('year')

        if Invoice.objects.filter(unit=unit, month=month, year=year).exists():
            raise serializers.ValidationError(
                f'An invoice for this unit already exists for {month}/{year}.'
            )

        tenant = data.get('tenant')
        # Ensure tenant belongs to the landlord making the request
        landlord = self.context['request'].user
        if not TenantProfile.objects.filter(user=tenant, landlord=landlord).exists():
            raise serializers.ValidationError({'tenant': 'Tenant not found.'})

        return data

    def create(self, validated_data):
        line_items_data = validated_data.pop('line_items', [])
        landlord = self.context['request'].user

        # Calculate total
        base_rent = validated_data['base_rent']
        extras = sum(Decimal(str(item['amount'])) for item in line_items_data)
        total = base_rent + extras

        invoice = Invoice.objects.create(
            landlord=landlord,
            total_amount=total,
            **validated_data,
        )

        for i, item in enumerate(line_items_data):
            # Ensure we don't pass 'order' twice: prefer explicit index 'i',
            # but allow client to provide an order override via item['order'].
            item_order = item.pop('order', i)
            InvoiceLineItem.objects.create(invoice=invoice, order=item_order, **item)

        return invoice


class PaymentSerializer(serializers.ModelSerializer):
    invoice_display = serializers.CharField(source='invoice.__str__', read_only=True)
    tenant_name = serializers.CharField(source='invoice.tenant.get_full_name', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    balance_after = serializers.ReadOnlyField()

    class Meta:
        model = Payment
        fields = (
            'id', 'invoice', 'invoice_display', 'tenant_name',
            'amount', 'payment_date', 'method', 'reference_number',
            'notes', 'recorded_by', 'recorded_by_name',
            'balance_after', 'created_at',
        )
        read_only_fields = ('id', 'recorded_by', 'created_at')


class PaymentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ('invoice', 'amount', 'payment_date', 'method', 'reference_number', 'notes')

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Payment amount must be positive.')
        return value

    def validate(self, data):
        invoice = data.get('invoice')
        landlord = self.context['request'].user
        if invoice.landlord != landlord:
            raise serializers.ValidationError({'invoice': 'Invoice not found.'})
        return data

    def create(self, validated_data):
        invoice = validated_data['invoice']
        amount = validated_data['amount']

        payment = Payment.objects.create(
            recorded_by=self.context['request'].user,
            **validated_data,
        )

        # Update invoice
        invoice.amount_paid += amount
        invoice.save(update_fields=['amount_paid', 'updated_at'])
        invoice.refresh_status()

        return payment

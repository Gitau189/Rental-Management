from calendar import month_name

from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Invoice, Payment
from .pdf_utils import generate_invoice_pdf, generate_receipt_pdf
from .serializers import (
    InvoiceCreateSerializer,
    InvoiceDetailSerializer,
    InvoiceListSerializer,
    PaymentCreateSerializer,
    PaymentSerializer,
)


def landlord_required(func):
    def wrapper(request, *args, **kwargs):
        if not request.user.is_landlord:
            return Response({'detail': 'Landlord access only.'}, status=status.HTTP_403_FORBIDDEN)
        return func(request, *args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper


# ── Invoices ──────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@landlord_required
def invoice_list(request):
    if request.method == 'GET':
        qs = Invoice.objects.filter(landlord=request.user).select_related(
            'unit', 'unit__apartment', 'tenant'
        )
        # Filters
        apartment_id = request.query_params.get('apartment')
        unit_id = request.query_params.get('unit')
        tenant_id = request.query_params.get('tenant')
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        inv_status = request.query_params.get('status')

        if apartment_id:
            qs = qs.filter(unit__apartment_id=apartment_id)
        if unit_id:
            qs = qs.filter(unit_id=unit_id)
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        if month:
            qs = qs.filter(month=month)
        if year:
            qs = qs.filter(year=year)
        if inv_status:
            qs = qs.filter(status=inv_status)

        # Refresh overdue status for any unpaid/partial past-due invoices
        from django.utils import timezone
        today = timezone.now().date()
        qs.filter(status__in=['unpaid', 'partial'], due_date__lt=today).update(status='overdue')

        serializer = InvoiceListSerializer(qs, many=True)
        return Response(serializer.data)

    serializer = InvoiceCreateSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        invoice = serializer.save()
        return Response(InvoiceDetailSerializer(invoice).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
@landlord_required
def invoice_detail(request, pk):
    try:
        invoice = Invoice.objects.get(pk=pk, landlord=request.user)
    except Invoice.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(InvoiceDetailSerializer(invoice).data)

    if request.method in ('PUT', 'PATCH'):
        # Only allow editing notes and due_date on existing invoices that have no payments
        if invoice.payments.exists():
            return Response(
                {'detail': 'Cannot edit an invoice that already has payments.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        partial = request.method == 'PATCH'
        serializer = InvoiceCreateSerializer(invoice, data=request.data,
                                             context={'request': request}, partial=partial)
        if serializer.is_valid():
            invoice = serializer.save()
            return Response(InvoiceDetailSerializer(invoice).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if invoice.payments.exists():
        return Response(
            {'detail': 'Cannot delete an invoice that already has payments.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    invoice.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def invoice_pdf(request, pk):
    """Landlord or the invoice's tenant can download the PDF."""
    try:
        if request.user.is_landlord:
            invoice = Invoice.objects.get(pk=pk, landlord=request.user)
        else:
            invoice = Invoice.objects.get(pk=pk, tenant=request.user)
    except Invoice.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    pdf_bytes = generate_invoice_pdf(invoice)
    filename = f'invoice-{invoice.id}-{month_name[invoice.month]}-{invoice.year}.pdf'
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


# ── Payments ──────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@landlord_required
def payment_list(request):
    if request.method == 'GET':
        qs = Payment.objects.filter(invoice__landlord=request.user).select_related(
            'invoice', 'invoice__tenant', 'invoice__unit', 'invoice__unit__apartment'
        )
        tenant_id = request.query_params.get('tenant')
        invoice_id = request.query_params.get('invoice')
        method = request.query_params.get('method')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if tenant_id:
            qs = qs.filter(invoice__tenant_id=tenant_id)
        if invoice_id:
            qs = qs.filter(invoice_id=invoice_id)
        if method:
            qs = qs.filter(method=method)
        if date_from:
            qs = qs.filter(payment_date__gte=date_from)
        if date_to:
            qs = qs.filter(payment_date__lte=date_to)

        serializer = PaymentSerializer(qs, many=True)
        return Response(serializer.data)

    serializer = PaymentCreateSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        payment = serializer.save()
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@landlord_required
def payment_detail(request, pk):
    try:
        payment = Payment.objects.get(pk=pk, invoice__landlord=request.user)
    except Payment.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    return Response(PaymentSerializer(payment).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@landlord_required
def payment_receipt(request, pk):
    try:
        payment = Payment.objects.get(pk=pk, invoice__landlord=request.user)
    except Payment.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    pdf_bytes = generate_receipt_pdf(payment)
    filename = f'receipt-{payment.id}.pdf'
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


# ── Tenant portal endpoints ───────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tenant_invoices(request):
    if not request.user.is_tenant:
        return Response({'detail': 'Tenant access only.'}, status=status.HTTP_403_FORBIDDEN)

    from django.utils import timezone
    today = timezone.now().date()
    qs = Invoice.objects.filter(tenant=request.user).select_related('unit', 'unit__apartment')
    # Refresh overdue
    qs.filter(status__in=['unpaid', 'partial'], due_date__lt=today).update(status='overdue')

    serializer = InvoiceListSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tenant_invoice_detail(request, pk):
    if not request.user.is_tenant:
        return Response({'detail': 'Tenant access only.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        invoice = Invoice.objects.get(pk=pk, tenant=request.user)
    except Invoice.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    return Response(InvoiceDetailSerializer(invoice).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tenant_payments(request):
    if not request.user.is_tenant:
        return Response({'detail': 'Tenant access only.'}, status=status.HTTP_403_FORBIDDEN)

    qs = Payment.objects.filter(invoice__tenant=request.user).select_related(
        'invoice', 'invoice__unit', 'invoice__unit__apartment'
    )
    serializer = PaymentSerializer(qs, many=True)
    return Response(serializer.data)

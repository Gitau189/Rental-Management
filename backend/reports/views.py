from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from billing.models import Invoice, Payment
from properties.models import Apartment, TenantProfile, Unit


def landlord_required(func):
    def wrapper(request, *args, **kwargs):
        from rest_framework import status
        if not request.user.is_landlord:
            return Response({'detail': 'Landlord access only.'}, status=status.HTTP_403_FORBIDDEN)
        return func(request, *args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@landlord_required
def dashboard(request):
    today = timezone.now().date()
    current_month = today.month
    current_year = today.year

    # Unit stats
    units = Unit.objects.filter(apartment__landlord=request.user, is_active=True)
    total_units = units.count()
    occupied = units.filter(status='occupied').count()
    vacant = units.filter(status='vacant').count()

    # Revenue this month
    monthly_payments = Payment.objects.filter(
        invoice__landlord=request.user,
        payment_date__year=current_year,
        payment_date__month=current_month,
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    # Total outstanding balance
    outstanding_invoices = Invoice.objects.filter(
        landlord=request.user,
    ).exclude(status='paid')
    total_outstanding = sum(inv.remaining_balance for inv in outstanding_invoices)

    # Current-month invoice payment status breakdown
    current_invoices = Invoice.objects.filter(
        landlord=request.user,
        month=current_month,
        year=current_year,
    ).select_related('tenant', 'unit', 'unit__apartment')

    # Refresh overdue
    current_invoices.filter(
        status__in=['unpaid', 'partial'], due_date__lt=today
    ).update(status='overdue')

    paid_tenants = []
    partial_tenants = []
    unpaid_tenants = []

    for inv in current_invoices:
        entry = {
            'invoice_id': inv.id,
            'tenant_name': inv.tenant.get_full_name(),
            'unit': str(inv.unit),
            'total_amount': str(inv.total_amount),
            'amount_paid': str(inv.amount_paid),
            'remaining_balance': str(inv.remaining_balance),
            'status': inv.status,
        }
        if inv.status == 'paid':
            paid_tenants.append(entry)
        elif inv.status in ('partial', 'overdue'):
            partial_tenants.append(entry)
        else:
            unpaid_tenants.append(entry)

    # Recent payments (last 10)
    recent_payments = Payment.objects.filter(
        invoice__landlord=request.user
    ).select_related('invoice', 'invoice__tenant', 'invoice__unit').order_by('-created_at')[:10]

    recent_payments_data = [
        {
            'id': p.id,
            'tenant_name': p.invoice.tenant.get_full_name(),
            'unit': str(p.invoice.unit),
            'amount': str(p.amount),
            'payment_date': str(p.payment_date),
            'method': p.get_method_display(),
        }
        for p in recent_payments
    ]

    return Response({
        'units': {
            'total': total_units,
            'occupied': occupied,
            'vacant': vacant,
        },
        'revenue_this_month': str(monthly_payments),
        'total_outstanding': str(total_outstanding),
        'current_month': {
            'month': current_month,
            'year': current_year,
            'paid': paid_tenants,
            'partial': partial_tenants,
            'unpaid': unpaid_tenants,
        },
        'recent_payments': recent_payments_data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@landlord_required
def payment_report(request):
    qs = Payment.objects.filter(
        invoice__landlord=request.user
    ).select_related('invoice', 'invoice__tenant', 'invoice__unit', 'invoice__unit__apartment')

    # Filters
    apartment_id = request.query_params.get('apartment')
    unit_id = request.query_params.get('unit')
    tenant_id = request.query_params.get('tenant')
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    method = request.query_params.get('method')

    if apartment_id:
        qs = qs.filter(invoice__unit__apartment_id=apartment_id)
    if unit_id:
        qs = qs.filter(invoice__unit_id=unit_id)
    if tenant_id:
        qs = qs.filter(invoice__tenant_id=tenant_id)
    if date_from:
        qs = qs.filter(payment_date__gte=date_from)
    if date_to:
        qs = qs.filter(payment_date__lte=date_to)
    if method:
        qs = qs.filter(method=method)

    total = qs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    data = [
        {
            'id': p.id,
            'date': str(p.payment_date),
            'tenant': p.invoice.tenant.get_full_name(),
            'unit': str(p.invoice.unit),
            'apartment': p.invoice.unit.apartment.name,
            'amount': str(p.amount),
            'method': p.get_method_display(),
            'reference': p.reference_number,
            'invoice_id': p.invoice.id,
        }
        for p in qs.order_by('-payment_date')
    ]

    return Response({'payments': data, 'total': str(total), 'count': len(data)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@landlord_required
def outstanding_report(request):
    today = timezone.now().date()
    qs = Invoice.objects.filter(
        landlord=request.user,
    ).exclude(status='paid').select_related('tenant', 'unit', 'unit__apartment')

    # Refresh overdue
    qs.filter(status__in=['unpaid', 'partial'], due_date__lt=today).update(status='overdue')

    apartment_id = request.query_params.get('apartment')
    unit_id = request.query_params.get('unit')
    tenant_id = request.query_params.get('tenant')

    if apartment_id:
        qs = qs.filter(unit__apartment_id=apartment_id)
    if unit_id:
        qs = qs.filter(unit_id=unit_id)
    if tenant_id:
        qs = qs.filter(tenant_id=tenant_id)

    data = [
        {
            'invoice_id': inv.id,
            'tenant': inv.tenant.get_full_name(),
            'unit': str(inv.unit),
            'apartment': inv.unit.apartment.name,
            'period': f'{inv.month}/{inv.year}',
            'total_amount': str(inv.total_amount),
            'amount_paid': str(inv.amount_paid),
            'remaining_balance': str(inv.remaining_balance),
            'due_date': str(inv.due_date),
            'status': inv.status,
            'days_overdue': (today - inv.due_date).days if inv.due_date < today else 0,
        }
        for inv in qs.order_by('tenant__first_name', 'year', 'month')
    ]

    grand_total = sum(Decimal(d['remaining_balance']) for d in data)

    return Response({'invoices': data, 'grand_total': str(grand_total), 'count': len(data)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tenant_dashboard(request):
    """Dashboard data for the logged-in tenant."""
    if not request.user.is_tenant:
        from rest_framework import status as drf_status
        return Response({'detail': 'Tenant access only.'}, status=drf_status.HTTP_403_FORBIDDEN)

    today = timezone.now().date()
    invoices = Invoice.objects.filter(tenant=request.user).select_related('unit', 'unit__apartment')
    # Refresh overdue
    invoices.filter(status__in=['unpaid', 'partial'], due_date__lt=today).update(status='overdue')

    total_outstanding = sum(inv.remaining_balance for inv in invoices.exclude(status='paid'))
    recent_invoices = invoices.order_by('-year', '-month')[:5]

    payments = Payment.objects.filter(
        invoice__tenant=request.user
    ).select_related('invoice').order_by('-payment_date')[:10]

    try:
        profile = request.user.tenant_profile
        unit_info = {
            'unit_number': profile.unit.unit_number if profile.unit else None,
            'apartment': profile.unit.apartment.name if profile.unit else None,
            'description': profile.unit.description if profile.unit else None,
        }
    except Exception:
        unit_info = {}

    return Response({
        'total_outstanding': str(total_outstanding),
        'unit': unit_info,
        'recent_invoices': [
            {
                'id': inv.id,
                'period': f'{inv.month}/{inv.year}',
                'total_amount': str(inv.total_amount),
                'amount_paid': str(inv.amount_paid),
                'remaining_balance': str(inv.remaining_balance),
                'status': inv.status,
                'due_date': str(inv.due_date),
            }
            for inv in recent_invoices
        ],
        'recent_payments': [
            {
                'id': p.id,
                'amount': str(p.amount),
                'date': str(p.payment_date),
                'method': p.get_method_display(),
                'invoice_period': f'{p.invoice.month}/{p.invoice.year}',
            }
            for p in payments
        ],
    })

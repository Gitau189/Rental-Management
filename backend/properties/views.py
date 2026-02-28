from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Apartment, TenantProfile, Unit, UnitStatusAudit
from django.db.models.deletion import ProtectedError
from django.db import transaction
from decimal import Decimal
from .serializers import (
    ApartmentSerializer,
    TenantCreateSerializer,
    TenantProfileSerializer,
    TenantUpdateSerializer,
    UnitSerializer,
    UnitStatusAuditSerializer,
)


def landlord_required(func):
    """Simple decorator to enforce landlord role."""
    def wrapper(request, *args, **kwargs):
        if not request.user.is_landlord:
            return Response({'detail': 'Landlord access only.'}, status=status.HTTP_403_FORBIDDEN)
        return func(request, *args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper


# ── Apartments ────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@landlord_required
def apartment_list(request):
    if request.method == 'GET':
        apartments = Apartment.objects.filter(landlord=request.user)
        serializer = ApartmentSerializer(apartments, many=True)
        return Response(serializer.data)

    serializer = ApartmentSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(landlord=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
@landlord_required
def apartment_detail(request, pk):
    try:
        apartment = Apartment.objects.get(pk=pk, landlord=request.user)
    except Apartment.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = ApartmentSerializer(apartment)
        return Response(serializer.data)

    if request.method in ('PUT', 'PATCH'):
        partial = request.method == 'PATCH'
        serializer = ApartmentSerializer(apartment, data=request.data, partial=partial)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    force = request.query_params.get('force', 'false').lower() == 'true'
    preserve_invoices = request.query_params.get('preserve_invoices', 'true').lower() == 'true'
    if force:
        # Force-delete: either remove invoices/payments or move invoices to an archive unit.
        try:
            from billing.models import Invoice, Payment
        except Exception:
            return Response({'detail': 'Billing models not available.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        with transaction.atomic():
            units = list(apartment.units.all())

            if preserve_invoices:
                # Ensure archive apartment/unit exists for this landlord
                archive_apartment, _ = Apartment.objects.get_or_create(
                    landlord=request.user,
                    name='Archived',
                    defaults={'address': 'Archived', 'city': 'Archived'},
                )
                archive_unit, _ = Unit.objects.get_or_create(
                    apartment=archive_apartment,
                    unit_number='ARCHIVE',
                    defaults={
                        'description': 'Archive unit for moved invoices',
                        'base_rent': Decimal('0.00'),
                        'status': Unit.VACANT,
                        'is_active': False,
                    }
                )

                # Move invoices from units to archive_unit
                for unit in units:
                    for inv in unit.invoices.all():
                        inv.unit = archive_unit
                        inv.save(update_fields=['unit'])

                # Now safe to delete units (they no longer have invoices)
                for unit in units:
                    unit.delete()

            else:
                # Remove invoices and payments tied to this apartment's units, then delete units
                for unit in units:
                    for inv in list(unit.invoices.all()):
                        Payment.objects.filter(invoice=inv).delete()
                        inv.delete()
                    unit.delete()

            apartment.delete()
        return Response({'detail': 'Apartment and related units deleted (force). Invoices preserved.' if preserve_invoices else 'Apartment and related invoices/units deleted (force)'}, status=status.HTTP_200_OK)

    # DELETE behaviour: support explicit confirmation via query param or use the /destroy/ POST endpoint.
    confirm = request.query_params.get('confirm') or request.data.get('confirm') if hasattr(request, 'data') else None
    delete_invoices = request.query_params.get('delete_invoices', 'true').lower() == 'true'

    if confirm != 'DELETE_APARTMENT':
        # If there are protected related objects, return a helpful message suggesting confirmation.
        try:
            apartment.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProtectedError as e:
            related = [str(obj) for obj in e.protected_objects] if hasattr(e, 'protected_objects') else []
            message = 'Cannot delete apartment because related objects exist.'
            if related:
                message = f"Cannot delete apartment because related objects exist: {', '.join(related)}. To proceed, call DELETE /api/apartments/{apartment.id}/?confirm=DELETE_APARTMENT&delete_invoices=true."
            return Response({'detail': message}, status=status.HTTP_400_BAD_REQUEST)

    # Confirmed destructive delete: perform inside transaction
    try:
        from billing.models import Invoice, Payment
    except Exception:
        return Response({'detail': 'Billing models not available.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    deleted_counts = {'payments': 0, 'invoices': 0, 'units': 0}
    with transaction.atomic():
        units = list(apartment.units.all())
        for unit in units:
            if delete_invoices:
                invs = list(unit.invoices.all())
                for inv in invs:
                    deleted_counts['payments'] += Payment.objects.filter(invoice=inv).delete()[0]
                    deleted_counts['invoices'] += inv.delete()[0]
            # delete unit
            deleted_counts['units'] += unit.delete()[0]
        apartment.delete()

    return Response({'detail': 'Apartment deleted', 'deleted': deleted_counts}, status=status.HTTP_200_OK)


# (Dedicated destroy endpoint removed; use DELETE /api/apartments/{id}/?confirm=DELETE_APARTMENT)


# ── Units ─────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@landlord_required
def unit_list(request):
    if request.method == 'GET':
        qs = Unit.objects.filter(apartment__landlord=request.user)
        apartment_id = request.query_params.get('apartment')
        if apartment_id:
            qs = qs.filter(apartment_id=apartment_id)
        active_only = request.query_params.get('active_only', 'true').lower() == 'true'
        if active_only:
            qs = qs.filter(is_active=True)
        serializer = UnitSerializer(qs, many=True)
        return Response(serializer.data)

    # Ensure the apartment belongs to this landlord
    apartment_id = request.data.get('apartment')
    try:
        Apartment.objects.get(pk=apartment_id, landlord=request.user)
    except Apartment.DoesNotExist:
        return Response({'apartment': 'Invalid apartment.'}, status=status.HTTP_400_BAD_REQUEST)

    serializer = UnitSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
@landlord_required
def unit_detail(request, pk):
    try:
        unit = Unit.objects.get(pk=pk, apartment__landlord=request.user)
    except Unit.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = UnitSerializer(unit)
        return Response(serializer.data)

    if request.method in ('PUT', 'PATCH'):
        partial = request.method == 'PATCH'
        serializer = UnitSerializer(unit, data=request.data, partial=partial)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Support confirmed permanent delete via ?confirm=DELETE_UNIT
    confirm = request.query_params.get('confirm') or (request.data.get('confirm') if hasattr(request, 'data') else None)
    delete_invoices = request.query_params.get('delete_invoices', 'true').lower() == 'true'

    if confirm == 'DELETE_UNIT':
        try:
            from billing.models import Invoice, Payment
        except Exception:
            return Response({'detail': 'Billing models not available.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        deleted = {'payments': 0, 'invoices': 0}
        with transaction.atomic():
            # Unlink any tenant profiles pointing to this unit
            from .models import TenantProfile as _TP
            _TP.objects.filter(unit=unit).update(unit=None)

            if delete_invoices:
                for inv in list(unit.invoices.all()):
                    deleted['payments'] += Payment.objects.filter(invoice=inv).delete()[0]
                    deleted['invoices'] += inv.delete()[0]
            else:
                # Move invoices to an archive unit for this landlord
                archive_apartment, _ = Apartment.objects.get_or_create(
                    landlord=request.user,
                    name='Archived',
                    defaults={'address': 'Archived', 'city': 'Archived'},
                )
                archive_unit, _ = Unit.objects.get_or_create(
                    apartment=archive_apartment,
                    unit_number='ARCHIVE',
                    defaults={
                        'description': 'Archive unit for moved invoices',
                        'base_rent': Decimal('0.00'),
                        'status': Unit.VACANT,
                        'is_active': False,
                    }
                )
                for inv in list(unit.invoices.all()):
                    inv.unit = archive_unit
                    inv.save(update_fields=['unit'])

            # Finally delete the unit
            unit.delete()

        return Response({'detail': 'Unit permanently deleted', 'deleted': deleted}, status=status.HTTP_200_OK)

    # Default: Soft-delete
    unit.is_active = False
    unit.save(update_fields=['is_active'])
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Tenants ───────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@landlord_required
def tenant_list(request):
    if request.method == 'GET':
        qs = TenantProfile.objects.filter(landlord=request.user).select_related('user', 'unit', 'unit__apartment')
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        serializer = TenantProfileSerializer(qs, many=True)
        return Response(serializer.data)

    serializer = TenantCreateSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        profile = serializer.save()
        return Response(TenantProfileSerializer(profile).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
@landlord_required
def tenant_detail(request, pk):
    try:
        profile = TenantProfile.objects.get(pk=pk, landlord=request.user)
    except TenantProfile.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = TenantProfileSerializer(profile)
        return Response(serializer.data)

    if request.method == 'DELETE':
        # Support confirmed permanent delete via ?confirm=DELETE_TENANT
        confirm = request.query_params.get('confirm') or (request.data.get('confirm') if hasattr(request, 'data') else None)
        delete_invoices = request.query_params.get('delete_invoices', 'true').lower() == 'true'

        if confirm == 'DELETE_TENANT':
            # Permanent delete: remove payments and invoices (optional), then tenant profile and user
            try:
                from billing.models import Invoice, Payment
            except Exception:
                return Response({'detail': 'Billing models not available.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            deleted = {'payments': 0, 'invoices': 0}
            with transaction.atomic():
                tenant_user = profile.user
                # invoices are linked to the tenant user
                for inv in list(tenant_user.invoices.all()):
                    if delete_invoices:
                        deleted['payments'] += Payment.objects.filter(invoice=inv).delete()[0]
                        deleted['invoices'] += inv.delete()[0]
                    else:
                        # preserve invoices by setting tenant to null if model allowed; otherwise abort
                        # Our Invoice.tenant is PROTECT, so cannot set null — abort if preserving requested
                        return Response({'detail': 'Cannot preserve invoices; model enforces tenant FK protection.'}, status=status.HTTP_400_BAD_REQUEST)

                # delete tenant profile and user
                profile.delete()
                tenant_user.delete()

            return Response({'detail': 'Tenant permanently deleted', 'deleted': deleted}, status=status.HTTP_200_OK)

        # Fallback: existing deactivation behavior
        serializer = TenantUpdateSerializer(profile, data={'is_active': False}, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            unit = profile.unit
            audit_id = None
            if unit:
                latest = unit.status_audits.first()
                if latest:
                    audit_id = latest.id

            return Response({'detail': 'Tenant deactivated', 'audit_id': audit_id}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    partial = request.method == 'PATCH'
    serializer = TenantUpdateSerializer(profile, data=request.data, partial=partial, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(TenantProfileSerializer(profile).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@landlord_required
def unit_audit(request, pk):
    try:
        unit = Unit.objects.get(pk=pk, apartment__landlord=request.user)
    except Unit.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    audits = unit.status_audits.all()
    serializer = UnitStatusAuditSerializer(audits, many=True)
    return Response(serializer.data)

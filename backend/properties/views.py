from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Apartment, TenantProfile, Unit, UnitStatusAudit
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

    apartment.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


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

    # Soft-delete
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


@api_view(['GET', 'PUT', 'PATCH'])
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

    partial = request.method == 'PATCH'
    serializer = TenantUpdateSerializer(profile, data=request.data, partial=partial)
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

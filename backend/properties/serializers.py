from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from users.models import User
from users.serializers import UserSerializer

from .models import Apartment, TenantProfile, Unit, UnitStatusAudit


class ApartmentSerializer(serializers.ModelSerializer):
    total_units = serializers.ReadOnlyField()
    occupied_units = serializers.ReadOnlyField()
    vacant_units = serializers.ReadOnlyField()

    class Meta:
        model = Apartment
        fields = (
            'id', 'name', 'address', 'city',
            'total_units', 'occupied_units', 'vacant_units',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class UnitSerializer(serializers.ModelSerializer):
    apartment_name = serializers.CharField(source='apartment.name', read_only=True)
    active_tenant_name = serializers.SerializerMethodField()
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Ensure display reflects actual occupancy: if there's no active tenant,
        # surface the unit as vacant even if the stored `status` is inconsistent.
        try:
            if not instance.active_tenant and data.get('status') != Unit.VACANT:
                data['status'] = Unit.VACANT
        except Exception:
            pass
        # If the unit is vacant, don't expose any active tenant name (defensive)
        try:
            if data.get('status') == Unit.VACANT:
                data['active_tenant_name'] = None
        except Exception:
            pass
        return data

    class Meta:
        model = Unit
        fields = (
            'id', 'apartment', 'apartment_name', 'unit_number', 'description',
            'base_rent', 'status', 'is_active', 'active_tenant_name',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def get_active_tenant_name(self, obj):
        # Defensive: if the unit is marked vacant, treat as no active tenant
        try:
            if obj.status == Unit.VACANT:
                return None
        except Exception:
            pass
        tenant = obj.active_tenant
        if tenant:
            return tenant.user.get_full_name()
        return None


class TenantProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    unit = serializers.SerializerMethodField()
    unit_detail = serializers.SerializerMethodField()
    outstanding_balance = serializers.SerializerMethodField()

    class Meta:
        model = TenantProfile
        fields = (
            'id', 'user', 'unit', 'unit_detail', 'landlord',
            'id_number', 'move_in_date', 'is_active',
            'outstanding_balance', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'landlord', 'created_at', 'updated_at')

    def get_outstanding_balance(self, obj):
        from decimal import Decimal
        from billing.models import Invoice
        invoices = Invoice.objects.filter(tenant=obj.user).exclude(status='paid')
        total = sum(i.remaining_balance for i in invoices)
        return str(total)

    def get_unit_detail(self, obj):
        # Only expose unit details if this tenant is the active occupant
        unit = obj.unit
        try:
            if not unit:
                return None
            # unit.active_tenant returns a TenantProfile or None
            active = unit.active_tenant
            if active and active.pk == obj.pk and obj.is_active:
                return UnitSerializer(unit).data
        except Exception:
            pass
        return None

    def get_unit(self, obj):
        unit = obj.unit
        try:
            if not unit:
                return None
            active = unit.active_tenant
            if active and active.pk == obj.pk and obj.is_active:
                return unit.id
        except Exception:
            pass
        return None


class TenantCreateSerializer(serializers.Serializer):
    # User fields
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField()
    phone = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, validators=[validate_password])

    # TenantProfile fields
    unit = serializers.PrimaryKeyRelatedField(queryset=Unit.objects.filter(is_active=True))
    id_number = serializers.CharField()
    move_in_date = serializers.DateField()

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate_unit(self, unit):
        if unit.status == Unit.OCCUPIED:
            raise serializers.ValidationError('This unit is already occupied.')
        return unit

    def create(self, validated_data):
        landlord = self.context['request'].user
        unit = validated_data['unit']

        # Create user
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone=validated_data.get('phone', ''),
            role=User.TENANT,
            password=validated_data['password'],
        )

        # Create profile
        profile = TenantProfile.objects.create(
            user=user,
            unit=unit,
            landlord=landlord,
            id_number=validated_data['id_number'],
            move_in_date=validated_data['move_in_date'],
        )

        # Mark unit occupied
        # attach actor so signals can record who made the change
        unit._changed_by = landlord
        unit.status = Unit.OCCUPIED
        unit.save(update_fields=['status'])

        return profile


class TenantUpdateSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    phone = serializers.CharField(source='user.phone', required=False, allow_blank=True)
    unit = serializers.PrimaryKeyRelatedField(queryset=Unit.objects.filter(is_active=True), required=False, allow_null=True)

    class Meta:
        model = TenantProfile
        fields = ('first_name', 'last_name', 'phone', 'unit', 'id_number', 'move_in_date', 'is_active')

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        for attr, value in user_data.items():
            setattr(instance.user, attr, value)
        instance.user.save()

        # Handle unit transfer if provided
        unit_in_payload = 'unit' in validated_data
        new_unit = None
        if unit_in_payload:
            new_unit = validated_data.pop('unit')
        # apply other fields (id_number, move_in_date, is_active)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        # If there's a unit change, perform transfer logic
        request = self.context.get('request')
        actor = request.user if request else None

        old_unit = instance.unit
        if new_unit is not None and new_unit != old_unit:
            # Ensure new unit is not occupied by another tenant
            active = getattr(new_unit, 'active_tenant', None)
            if active and active.pk != instance.pk:
                raise serializers.ValidationError({'unit': 'Selected unit is already occupied.'})

            # Vacate old unit if present
            if old_unit:
                old_unit._changed_by = actor
                old_unit.status = Unit.VACANT
                old_unit.save(update_fields=['status'])

            # Assign new unit to tenant and mark occupied
            instance.unit = new_unit
            new_unit._changed_by = actor
            new_unit.status = Unit.OCCUPIED
            new_unit.save(update_fields=['status'])

        instance.save()

        # If the payload explicitly set unit to null, unassign the tenant
        if unit_in_payload and new_unit is None and old_unit:
            try:
                old_unit._changed_by = actor
                old_unit.status = Unit.VACANT
                old_unit.save(update_fields=['status'])
            except Exception:
                pass
            instance.unit = None
            instance.save()

        # If deactivated, free the unit (preserve tenant->unit link for history)
        if not instance.is_active and instance.unit:
            unit = instance.unit
            # record actor for audit
            request = self.context.get('request')
            if request:
                unit._changed_by = request.user
            unit.status = Unit.VACANT
            unit.save(update_fields=['status'])

        return instance


class UnitStatusAuditSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source='changed_by.get_full_name', read_only=True)

    class Meta:
        model = UnitStatusAudit
        fields = ('id', 'unit', 'from_status', 'to_status', 'reason', 'meta', 'changed_by', 'changed_by_name', 'created_at')
        read_only_fields = ('id', 'created_at')

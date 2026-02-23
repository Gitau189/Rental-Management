from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from users.models import User
from users.serializers import UserSerializer

from .models import Apartment, TenantProfile, Unit


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

    class Meta:
        model = Unit
        fields = (
            'id', 'apartment', 'apartment_name', 'unit_number', 'description',
            'base_rent', 'status', 'is_active', 'active_tenant_name',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def get_active_tenant_name(self, obj):
        tenant = obj.active_tenant
        if tenant:
            return tenant.user.get_full_name()
        return None


class TenantProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    unit_detail = UnitSerializer(source='unit', read_only=True)
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
        unit.status = Unit.OCCUPIED
        unit.save(update_fields=['status'])

        return profile


class TenantUpdateSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    phone = serializers.CharField(source='user.phone', required=False, allow_blank=True)

    class Meta:
        model = TenantProfile
        fields = ('first_name', 'last_name', 'phone', 'id_number', 'move_in_date', 'is_active')

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        for attr, value in user_data.items():
            setattr(instance.user, attr, value)
        instance.user.save()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # If deactivated, free the unit
        if not instance.is_active and instance.unit:
            unit = instance.unit
            unit.status = Unit.VACANT
            unit.save(update_fields=['status'])

        return instance

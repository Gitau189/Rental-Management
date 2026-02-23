from django.conf import settings
from django.db import models


class Apartment(models.Model):
    landlord = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='apartments',
        limit_choices_to={'role': 'landlord'},
    )
    name = models.CharField(max_length=200)
    address = models.TextField()
    city = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} – {self.city}'

    @property
    def total_units(self):
        return self.units.filter(is_active=True).count()

    @property
    def occupied_units(self):
        return self.units.filter(is_active=True, status='occupied').count()

    @property
    def vacant_units(self):
        return self.units.filter(is_active=True, status='vacant').count()


class Unit(models.Model):
    OCCUPIED = 'occupied'
    VACANT = 'vacant'
    STATUS_CHOICES = [
        (OCCUPIED, 'Occupied'),
        (VACANT, 'Vacant'),
    ]

    apartment = models.ForeignKey(Apartment, on_delete=models.CASCADE, related_name='units')
    unit_number = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    base_rent = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=VACANT)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['unit_number']
        unique_together = ['apartment', 'unit_number']

    def __str__(self):
        return f'{self.apartment.name} – {self.unit_number}'

    @property
    def active_tenant(self):
        return self.tenant_profiles.filter(is_active=True).first()


class TenantProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tenant_profile',
    )
    unit = models.ForeignKey(
        Unit,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='tenant_profiles',
    )
    landlord = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='managed_tenants',
        limit_choices_to={'role': 'landlord'},
    )
    id_number = models.CharField(max_length=50)
    move_in_date = models.DateField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.get_full_name()} – {self.unit}'

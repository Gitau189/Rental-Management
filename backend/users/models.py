from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    LANDLORD = 'landlord'
    TENANT = 'tenant'
    ROLE_CHOICES = [
        (LANDLORD, 'Landlord'),
        (TENANT, 'Tenant'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=LANDLORD)
    phone = models.CharField(max_length=20, blank=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f'{self.get_full_name() or self.username} ({self.role})'

    @property
    def is_landlord(self):
        return self.role == self.LANDLORD

    @property
    def is_tenant(self):
        return self.role == self.TENANT

from django.contrib import admin

from .models import Apartment, TenantProfile, Unit


class UnitInline(admin.TabularInline):
    model = Unit
    extra = 0
    fields = ('unit_number', 'description', 'base_rent', 'status', 'is_active')


@admin.register(Apartment)
class ApartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'landlord', 'total_units', 'occupied_units')
    list_filter = ('city',)
    search_fields = ('name', 'city', 'landlord__username')
    inlines = [UnitInline]


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ('unit_number', 'apartment', 'base_rent', 'status', 'is_active')
    list_filter = ('status', 'is_active', 'apartment')
    search_fields = ('unit_number', 'apartment__name')

    def save_model(self, request, obj, form, change):
        # record the admin user as the actor for status changes
        try:
            obj._changed_by = request.user
        except Exception:
            pass
        super().save_model(request, obj, form, change)


@admin.register(TenantProfile)
class TenantProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'unit', 'landlord', 'move_in_date', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('user__first_name', 'user__last_name', 'user__email')

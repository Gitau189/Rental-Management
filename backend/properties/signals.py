from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from .models import Unit, TenantProfile, UnitStatusAudit


@receiver(pre_save, sender=Unit)
def unit_pre_save(sender, instance, **kwargs):
    # capture previous status for comparison in post_save
    if instance.pk:
        try:
            prev = Unit.objects.get(pk=instance.pk)
            instance._previous_status = prev.status
        except Unit.DoesNotExist:
            instance._previous_status = None
    else:
        instance._previous_status = None


@receiver(post_save, sender=Unit)
def unit_post_save(sender, instance, created, **kwargs):
    prev_status = getattr(instance, '_previous_status', None)
    new_status = instance.status
    if prev_status != new_status:
        changed_by = getattr(instance, '_changed_by', None)

        # Build a small meta snapshot: active tenant and recent invoices
        meta = {}
        active_tenant = instance.active_tenant
        meta['active_tenant_id'] = active_tenant.user.id if active_tenant else None

        try:
            from billing.models import Invoice
            invoices = Invoice.objects.filter(unit=instance).order_by('-id')[:10]
            invoices_summary = []
            for inv in invoices:
                invoices_summary.append({
                    'id': inv.id,
                    'status': inv.status,
                    'total_amount': str(getattr(inv, 'total_amount', None)),
                    'remaining': str(getattr(inv, 'remaining_balance', None)),
                })
            meta['invoices'] = invoices_summary
        except Exception:
            meta['invoices'] = []

        audit = UnitStatusAudit.objects.create(
            unit=instance,
            changed_by=changed_by if getattr(changed_by, 'pk', None) else None,
            from_status=prev_status,
            to_status=new_status,
            meta=meta,
        )

        # Note: we intentionally do NOT unlink TenantProfile.unit here so
        # historical association between tenant and unit is preserved.

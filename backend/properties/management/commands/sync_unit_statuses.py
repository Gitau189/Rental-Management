from django.core.management.base import BaseCommand
from django.db import transaction

from properties.models import Unit


class Command(BaseCommand):
    help = 'Sync Unit.status to match actual tenant occupancy (occupied/vacant)'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Show changes without saving')

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        changed = 0
        fixed = []

        qs = Unit.objects.select_related('apartment').all()
        for unit in qs:
            try:
                has_active = bool(unit.active_tenant)
            except Exception:
                has_active = False

            desired = Unit.OCCUPIED if has_active else Unit.VACANT
            if unit.status != desired:
                fixed.append((unit.id, unit.apartment.name, unit.unit_number, unit.status, desired))
                if not dry_run:
                    with transaction.atomic():
                        # mark as system change so signals create audit with no actor
                        try:
                            unit._changed_by = None
                            unit.status = desired
                            unit.save(update_fields=['status'])
                        except Exception:
                            self.stderr.write(f'Failed to update unit {unit.id}')
                changed += 1

        if dry_run:
            self.stdout.write('Dry run — proposed changes:')
        else:
            self.stdout.write('Applied changes:')

        for u in fixed:
            self.stdout.write(f'Unit {u[0]} {u[1]} – {u[2]}: {u[3]} -> {u[4]}')

        self.stdout.write(f'Total units inspected: {qs.count()}')
        self.stdout.write(f'Total changed: {changed}')
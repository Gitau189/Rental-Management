import os
import logging

from django.db.models.signals import post_migrate
from django.dispatch import receiver
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)


@receiver(post_migrate)
def create_superuser_from_env(sender, **kwargs):
    """Create a superuser from env vars after migrations run (idempotent).

    Expected env vars:
      - SUPERUSER_EMAIL
      - SUPERUSER_USERNAME (optional; falls back to local-part of email)
      - SUPERUSER_PASSWORD
      - SUPERUSER_ROLE (optional; defaults to 'landlord')
    """
    app_config = kwargs.get('app_config')

    # Only run when the users app has finished migrating to ensure tables exist
    if app_config is None or app_config.name != 'users':
        return

    email = os.environ.get('SUPERUSER_EMAIL')
    password = os.environ.get('SUPERUSER_PASSWORD')
    username = os.environ.get('SUPERUSER_USERNAME')
    role = os.environ.get('SUPERUSER_ROLE', 'landlord')

    if not email or not password:
        logger.debug('SUPERUSER_EMAIL or SUPERUSER_PASSWORD not set; skipping auto-creation')
        return

    User = get_user_model()

    try:
        # Prefer checking by email to avoid duplicates
        if User.objects.filter(email__iexact=email).exists():
            logger.info('Superuser with email %s already exists; skipping creation', email)
            return

        if not username:
            # Fallback: use the part before @ in the email
            username = email.split('@', 1)[0]

        logger.info('Creating superuser %s (%s)', username, email)
        user = User.objects.create_superuser(username=username, email=email, password=password)
        # Set optional role field if present on the model
        if hasattr(user, 'role') and role:
            try:
                user.role = role
                user.save(update_fields=['role'])
            except Exception:
                logger.exception('Failed to set role on auto-created superuser')

    except Exception:
        logger.exception('Failed to create superuser from environment')

from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'users'

    def ready(self):
        # Import signal handlers to ensure they're registered on startup
        try:
            import users.signals  # noqa: F401
        except Exception:
            # Avoid breaking startup if signals fail to import; errors are logged by the signal module itself
            pass

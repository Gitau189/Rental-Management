try:
	# Ensure signal handlers are registered when the app is loaded
	from . import signals  # noqa: F401
except Exception:
	pass

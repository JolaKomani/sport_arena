from apps.core.models import NotificationPreference


class NotificationPreferenceRepository:
    def get_or_create_for_user(self, user, defaults=None):
        return NotificationPreference.objects.get_or_create(
            user=user,
            defaults=defaults or {},
        )


notification_preference_repository = NotificationPreferenceRepository()

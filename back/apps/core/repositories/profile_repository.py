from apps.core.models import UserProfile


class ProfileRepository:
    def get_or_create_for_user(self, user, defaults=None):
        return UserProfile.objects.get_or_create(
            user=user,
            defaults=defaults or {},
        )


profile_repository = ProfileRepository()

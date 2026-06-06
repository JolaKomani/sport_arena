from apps.core.repositories.notification_preference_repository import notification_preference_repository
from apps.core.repositories.profile_repository import profile_repository


def ensure_user_profile(user, actor=None):
    profile, created = profile_repository.get_or_create_for_user(
        user=user,
        defaults={'created_by': actor, 'updated_by': actor},
    )
    notification_preference_repository.get_or_create_for_user(
        user=user,
        defaults={'created_by': actor, 'updated_by': actor},
    )
    return profile

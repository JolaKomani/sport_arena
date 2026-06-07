from apps.core.models import Setting
from apps.core.repositories.setting_repository import setting_repository


def get_setting(key, default=None, user=None):
    if user is not None:
        row = setting_repository.get_user_setting(user, key)
        if row:
            return row.value
    row = setting_repository.get_global_setting(key)
    return row.value if row else default


def set_global_setting(key, value, actor=None):
    row, _ = setting_repository.update_or_create_global(
        key=key,
        defaults={'value': value, 'updated_by': actor},
    )
    if actor and not row.created_by_id:
        row.created_by = actor
        setting_repository.save(row)
    return row

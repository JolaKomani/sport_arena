from apps.core.models import Setting


class SettingRepository:
    def get_user_setting(self, user, key):
        return Setting.objects.filter(
            scope=Setting.SCOPE_USER,
            user=user,
            key=key,
            deleted_at__isnull=True,
        ).first()

    def get_global_setting(self, key):
        return Setting.objects.filter(
            scope=Setting.SCOPE_GLOBAL,
            user__isnull=True,
            key=key,
            deleted_at__isnull=True,
        ).first()

    def update_or_create_global(self, key, defaults):
        return Setting.objects.update_or_create(
            scope=Setting.SCOPE_GLOBAL,
            user=None,
            key=key,
            defaults=defaults,
        )

    def save(self, row):
        row.save()
        return row


setting_repository = SettingRepository()

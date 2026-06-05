from django.core.management.base import BaseCommand

from apps.core.services.profiles import ensure_user_profile
from apps.core.services.rbac import ensure_admin_role, ensure_player_role, seed_roles_and_permissions
from apps.core.services.settings import set_global_setting
from apps.users.models import User


class Command(BaseCommand):
    help = 'Seed roles, permissions, and default settings required by the lab database specification.'

    def handle(self, *args, **options):
        seed_roles_and_permissions()
        set_global_setting('site_name', 'SportZone')
        set_global_setting('notifications_enabled', 'true')

        for user in User.objects.filter(deleted_at__isnull=True):
            ensure_user_profile(user)
            ensure_player_role(user)
            if user.is_superuser:
                ensure_admin_role(user)

        self.stdout.write(self.style.SUCCESS('Lab database metadata seeded successfully.'))

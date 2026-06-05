from django.db.models.signals import post_migrate
from django.dispatch import receiver


@receiver(post_migrate)
def seed_rbac_after_migrate(sender, **kwargs):
    if sender.name != 'apps.core':
        return
    from apps.core.services.rbac import seed_roles_and_permissions
    from apps.core.services.settings import set_global_setting

    seed_roles_and_permissions()
    set_global_setting('site_name', 'SportZone')

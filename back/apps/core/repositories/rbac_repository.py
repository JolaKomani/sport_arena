from apps.core.models import Permission, Role, RolePermission, UserRole


class RbacRepository:
    def get_or_create_permission(self, code, defaults=None):
        return Permission.objects.get_or_create(code=code, defaults=defaults or {})

    def get_or_create_role(self, name, defaults=None):
        return Role.objects.get_or_create(name=name, defaults=defaults or {})

    def get_or_create_role_permission(self, role, permission):
        return RolePermission.objects.get_or_create(role=role, permission=permission)

    def get_role_by_name(self, role_name):
        return Role.objects.filter(name=role_name, deleted_at__isnull=True).first()

    def get_or_create_user_role(self, user, role, defaults=None):
        return UserRole.objects.get_or_create(
            user=user,
            role=role,
            defaults=defaults or {},
        )

    def user_has_role(self, user, role_name):
        return UserRole.objects.filter(
            user=user,
            role__name=role_name,
            role__deleted_at__isnull=True,
            deleted_at__isnull=True,
        ).exists()

    def user_has_permission(self, user, permission_code):
        return RolePermission.objects.filter(
            role__user_roles__user=user,
            role__user_roles__deleted_at__isnull=True,
            role__deleted_at__isnull=True,
            permission__code=permission_code,
            permission__deleted_at__isnull=True,
            deleted_at__isnull=True,
        ).exists()


rbac_repository = RbacRepository()

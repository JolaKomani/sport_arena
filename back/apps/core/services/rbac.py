from apps.core.repositories.rbac_repository import rbac_repository

ROLE_PLAYER = 'player'
ROLE_ADMIN = 'admin'

DEFAULT_PERMISSIONS = [
    ('users.view', 'View users'),
    ('users.update_self', 'Update own profile'),
    ('squads.view', 'View squads'),
    ('squads.create', 'Create squads'),
    ('squads.modify', 'Modify squads'),
    ('matches.view', 'View matches'),
    ('matches.create', 'Create matches'),
    ('matches.modify', 'Modify matches'),
    ('ratings.create', 'Create ratings'),
    ('notifications.view', 'View notifications'),
]

PLAYER_PERMISSIONS = {
    'users.view',
    'users.update_self',
    'squads.view',
    'squads.create',
    'squads.modify',
    'matches.view',
    'matches.create',
    'matches.modify',
    'ratings.create',
    'notifications.view',
}

ADMIN_PERMISSIONS = {code for code, _ in DEFAULT_PERMISSIONS}


def seed_roles_and_permissions():
    permissions = {}
    for code, description in DEFAULT_PERMISSIONS:
        perm, _ = rbac_repository.get_or_create_permission(
            code=code,
            defaults={'description': description},
        )
        permissions[code] = perm

    player_role, _ = rbac_repository.get_or_create_role(
        name=ROLE_PLAYER,
        defaults={'description': 'Standard player account'},
    )
    admin_role, _ = rbac_repository.get_or_create_role(
        name=ROLE_ADMIN,
        defaults={'description': 'Administrator with full access'},
    )

    for code in PLAYER_PERMISSIONS:
        rbac_repository.get_or_create_role_permission(player_role, permissions[code])

    for code in ADMIN_PERMISSIONS:
        rbac_repository.get_or_create_role_permission(admin_role, permissions[code])

    return player_role, admin_role


def assign_role(user, role_name, actor=None):
    role = rbac_repository.get_role_by_name(role_name)
    if not role:
        return None
    user_role, created = rbac_repository.get_or_create_user_role(
        user=user,
        role=role,
        defaults={'created_by': actor, 'updated_by': actor},
    )
    return user_role if created else user_role


def user_has_role(user, role_name):
    return rbac_repository.user_has_role(user, role_name)


def user_has_permission(user, permission_code):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser or user_has_role(user, ROLE_ADMIN):
        return True
    return rbac_repository.user_has_permission(user, permission_code)


def ensure_player_role(user, actor=None):
    return assign_role(user, ROLE_PLAYER, actor=actor)


def ensure_admin_role(user, actor=None):
    return assign_role(user, ROLE_ADMIN, actor=actor)

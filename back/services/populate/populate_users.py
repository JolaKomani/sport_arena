import json
import os

from apps.users.models import User

SUPERUSER_EMAIL = 'komanijola@gmail.com'


def populate_users():

    dir_path = os.path.dirname(os.path.realpath(__file__))
    data_path = os.path.join(dir_path, 'data', 'users.json')

    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    users = []

    for u in data:
        user, created = User.objects.get_or_create(
            email=u["email"],
            defaults={
                "first_name": u["first_name"],
                "last_name": u["last_name"],
                "phone": u["phone"],
            }
        )

        if "password" in u:
            if created or not user.has_usable_password():
                user.set_password(u["password"])
                user.save()

        from apps.core.services.profiles import ensure_user_profile
        from apps.core.services.rbac import ensure_admin_role, ensure_player_role

        ensure_user_profile(user)
        ensure_player_role(user)

        if user.email == SUPERUSER_EMAIL:
            user.is_superuser = True
            user.is_staff = True
            user.is_active = True
            user.save(update_fields=['is_superuser', 'is_staff', 'is_active'])
            ensure_admin_role(user)

        users.append(user)

    print(f"Created {len(users)} users")
    if User.objects.filter(email=SUPERUSER_EMAIL, is_superuser=True).exists():
        print(f"Superuser: {SUPERUSER_EMAIL}")

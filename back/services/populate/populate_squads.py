from apps.squads.models import Squad
from apps.users.models import User

from services.populate.seed_config import (
    ADMIN_EMAILS,
    PRIMARY_ADMIN_EMAIL,
    PRIMARY_ADMIN_SQUAD_COUNT,
    PRIVATE_SQUAD_COUNT,
    PUBLIC_SQUAD_COUNT,
    pick_squad_members,
    private_squad_name,
    public_squad_name,
)


def populate_squads():
    all_users = list(User.objects.filter(is_active=True).order_by('id'))
    if len(all_users) < 4:
        print('Need at least 4 users before populating squads. Run populate_users first.')
        return []

    squads = []

    for index in range(1, PUBLIC_SQUAD_COUNT + 1):
        squads.append(
            _create_squad(
                public_squad_name(index),
                is_public=True,
                squad_index=index - 1,
                squad_number=index,
                all_users=all_users,
            )
        )

    for index in range(1, PRIVATE_SQUAD_COUNT + 1):
        squads.append(
            _create_squad(
                private_squad_name(index),
                is_public=False,
                squad_index=PUBLIC_SQUAD_COUNT + index - 1,
                squad_number=index,
                all_users=all_users,
            )
        )

    print(f'Created/updated {len(squads)} squads ({PUBLIC_SQUAD_COUNT} public, {PRIVATE_SQUAD_COUNT} private):')
    for squad, members in squads:
        admin_emails = [a.email for a in squad.admins.all()]
        print(
            f' - {squad.name} ({ "public" if squad.is_public else "private" }) '
            f'— {len(members)} members, admin: {", ".join(admin_emails)}'
        )

    return squads


def _resolve_admin(is_public, squad_number, all_users, fallback_members):
    if squad_number <= PRIMARY_ADMIN_SQUAD_COUNT:
        admin = User.objects.filter(email=PRIMARY_ADMIN_EMAIL).first()
        if admin:
            return admin

    other_admins = [email for email in ADMIN_EMAILS if email != PRIMARY_ADMIN_EMAIL]
    offset = (squad_number - PRIMARY_ADMIN_SQUAD_COUNT - 1) % len(other_admins)
    admin_email = other_admins[offset]
    return User.objects.filter(email=admin_email).first() or fallback_members[0]


def _create_squad(name, is_public, squad_index, squad_number, all_users):
    squad, _created = Squad.objects.get_or_create(
        name=name,
        defaults={'is_public': is_public},
    )
    squad.is_public = is_public
    squad.save(update_fields=['is_public', 'updated_at'])

    members = pick_squad_members(all_users, squad_index)
    admin = _resolve_admin(is_public, squad_number, all_users, members)

    squad.admins.clear()
    squad.members.clear()
    squad.admins.add(admin)
    squad.members.add(admin)
    for user in members:
        if user.id != admin.id:
            squad.members.add(user)

    return squad, list(squad.members.all())

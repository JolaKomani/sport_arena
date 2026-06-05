from apps.matches.repositories.match_repository import match_repository


def serialize_squad(squad):
    match_count = match_repository.count_for_squad(squad)

    return {
        "id": squad.id,
        "name": squad.name,
        "created_at": squad.created_at.isoformat() if squad.created_at else None,
        "is_public": squad.is_public,
        "players": [{"id": p.id, "name": p.full_name} for p in squad.members.all()],
        "admins": [{"id": a.id, "name": a.full_name} for a in squad.admins.all()],
        "match_count": match_count,
    }


def serialize_squads(squads):
    return [serialize_squad(s) for s in squads]

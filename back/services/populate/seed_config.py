"""Shared constants and helpers for lab database seeding."""

from datetime import datetime, timedelta

from django.utils import timezone as django_tz

PUBLIC_SQUAD_COUNT = 5
PRIVATE_SQUAD_COUNT = 5
MATCHES_PER_SQUAD = 12
RATED_MATCHES_PER_SQUAD = 8
SQUAD_MEMBER_COUNT = 15
PLAYERS_PER_MATCH = 10  # subset of squad roster each match (e.g. 5v5)

MATCH_LOCATIONS = [
    'Prishtina Stadium',
    'Fadil Vokrri Arena',
    'Halla e Sporteve',
    'National Stadium',
    'Training Center',
    'Sports Hall Mitrovica',
    'Gjakova Arena',
    'Peja Indoor Court',
    'Ferizaj Sports Park',
    'Prizren River Field',
    'Podujeva Complex',
    'Vushtrri Ground',
]

PRIMARY_ADMIN_EMAIL = 'komanijola@gmail.com'
PRIMARY_ADMIN_SQUAD_COUNT = 3  # per visibility (public / private)

ADMIN_EMAILS = [
    PRIMARY_ADMIN_EMAIL,
    'komanieni@gmail.com',
    'tafilaela@gmail.com',
]


def public_squad_name(index):
    return f'Public Squad {index}'


def private_squad_name(index):
    return f'Private Squad {index}'


def lab_squad_names():
    names = [public_squad_name(i) for i in range(1, PUBLIC_SQUAD_COUNT + 1)]
    names += [private_squad_name(i) for i in range(1, PRIVATE_SQUAD_COUNT + 1)]
    return names


def pick_squad_members(all_users, squad_index, size=SQUAD_MEMBER_COUNT):
    """Assign up to `size` users per squad (rotated roster when pool is larger)."""
    if not all_users:
        return []
    n = len(all_users)
    size = min(size, n)
    return [all_users[(squad_index * 2 + offset) % n] for offset in range(size)]


def pick_match_players(members, match_index, count=PLAYERS_PER_MATCH):
    """Subset of squad members who actually play this match (others sit out)."""
    if not members:
        return []
    if len(members) <= count:
        return list(members)

    n = len(members)
    start = (match_index * 3) % n
    return [members[(start + offset) % n] for offset in range(count)]


def match_datetime(squad_index, match_index):
    base = datetime(2025, 6, 1, 18, 0, 0)
    naive = base + timedelta(days=squad_index * 5 + match_index * 2, hours=match_index % 3)
    if django_tz.is_aware(naive):
        return naive
    return django_tz.make_aware(naive)


def rating_score(rater_id, rated_id, match_id):
    """Deterministic score between 5 and 10."""
    return 5 + ((int(rater_id) + int(rated_id) + int(match_id)) % 6)

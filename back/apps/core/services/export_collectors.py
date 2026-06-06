"""Build row dicts for CSV/Excel/JSON export."""

from django.db.models import Q

from apps.core.services.advanced_search import (
    apply_match_search,
    apply_squad_search,
    parse_match_search_params,
    parse_squad_search_params,
)
from apps.matches.repositories.match_repository import match_repository
from apps.matches.serializers import serialize_matches
from apps.squads.models import Squad
from apps.squads.repositories import squad_repository
from apps.squads.serializers import serialize_squads


SQUAD_EXPORT_HEADERS = [
    'id',
    'name',
    'section',
    'is_public',
    'created_at',
    'player_count',
    'players',
    'match_count',
]

MATCH_EXPORT_HEADERS = [
    'id',
    'location',
    'datetime',
    'squad_name',
    'team_1',
    'team_2',
    'score_1',
    'score_2',
]

RANKING_EXPORT_HEADERS = [
    'rank',
    'player_id',
    'name',
    'email',
    'average_rating',
    'rating_count',
]


def _squad_row(squad_data, section):
    players = squad_data.get('players') or []
    names = ', '.join(p.get('name', '') for p in players)
    return {
        'id': squad_data.get('id'),
        'name': squad_data.get('name'),
        'section': section,
        'is_public': squad_data.get('is_public'),
        'created_at': squad_data.get('created_at') or '',
        'player_count': len(players),
        'players': names,
        'match_count': squad_data.get('match_count', 0),
    }


def collect_squad_export_rows(request):
    params = parse_squad_search_params(request)
    user = request.user

    rows = []

    if user.is_authenticated:
        my_squads = Squad.objects.filter(Q(admins=user) | Q(members=user)).distinct()
        my_squads = apply_squad_search(my_squads, params)
        for squad in serialize_squads(my_squads):
            rows.append(_squad_row(squad, 'My Squads'))

    if user.is_authenticated:
        public_qs = squad_repository.filter_public_excluding_user(user)
    else:
        public_qs = squad_repository.filter_public()

    public_qs = apply_squad_search(public_qs, params)
    for squad in serialize_squads(public_qs):
        rows.append(_squad_row(squad, 'Public Squads'))

    if user.is_superuser:
        other_qs = apply_squad_search(
            squad_repository.filter_other_for_superuser(user),
            params,
        )
        for squad in serialize_squads(other_qs):
            rows.append(_squad_row(squad, 'Other'))

    return rows


def collect_match_export_rows(request):
    squad_id = request.GET.get('squad_id')
    if not squad_id:
        return None, 'squad_id parameter is required'

    try:
        squad_id = int(squad_id)
    except (ValueError, TypeError):
        return None, 'Invalid squad_id parameter'

    squad = squad_repository.get_by_id(squad_id)
    if not squad:
        return None, 'Squad not found'

    params = parse_match_search_params(request)
    matches = match_repository.list_by_squad_id(squad_id)
    matches = apply_match_search(matches, params)
    match_list = list(matches)
    serialized = serialize_matches(match_list)

    rows = []
    for match in serialized:
        teams = match.get('teams') or []
        t1 = teams[0] if len(teams) > 0 else {}
        t2 = teams[1] if len(teams) > 1 else {}
        rows.append({
            'id': match.get('id'),
            'location': match.get('location'),
            'datetime': match.get('datetime'),
            'squad_name': (match.get('squad') or {}).get('name', squad.name),
            'team_1': t1.get('name', ''),
            'team_2': t2.get('name', ''),
            'score_1': t1.get('score', ''),
            'score_2': t2.get('score', ''),
        })

    return rows, None


def collect_ranking_export_rows():
    from apps.core.services.ratings_stats import compute_all_rankings

    rows = []
    for entry in compute_all_rankings():
        rows.append({
            'rank': entry['rank'],
            'player_id': entry['player_id'],
            'name': entry['name'],
            'email': entry.get('email', ''),
            'average_rating': entry['average_rating'],
            'rating_count': entry['rating_count'],
        })
    return rows

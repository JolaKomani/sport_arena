"""Dynamic report generation: preview JSON with summary, charts, and table rows."""

from collections import defaultdict
from datetime import datetime

from django.db.models import Avg, Count

from apps.matches.repositories.match_repository import match_repository
from apps.ratings.repositories.rating_repository import rating_repository
from apps.squads.repositories import squad_repository
from apps.teams.repositories import team_repository
from apps.users.repositories import user_repository


REPORT_TYPES = ('squad_activity', 'player_performance', 'ratings_leaderboard')

EXPORT_HEADERS = {
    'squad_activity': [
        'match_id', 'datetime', 'location', 'team_1', 'team_2', 'score_1', 'score_2',
    ],
    'player_performance': [
        'match_id', 'datetime', 'location', 'result', 'team_score',
        'avg_rating_by_others', 'self_rating',
    ],
    'ratings_leaderboard': [
        'rank', 'player_id', 'name', 'email', 'average_rating', 'rating_count',
    ],
}


def parse_report_params(request):
    return {
        'report_type': (request.GET.get('report_type') or '').strip().lower(),
        'squad_id': request.GET.get('squad_id', '').strip(),
        'player_id': request.GET.get('player_id', '').strip(),
        'date_from': request.GET.get('date_from', '').strip(),
        'date_to': request.GET.get('date_to', '').strip(),
        'limit': request.GET.get('limit', '20').strip(),
    }


def _parse_date(value, end_of_day=False):
    if not value:
        return None
    try:
        dt = datetime.strptime(value, '%Y-%m-%d')
        if end_of_day:
            return dt.replace(hour=23, minute=59, second=59)
        return dt
    except ValueError:
        return None


def _filter_matches_by_date(queryset, date_from, date_to):
    dt_from = _parse_date(date_from)
    dt_to = _parse_date(date_to, end_of_day=True)
    if dt_from:
        queryset = queryset.filter(datetime__gte=dt_from)
    if dt_to:
        queryset = queryset.filter(datetime__lte=dt_to)
    return queryset.order_by('datetime')


def _month_key(dt):
    return dt.strftime('%Y-%m')


def _month_label(key):
    try:
        dt = datetime.strptime(key + '-01', '%Y-%m-%d')
        return dt.strftime('%b %Y')
    except ValueError:
        return key


def _match_row(match):
    teams = list(match.teams.all())
    t1 = teams[0] if len(teams) > 0 else None
    t2 = teams[1] if len(teams) > 1 else None
    return {
        'match_id': match.id,
        'datetime': match.datetime.strftime('%Y-%m-%dT%H:%M'),
        'location': match.location,
        'team_1': t1.name if t1 else '',
        'team_2': t2.name if t2 else '',
        'score_1': t1.score if t1 and t1.score is not None else '',
        'score_2': t2.score if t2 and t2.score is not None else '',
    }


def _resolve_player(request, player_id_raw):
    if player_id_raw:
        try:
            player = user_repository.get_by_id(int(player_id_raw))
        except (ValueError, TypeError):
            return None, 'Invalid player_id'
        if not player:
            return None, 'Player not found'
        if player.id != request.user.id and not request.user.is_superuser:
            return None, 'You can only run player reports for yourself'
        return player, None
    return request.user, None


def generate_squad_activity_report(params):
    squad_id_raw = params.get('squad_id')
    if not squad_id_raw:
        return None, 'squad_id is required for squad activity reports'

    try:
        squad_id = int(squad_id_raw)
    except (ValueError, TypeError):
        return None, 'Invalid squad_id'

    squad = squad_repository.get_by_id(squad_id)
    if not squad:
        return None, 'Squad not found'

    matches = match_repository.filter_by_squad(squad)
    matches = _filter_matches_by_date(matches, params['date_from'], params['date_to'])
    match_list = list(matches)

    player_count = squad.members.count()
    months = defaultdict(int)
    locations = set()

    rows = []
    for match in match_list:
        rows.append(_match_row(match))
        months[_month_key(match.datetime)] += 1
        locations.add(match.location)

    sorted_months = sorted(months.keys())
    charts = {
        'matches_by_month': {
            'labels': [_month_label(m) for m in sorted_months],
            'values': [months[m] for m in sorted_months],
        },
    }

    title = f'Squad activity — {squad.name}'
    if params['date_from'] or params['date_to']:
        title += f' ({params["date_from"] or "…"} → {params["date_to"] or "…"})'

    return {
        'meta': {
            'report_type': 'squad_activity',
            'title': title,
            'squad_id': squad.id,
            'squad_name': squad.name,
            'date_from': params['date_from'],
            'date_to': params['date_to'],
        },
        'summary': {
            'total_matches': len(match_list),
            'total_players': player_count,
            'unique_locations': len(locations),
        },
        'charts': charts,
        'rows': rows,
        'export_headers': EXPORT_HEADERS['squad_activity'],
    }, None


def _match_result_for_user(match, user):
    user_team = match.teams.filter(members=user).first()
    if not user_team:
        return None, None, None

    user_score = user_team.score
    if user_score is None:
        return None, None, None

    other_teams = match.teams.exclude(id=user_team.id)
    other_scores = [t.score for t in other_teams if t.score is not None]
    if len(other_scores) < other_teams.count():
        return None, None, None

    max_other = max(other_scores) if other_scores else -1
    if user_score > max_other:
        return 'Win', 'won', user_score
    if user_score < max_other:
        return 'Loss', 'lost', user_score
    return 'Draw', 'draw', user_score


def generate_player_performance_report(request, params):
    player, err = _resolve_player(request, params.get('player_id'))
    if err:
        return None, err

    user_teams = team_repository.filter_by_member(player)
    matches = match_repository.filter_by_teams(user_teams)

    if params.get('squad_id'):
        try:
            squad_id = int(params['squad_id'])
        except (ValueError, TypeError):
            return None, 'Invalid squad_id'
        matches = matches.filter(squad_id=squad_id)

    matches = _filter_matches_by_date(matches, params['date_from'], params['date_to'])
    match_list = list(matches)

    wins = losses = draws = 0
    rows = []
    rating_labels = []
    rating_values = []

    for match in match_list:
        result_label, result_key, team_score = _match_result_for_user(match, player)
        avg_rating = rating_repository.avg_for_match_rated_user(
            match, player, exclude_rater=player
        )
        self_rating_obj = rating_repository.get_self_rating_for_match(match, player)

        if result_key == 'won':
            wins += 1
        elif result_key == 'lost':
            losses += 1
        elif result_key == 'draw':
            draws += 1

        if avg_rating is not None:
            rating_labels.append(match.datetime.strftime('%d %b %Y'))
            rating_values.append(round(avg_rating, 2))

        rows.append({
            'match_id': match.id,
            'datetime': match.datetime.strftime('%Y-%m-%dT%H:%M'),
            'location': match.location,
            'result': result_label or 'Pending',
            'team_score': team_score if team_score is not None else '',
            'avg_rating_by_others': round(avg_rating, 2) if avg_rating else '',
            'self_rating': self_rating_obj.score if self_rating_obj else '',
        })

    all_ratings = rating_repository.queryset_for_rated_user(player, exclude_rater=player)
    if params.get('squad_id'):
        try:
            squad = squad_repository.get_by_id(int(params['squad_id']))
            if squad:
                squad_matches = match_repository.filter_by_squad(squad)
                all_ratings = all_ratings.filter(match__in=squad_matches)
        except (ValueError, TypeError):
            pass
    if params['date_from'] or params['date_to']:
        squad_matches_filtered = _filter_matches_by_date(
            match_repository.filter_by_teams(user_teams),
            params['date_from'],
            params['date_to'],
        )
        if params.get('squad_id'):
            squad_matches_filtered = squad_matches_filtered.filter(squad_id=int(params['squad_id']))
        all_ratings = all_ratings.filter(match__in=squad_matches_filtered)

    overall_avg = all_ratings.aggregate(avg=Avg('score'))['avg']

    charts = {
        'rating_trend': {
            'labels': rating_labels,
            'values': rating_values,
        },
        'match_results': {
            'labels': ['Wins', 'Losses', 'Draws'],
            'values': [wins, losses, draws],
        },
    }

    title = f'Player performance — {player.full_name}'
    if params['date_from'] or params['date_to']:
        title += f' ({params["date_from"] or "…"} → {params["date_to"] or "…"})'

    return {
        'meta': {
            'report_type': 'player_performance',
            'title': title,
            'player_id': player.id,
            'player_name': player.full_name,
            'squad_id': params.get('squad_id') or '',
            'date_from': params['date_from'],
            'date_to': params['date_to'],
        },
        'summary': {
            'total_matches': wins + losses + draws,
            'wins': wins,
            'losses': losses,
            'draws': draws,
            'overall_avg_rating': round(overall_avg, 2) if overall_avg else None,
        },
        'charts': charts,
        'rows': rows,
        'export_headers': EXPORT_HEADERS['player_performance'],
    }, None


def generate_ratings_leaderboard_report(params):
    if params.get('squad_id'):
        try:
            squad_id = int(params['squad_id'])
        except (ValueError, TypeError):
            return None, 'Invalid squad_id'
        squad = squad_repository.get_by_id(squad_id)
        if not squad:
            return None, 'Squad not found'
        match_qs = _filter_matches_by_date(
            match_repository.filter_by_squad(squad),
            params['date_from'],
            params['date_to'],
        )
    else:
        from apps.matches.models import Match
        match_qs = _filter_matches_by_date(
            Match.objects.all(),
            params['date_from'],
            params['date_to'],
        )

    try:
        limit = min(max(int(params.get('limit') or 20), 1), 100)
    except (ValueError, TypeError):
        limit = 20

    ranked = []
    for player in user_repository.list_active_not_deleted():
        ratings_qs = rating_repository.queryset_for_rated_user(
            player,
            exclude_rater=player,
            match_qs=match_qs,
        )
        avg_rating = ratings_qs.aggregate(avg=Avg('score'))['avg']
        rating_count = ratings_qs.count()
        if avg_rating is None:
            continue
        ranked.append({
            'player_id': player.id,
            'name': player.full_name,
            'email': player.email,
            'average_rating': round(avg_rating, 2),
            'rating_count': rating_count,
        })

    ranked.sort(key=lambda r: (-r['average_rating'], -r['rating_count']))
    ranked = ranked[:limit]

    rows = []
    for index, row in enumerate(ranked, start=1):
        rows.append({
            'rank': index,
            'player_id': row['player_id'],
            'name': row['name'],
            'email': row['email'],
            'average_rating': row['average_rating'],
            'rating_count': row['rating_count'],
        })

    chart_rows = ranked[:10]
    charts = {
        'top_players': {
            'labels': [r['name'] for r in chart_rows],
            'values': [r['average_rating'] for r in chart_rows],
        },
    }

    squad_name = ''
    if params.get('squad_id'):
        squad = squad_repository.get_by_id(int(params['squad_id']))
        squad_name = squad.name if squad else ''

    title = 'Ratings leaderboard'
    if squad_name:
        title += f' — {squad_name}'
    if params['date_from'] or params['date_to']:
        title += f' ({params["date_from"] or "…"} → {params["date_to"] or "…"})'

    return {
        'meta': {
            'report_type': 'ratings_leaderboard',
            'title': title,
            'squad_id': params.get('squad_id') or '',
            'squad_name': squad_name,
            'date_from': params['date_from'],
            'date_to': params['date_to'],
            'limit': limit,
        },
        'summary': {
            'players_listed': len(rows),
            'avg_of_averages': round(
                sum(r['average_rating'] for r in rows) / len(rows), 2
            ) if rows else None,
        },
        'charts': charts,
        'rows': rows,
        'export_headers': EXPORT_HEADERS['ratings_leaderboard'],
    }, None


def generate_report(request):
    params = parse_report_params(request)
    report_type = params['report_type']

    if report_type not in REPORT_TYPES:
        return None, f'Invalid report_type. Use one of: {", ".join(REPORT_TYPES)}'

    if report_type == 'squad_activity':
        return generate_squad_activity_report(params)
    if report_type == 'player_performance':
        return generate_player_performance_report(request, params)
    if report_type == 'ratings_leaderboard':
        return generate_ratings_leaderboard_report(params)

    return None, 'Unknown report type'

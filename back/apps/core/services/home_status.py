"""Public homepage aggregates: stats, featured match, arenas."""

from datetime import timedelta

from django.utils import timezone

from apps.core.models import Venue
from apps.matches.models import Match
from apps.squads.models import Squad
from apps.users.models import User


def _serialize_featured(match, status):
    teams = list(match.teams.all()[:2])
    t1 = teams[0] if len(teams) > 0 else None
    t2 = teams[1] if len(teams) > 1 else None
    return {
        'id': match.id,
        'status': status,
        'location': match.location,
        'datetime': match.datetime.strftime('%Y-%m-%dT%H:%M'),
        'squad_name': match.squad.name if match.squad_id else '',
        'team_1': {
            'name': (t1.name if t1 else 'Team 1'),
            'score': t1.score if t1 else None,
        },
        'team_2': {
            'name': (t2.name if t2 else 'Team 2'),
            'score': t2.score if t2 else None,
        },
    }


def _featured_match():
    now = timezone.now()
    base_qs = (
        Match.objects.filter(deleted_at__isnull=True)
        .select_related('squad')
        .prefetch_related('teams')
    )

    live_start = now - timedelta(hours=2)
    live_end = now + timedelta(hours=3)
    live = base_qs.filter(datetime__gte=live_start, datetime__lte=live_end).order_by('datetime').first()
    if live:
        return _serialize_featured(live, 'live')

    upcoming = base_qs.filter(datetime__gte=now).order_by('datetime').first()
    if upcoming:
        return _serialize_featured(upcoming, 'upcoming')

    latest = base_qs.order_by('-datetime').first()
    if latest:
        return _serialize_featured(latest, 'latest')

    return None


def _arenas_list():
    venues = list(
        Venue.objects.filter(deleted_at__isnull=True).order_by('name')[:6]
    )
    if venues:
        return {
            'count': Venue.objects.filter(deleted_at__isnull=True).count(),
            'items': [
                {
                    'id': v.id,
                    'name': v.name,
                    'address': v.address or '',
                    'city': v.city or '',
                    'source': 'venue',
                }
                for v in venues
            ],
        }

    locations = list(
        Match.objects.filter(deleted_at__isnull=True)
        .values_list('location', flat=True)
        .distinct()
        .order_by('location')
    )
    return {
        'count': len(locations),
        'items': [
            {
                'id': idx,
                'name': loc,
                'address': loc,
                'city': '',
                'source': 'match_location',
            }
            for idx, loc in enumerate(locations[:6])
        ],
    }


def build_home_payload():
    arenas = _arenas_list()
    return {
        'stats': {
            'players': User.objects.filter(is_active=True, deleted_at__isnull=True).count(),
            'active_squads': Squad.objects.filter(deleted_at__isnull=True).count(),
            'arenas': arenas['count'],
        },
        'featured_match': _featured_match(),
        'arenas': arenas['items'],
    }

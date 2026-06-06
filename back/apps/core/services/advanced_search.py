"""Advanced search: full-text, filters, and sorting for list endpoints."""

from datetime import datetime, timedelta

from django.db.models import Q
from django.db.models.functions import Lower


def _get_param(request, key, default=''):
    value = request.GET.get(key, default)
    if value is None:
        return default
    return str(value).strip()


def _parse_hour(value):
    if value is None or value == '':
        return None
    try:
        hour = int(value)
        if 0 <= hour <= 23:
            return hour
    except (ValueError, TypeError):
        pass
    if ':' in str(value):
        try:
            return int(str(value).split(':')[0])
        except ValueError:
            return None
    return None


def parse_squad_search_params(request):
    return {
        'q': _get_param(request, 'q'),
        'sort': _get_param(request, 'sort', 'name').lower(),
        'order': _get_param(request, 'order', 'asc').lower(),
    }


def parse_match_search_params(request):
    return {
        'q': _get_param(request, 'q'),
        'date_from': _get_param(request, 'date_from'),
        'date_to': _get_param(request, 'date_to'),
        'date_on': _get_param(request, 'date_on'),
        'time_hour': _parse_hour(_get_param(request, 'time_hour')),
        'sort': _get_param(request, 'sort', 'datetime').lower(),
        'order': _get_param(request, 'order', 'desc').lower(),
    }


def squad_search_active(params):
    return bool(params.get('q'))


def match_search_active(params):
    return bool(
        params.get('q')
        or params.get('date_from')
        or params.get('date_to')
        or params.get('date_on')
        or params.get('time_hour') is not None
    )


def _player_name_q(prefix, term):
    return (
        Q(**{f'{prefix}__first_name__icontains': term})
        | Q(**{f'{prefix}__last_name__icontains': term})
    )


def _squad_order(params):
    sort = params.get('sort', 'name')
    order = params.get('order', 'asc')
    desc = order == 'desc'
    if sort == 'created_at':
        return ['-created_at', '-id'] if desc else ['created_at', 'id']
    name_key = Lower('name')
    return [name_key.desc(), '-id'] if desc else [name_key.asc(), 'id']


def _match_order(params):
    order = params.get('order', 'desc')
    prefix = '-' if order == 'desc' else ''
    return f'{prefix}datetime', 'id'


def apply_squad_search(queryset, params):
    q = params.get('q', '')
    if q:
        queryset = queryset.filter(
            Q(name__icontains=q) | _player_name_q('members', q)
        ).distinct()

    return queryset.order_by(*_squad_order(params))


def _apply_match_datetime_filters(queryset, params):
    date_on = params.get('date_on', '')
    date_from = params.get('date_from', '')
    date_to = params.get('date_to', '')
    time_hour = params.get('time_hour')

    if date_on:
        try:
            day_start = datetime.strptime(date_on, '%Y-%m-%d')
            if time_hour is not None:
                day_start = day_start.replace(hour=time_hour, minute=0, second=0)
                day_end = day_start + timedelta(hours=1) - timedelta(seconds=1)
            else:
                day_end = day_start.replace(hour=23, minute=59, second=59)
            return queryset.filter(datetime__gte=day_start, datetime__lte=day_end)
        except ValueError:
            pass

    if date_from:
        try:
            dt_from = datetime.strptime(date_from, '%Y-%m-%d')
            queryset = queryset.filter(datetime__gte=dt_from)
        except ValueError:
            pass

    if date_to:
        try:
            dt_to = datetime.strptime(date_to, '%Y-%m-%d').replace(hour=23, minute=59, second=59)
            queryset = queryset.filter(datetime__lte=dt_to)
        except ValueError:
            pass

    if time_hour is not None:
        queryset = queryset.filter(datetime__hour=time_hour)

    return queryset


def apply_match_search(queryset, params):
    q = params.get('q', '')
    if q:
        queryset = queryset.filter(
            Q(location__icontains=q) | _player_name_q('teams__members', q)
        ).distinct()

    queryset = _apply_match_datetime_filters(queryset, params)

    primary, secondary = _match_order(params)
    return queryset.order_by(primary, secondary).distinct()


def squad_search_meta(params, counts):
    return {
        'q': params.get('q', ''),
        'sort': params.get('sort', 'name'),
        'order': params.get('order', 'asc'),
        'counts': counts,
        'total': sum(counts.values()),
    }


def match_search_meta(params, total):
    return {
        'q': params.get('q', ''),
        'date_from': params.get('date_from', ''),
        'date_to': params.get('date_to', ''),
        'date_on': params.get('date_on', ''),
        'time_hour': params.get('time_hour'),
        'sort': params.get('sort', 'datetime'),
        'order': params.get('order', 'desc'),
        'total': total,
    }

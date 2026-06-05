import json
from functools import wraps

from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

from apps.matches.repositories.match_repository import match_repository
from apps.squads.repositories.squad_repository import squad_repository


def can_view_squad(view_func):
    @wraps(view_func)
    @csrf_exempt
    def wrapper(request, *args, **kwargs):
        squad_id = kwargs.get('pk') or kwargs.get('squad_id') or request.GET.get('squad_id')

        if squad_id:
            try:
                squad = squad_repository.get_by_id(squad_id)
                if not squad:
                    return HttpResponse("Squad not found", status=404)

                if not squad_repository.user_can_view(squad, request.user):
                    if not request.user.is_authenticated:
                        return HttpResponse("Authentication required", status=401)
                    return HttpResponse("Access denied", status=403)

            except (ValueError, TypeError):
                return HttpResponse("Invalid squad ID", status=400)

        return view_func(request, *args, **kwargs)

    return wrapper


def can_modify_squad(view_func):
    @wraps(view_func)
    @csrf_exempt
    def wrapper(request, *args, **kwargs):
        from apps.core.services.jwt_auth import resolve_user

        user = resolve_user(request)
        if user:
            request.user = user

        if not request.user.is_authenticated:
            return HttpResponse("Authentication required", status=401)

        squad_id = kwargs.get('pk') or kwargs.get('squad_id')

        if not squad_id:
            try:
                data = json.loads(request.body)
                squad_id = data.get('squad_id')
            except Exception:
                pass

        if squad_id:
            try:
                squad = squad_repository.get_by_id(squad_id)
                if not squad:
                    return HttpResponse("Squad not found", status=404)

                if not squad_repository.is_admin(squad, request.user):
                    return HttpResponse("Only squad admins can modify this squad", status=403)

            except (ValueError, TypeError):
                return HttpResponse("Invalid squad ID", status=400)

        return view_func(request, *args, **kwargs)

    return wrapper


def can_view_squad_matches(view_func):
    @wraps(view_func)
    @csrf_exempt
    def wrapper(request, *args, **kwargs):
        from apps.core.services.jwt_auth import resolve_user

        user = resolve_user(request)
        if user:
            request.user = user

        squad_id = request.GET.get('squad_id') or kwargs.get('squad_id')

        if squad_id:
            try:
                squad = squad_repository.get_by_id(squad_id)
                if not squad:
                    return HttpResponse("Squad not found", status=404)

                if not squad_repository.user_can_view(squad, request.user):
                    if not request.user.is_authenticated:
                        return HttpResponse("Authentication required", status=401)
                    return HttpResponse("Access denied", status=403)

            except (ValueError, TypeError):
                return HttpResponse("Invalid squad ID", status=400)

        return view_func(request, *args, **kwargs)

    return wrapper


def can_modify_squad_matches(view_func):
    @wraps(view_func)
    @csrf_exempt
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return HttpResponse("Authentication required", status=401)

        squad_id = None

        try:
            if hasattr(request, 'body') and request.body:
                data = json.loads(request.body)
                squad_id = data.get('squad_id')
                if not squad_id:
                    match_id = data.get('match_id')
                    if match_id:
                        match = match_repository.get_by_id(match_id)
                        if match and match.squad:
                            squad_id = match.squad.id
        except (json.JSONDecodeError, AttributeError):
            pass

        if not squad_id:
            match_id = kwargs.get('pk') or kwargs.get('match_id')
            if match_id:
                match = match_repository.get_by_id(match_id)
                if match and match.squad:
                    squad_id = match.squad.id

        if squad_id:
            try:
                squad = squad_repository.get_by_id(squad_id)
                if not squad:
                    return HttpResponse("Squad not found", status=404)

                if not squad_repository.is_admin(squad, request.user):
                    return HttpResponse("Only squad admins can modify matches", status=403)

            except (ValueError, TypeError):
                return HttpResponse("Invalid squad ID", status=400)
        else:
            return HttpResponse("Squad ID is required", status=400)

        return view_func(request, *args, **kwargs)

    return wrapper

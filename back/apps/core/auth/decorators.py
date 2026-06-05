from functools import wraps

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from apps.core.services.jwt_auth import resolve_user
from apps.core.services.rbac import user_has_permission, user_has_role


def _unauthorized():
    return JsonResponse({'detail': 'Authentication required'}, status=401)


def _forbidden(message='Permission denied'):
    return JsonResponse({'detail': message}, status=403)


def public_api(view_func):
    """Mark endpoint as public (still applies csrf_exempt when stacked)."""
    return view_func


def jwt_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        user = resolve_user(request)
        if not user:
            return _unauthorized()
        request.user = user
        return view_func(request, *args, **kwargs)

    return wrapper


def jwt_optional(view_func):
    """Attach user when token/session present; allow anonymous access."""

    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        user = resolve_user(request)
        if user:
            request.user = user
        return view_func(request, *args, **kwargs)

    return wrapper


def permission_required(permission_code):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            user = resolve_user(request)
            if not user:
                return _unauthorized()
            request.user = user
            if not user_has_permission(user, permission_code):
                return _forbidden(f'Missing permission: {permission_code}')
            return view_func(request, *args, **kwargs)

        return wrapper

    return decorator


def role_required(role_name):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            user = resolve_user(request)
            if not user:
                return _unauthorized()
            request.user = user
            if not (user.is_superuser or user_has_role(user, role_name)):
                return _forbidden(f'Missing role: {role_name}')
            return view_func(request, *args, **kwargs)

        return wrapper

    return decorator


def api_view(*, public=False, jwt=False, permission=None, role=None):
    """Compose csrf_exempt + auth decorators for API views."""

    def decorator(view_func):
        wrapped = view_func
        if role:
            wrapped = role_required(role)(wrapped)
        elif permission:
            wrapped = permission_required(permission)(wrapped)
        elif jwt:
            wrapped = jwt_required(wrapped)
        elif not public:
            wrapped = jwt_required(wrapped)
        wrapped = csrf_exempt(wrapped)
        return wrapped

    return decorator

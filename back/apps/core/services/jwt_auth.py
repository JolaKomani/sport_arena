from datetime import timedelta

import jwt
from django.conf import settings
from django.utils import timezone

from apps.core.services.rbac import user_has_role
from apps.users.repositories import user_repository

TOKEN_TYPE_ACCESS = 'access'


def _encode(payload, expires_delta):
    now = timezone.now()
    payload = {
        **payload,
        'iat': int(now.timestamp()),
        'exp': int((now + expires_delta).timestamp()),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


def create_access_token(user):
    roles = user_repository.list_role_names(user)
    return _encode(
        {
            'sub': str(user.id),
            'email': user.email,
            'roles': roles,
            'type': TOKEN_TYPE_ACCESS,
        },
        timedelta(minutes=settings.JWT_ACCESS_LIFETIME_MINUTES),
    )


def decode_access_token(token):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
    except jwt.PyJWTError:
        return None
    if payload.get('type') != TOKEN_TYPE_ACCESS:
        return None
    return payload


def get_user_from_access_token(token):
    payload = decode_access_token(token)
    if not payload:
        return None
    try:
        user_id = int(payload['sub'])
    except (TypeError, ValueError):
        return None
    user = user_repository.get_by_id(user_id)
    if not user or not user.is_active:
        return None
    return user


def extract_bearer_token(request):
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.startswith('Bearer '):
        return None
    return auth_header[7:].strip() or None


def resolve_user(request):
    """JWT Bearer first, then Django session."""
    token = extract_bearer_token(request)
    if token:
        user = get_user_from_access_token(token)
        if user:
            return user

    if getattr(request, 'user', None) and request.user.is_authenticated:
        return request.user

    return None


def user_payload(user):
    roles = user_repository.list_role_names(user)
    return {
        'id': user.id,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'phone': user.phone,
        'full_name': user.full_name,
        'roles': roles,
        'is_admin': user.is_superuser or user_has_role(user, 'admin'),
    }

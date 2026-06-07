import secrets
from datetime import timedelta

from django.utils import timezone

from apps.core.repositories.token_repository import token_repository


def create_refresh_token(user, days=30):
    token = secrets.token_urlsafe(48)
    expires_at = timezone.now() + timedelta(days=days)
    return token_repository.create(
        user=user,
        token=token,
        expires_at=expires_at,
        created_by=user,
        updated_by=user,
    )


def revoke_user_tokens(user):
    token_repository.revoke_active_for_user(user, revoked_at=timezone.now())


def serialize_refresh_token(refresh_token):
    return {
        'token': refresh_token.token,
        'expires_at': refresh_token.expires_at.isoformat(),
    }


def get_valid_refresh_token(token_string):
    return token_repository.get_valid_refresh(token_string)


def revoke_refresh_token(token_string):
    from django.utils import timezone

    row = token_repository.get_by_token(token_string)
    if row and row.revoked_at is None:
        token_repository.revoke_token(row, timezone.now())
        return True
    return False

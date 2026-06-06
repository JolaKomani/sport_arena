from django.conf import settings

from apps.core.services.jwt_auth import create_access_token
from apps.core.services.tokens import create_refresh_token, serialize_refresh_token


def issue_token_pair(user):
    access_token = create_access_token(user)
    refresh = create_refresh_token(user, days=settings.JWT_REFRESH_LIFETIME_DAYS)
    return {
        'access_token': access_token,
        'refresh_token': serialize_refresh_token(refresh),
        'token_type': 'Bearer',
        'expires_in': settings.JWT_ACCESS_LIFETIME_MINUTES * 60,
    }

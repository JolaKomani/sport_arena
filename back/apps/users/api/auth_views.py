import json

from django.contrib.auth import authenticate
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from apps.core.services.auth_tokens import issue_token_pair
from apps.core.services.jwt_auth import create_access_token, user_payload
from apps.core.services.tokens import get_valid_refresh_token, revoke_refresh_token


@csrf_exempt
def token_refresh_api(request):
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed'}, status=405)

    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'detail': 'Invalid JSON'}, status=400)

    refresh_value = data.get('refresh_token') or data.get('token')
    if not refresh_value:
        return JsonResponse({'detail': 'refresh_token is required'}, status=400)

    refresh_row = get_valid_refresh_token(refresh_value)
    if not refresh_row:
        return JsonResponse({'detail': 'Invalid or expired refresh token'}, status=401)

    user = refresh_row.user
    if not user.is_active:
        return JsonResponse({'detail': 'User account is inactive'}, status=401)

    return JsonResponse({
        'access_token': create_access_token(user),
        'token_type': 'Bearer',
        'user': user_payload(user),
    })


@csrf_exempt
def token_verify_api(request):
    """Optional: verify access token from Authorization header."""
    from apps.core.services.jwt_auth import resolve_user

    user = resolve_user(request)
    if not user:
        return JsonResponse({'detail': 'Invalid token'}, status=401)
    return JsonResponse({'valid': True, 'user': user_payload(user)})

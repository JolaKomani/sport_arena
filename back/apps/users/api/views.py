import json

from django.db.models import Avg
from django.http import HttpResponse, JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt

from apps.core.auth import jwt_optional, jwt_required, permission_required, role_required
from apps.core.services.audit import get_client_ip, log_audit
from apps.core.services.auth_tokens import issue_token_pair
from apps.core.services.jwt_auth import user_payload
from apps.core.services.notifications import unread_count
from apps.core.services.profiles import ensure_user_profile
from apps.core.services.rbac import ensure_player_role
from apps.core.services.tokens import revoke_refresh_token, revoke_user_tokens
from apps.core.models import AuditLog
from apps.matches.repositories.match_repository import match_repository
from apps.ratings.repositories.rating_repository import rating_repository
from apps.teams.repositories.team_repository import team_repository
from apps.users.models import User
from apps.users.repositories import login_history_repository, user_repository


@csrf_exempt
@permission_required('users.view')
def user_list_api(request):
    users_list = list(user_repository.list_values("id", "first_name", "last_name", "email", "phone"))

    return HttpResponse(json.dumps(users_list), content_type="application/json")


@csrf_exempt
@permission_required('users.view')
def user_detail_api(request, pk):
    user = user_repository.get_by_pk(pk)
    if not user:
        return HttpResponse("user not found", status=404)

    user_data = {
        'id': user.id,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'phone': user.phone,
    }

    return HttpResponse(json.dumps(user_data), content_type="application/json")


@csrf_exempt
def user_create_api(request):
    data = json.loads(request.body)

    first_name = data.get('first_name')
    last_name = data.get('last_name')
    email = data.get('email')
    phone = data.get('phone')
    password = data.get('password')

    if not all((first_name, last_name, email, password)):
        return HttpResponse('first_name, last_name, email and password are required')

    if user_repository.exists_by_email(email):
        return HttpResponse('User with this email exists')

    user = User(email=email, first_name=first_name, last_name=last_name, phone=phone)
    user.set_password(password)
    user_repository.save(user)

    ensure_user_profile(user, actor=user)
    ensure_player_role(user, actor=user)
    log_audit(request, AuditLog.ACTION_CREATE, 'user', user.id)

    login(request, user)
    tokens = issue_token_pair(user)

    return JsonResponse({
        'message': 'User created successfully',
        **tokens,
        'user': user_payload(user),
    })


@csrf_exempt
@permission_required('users.update_self')
def user_update_api(request):
    """Update user profile. Requires authentication and user can only update their own profile."""
    data = json.loads(request.body)

    user_id = data.get('user_id')
    if not user_id:
        return HttpResponse('user_id is required', status=400)

    user = user_repository.get_by_pk(user_id)
    if not user:
        return HttpResponse('user not found', status=404)
    
    # Ensure user can only update their own profile
    if request.user.id != user.id:
        return HttpResponse('You can only update your own profile', status=403)

    first_name = data.get('first_name')
    last_name = data.get('last_name')
    email = data.get('email')
    phone = data.get('phone')
    password = data.get('password')

    if first_name:
        user.first_name = first_name
    if last_name:
        user.last_name = last_name
    if email:
        # Check if email is already taken by another user
        if user_repository.exists_by_email_excluding(email, user.id):
            return HttpResponse('Email already exists', status=400)
        user.email = email
    if phone is not None:
        user.phone = phone or None
    if password:
        # Update password
        user.set_password(password)
        user_repository.save(user)
        return HttpResponse('User updated successfully')
    
    user_repository.save(user)
    return HttpResponse('User updated successfully')


@csrf_exempt
@role_required('admin')
def user_delete_api(request):
    data = json.loads(request.body)
    user_id = data.get('user_id')
    if not user_id:
        return HttpResponse('user_id is required')
    user = user_repository.get_by_pk(user_id)
    if not user:
        return HttpResponse('user not found')
    user_repository.delete(user)
    return HttpResponse('User deleted successfully')


@csrf_exempt
def user_login_api(request):
    """Login API - uses Django's authenticate() and login()"""
    data = json.loads(request.body)
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return HttpResponse('email and password are required', status=400)

    # Use Django's authenticate() - pass email as 'username' since USERNAME_FIELD='email'
    user = authenticate(request, username=email, password=password)
    
    if user is None:
        return HttpResponse('Invalid email or password', status=401)

    login(request, user)
    ensure_user_profile(user, actor=user)
    ensure_player_role(user, actor=user)
    tokens = issue_token_pair(user)
    login_history_repository.create(
        user=user,
        ip_address=get_client_ip(request),
        user_agent=(request.META.get('HTTP_USER_AGENT') or '')[:255],
        succeeded=True,
        created_by=user,
        updated_by=user,
    )
    log_audit(request, AuditLog.ACTION_CREATE, 'session', user.id)

    return JsonResponse({
        'message': 'Login successful',
        'user': user_payload(user),
        **tokens,
    })


@csrf_exempt
@jwt_optional
def user_logout_api(request):
    """Logout API — revoke refresh token(s) and clear session."""
    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        data = {}
    refresh_value = data.get('refresh_token') or data.get('token')
    if refresh_value:
        revoke_refresh_token(refresh_value)
    user = getattr(request, 'user', None)
    if user and getattr(user, 'is_authenticated', False):
        revoke_user_tokens(user)
    logout(request)
    return HttpResponse('Logged out successfully')


@csrf_exempt
@jwt_required
def user_me_api(request):
    user = request.user
    payload = user_payload(user)
    payload['unread_notifications'] = unread_count(user)
    return JsonResponse(payload)


@csrf_exempt
@jwt_required
def user_avg_rating_api(request):
    data = json.loads(request.body)

    player_id = data.get('player_id')

    if not player_id:
        return HttpResponse("player_id is required", status=400)

    player = user_repository.get_by_id(player_id)
    if not player:
        return HttpResponse("User not found", status=404)

    ratings = rating_repository.received_ratings(player)

    if not ratings.exists():
        return HttpResponse("This player has no ratings yet", status=404)

    avg_rating = ratings.aggregate(Avg('score'))['score__avg']

    return HttpResponse(avg_rating)


@csrf_exempt
@jwt_optional
def players_avg_ratings_api(request):
    """Get average ratings (by others, excluding self-ratings) for multiple players.
    If squad_id is provided, only include ratings from that squad."""
    from apps.core.services.ratings_stats import compute_avg_ratings

    if request.method != 'GET':
        return HttpResponse("Method not allowed", status=405)

    player_ids = request.GET.get('player_ids', '')
    squad_id = request.GET.get('squad_id')

    if not player_ids:
        return HttpResponse("player_ids parameter is required", status=400)

    try:
        player_id_list = [int(id.strip()) for id in player_ids.split(',') if id.strip()]
    except ValueError:
        return HttpResponse("Invalid player_ids format", status=400)

    if not player_id_list:
        return HttpResponse("No valid player IDs provided", status=400)

    squad_id_int = None
    if squad_id:
        try:
            squad_id_int = int(squad_id)
        except (ValueError, TypeError):
            return HttpResponse("Invalid squad_id format", status=400)

    return JsonResponse(compute_avg_ratings(player_id_list, squad_id_int))


@csrf_exempt
@jwt_optional
def global_rankings_api(request):
    """Top players by global average rating."""
    from apps.core.services.ratings_stats import compute_all_rankings, compute_global_rankings

    if request.method != 'GET':
        return HttpResponse("Method not allowed", status=405)

    if request.GET.get('all', '').lower() in ('1', 'true', 'yes'):
        rankings = compute_all_rankings()
        return JsonResponse({'rankings': rankings, 'total': len(rankings)})

    try:
        limit = min(int(request.GET.get('limit', 10)), 50)
    except (TypeError, ValueError):
        limit = 10

    return JsonResponse({'rankings': compute_global_rankings(limit), 'limit': limit})


@csrf_exempt
@jwt_optional
def rankings_export_api(request):
    from apps.core.services.data_export import build_export_response
    from apps.core.services.export_collectors import RANKING_EXPORT_HEADERS, collect_ranking_export_rows

    if request.method != 'GET':
        return HttpResponse("Method not allowed", status=405)

    fmt = request.GET.get('format', 'csv')
    rows = collect_ranking_export_rows()
    return build_export_response('player_rankings', fmt, RANKING_EXPORT_HEADERS, rows)


@csrf_exempt
@jwt_required
def user_performance_api(request):
    """Get performance statistics for the logged-in user"""
    from django.db.models import Avg

    user = request.user

    user_teams = team_repository.filter_by_member(user)
    matches = match_repository.filter_by_teams(user_teams)
    
    # Calculate statistics
    # Only count matches where all teams have scores filled
    total_matches = 0
    wins = 0
    losses = 0
    draws = 0
    match_data = []
    
    for match in matches:
        # Get the team the user was in for this match
        user_team = match.teams.filter(members=user).first()
        if not user_team:
            continue
        
        user_team_score = user_team.score if user_team.score is not None else None
        
        # Skip matches where user's team has no score
        if user_team_score is None:
            continue
        
        # Check if all other teams have scores
        other_teams = match.teams.exclude(id=user_team.id)
        all_teams_have_scores = True
        other_team_scores = []
        
        for other_team in other_teams:
            other_score = other_team.score if other_team.score is not None else None
            if other_score is None:
                all_teams_have_scores = False
                break
            other_team_scores.append(other_score)
        
        # Only count matches where all teams have scores
        if not all_teams_have_scores:
            continue
        
        total_matches += 1
        
        # Determine result: win, loss, or draw
        max_other_score = max(other_team_scores) if other_team_scores else -1
        won = False
        lost = False
        draw = False
        
        if user_team_score > max_other_score:
            # User's team has the highest score - win
            won = True
            wins += 1
        elif user_team_score < max_other_score:
            # User's team score is less than at least one other team - loss
            lost = True
            losses += 1
        else:
            # User's team score equals the highest other score - draw
            draw = True
            draws += 1
        
        # Get average rating by others for this match (excluding self-ratings)
        avg_rating_by_others = rating_repository.avg_for_match_rated_user(
            match, user, exclude_rater=user
        )

        self_rating = rating_repository.get_self_rating_for_match(match, user)
        
        match_data.append({
            'match_id': match.id,
            'date': match.datetime.strftime("%Y-%m-%d"),
            'datetime': match.datetime.strftime("%Y-%m-%dT%H:%M"),
            'location': match.location,
            'won': won,
            'lost': lost,
            'draw': draw,
            'user_team_score': user_team_score,
            'average_rating_by_others': round(avg_rating_by_others, 2) if avg_rating_by_others else None,
            'self_rating': self_rating.score if self_rating else None,
        })
    
    # Calculate overall average rating by others (excluding self-ratings)
    all_ratings_by_others = rating_repository.queryset_for_rated_user(user, exclude_rater=user)
    overall_avg_rating = all_ratings_by_others.aggregate(avg=Avg('score'))['avg']

    self_ratings = rating_repository.list_self_ratings(user)
    overall_avg_self_rating = self_ratings.aggregate(avg=Avg('score'))['avg']
    
    performance_data = {
        'total_matches': total_matches,
        'wins': wins,
        'losses': losses,
        'draws': draws,
        'overall_avg_rating_by_others': round(overall_avg_rating, 2) if overall_avg_rating else None,
        'overall_avg_self_rating': round(overall_avg_self_rating, 2) if overall_avg_self_rating else None,
        'matches': match_data
    }
    
    return JsonResponse(performance_data)
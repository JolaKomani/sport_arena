import json

from django.db.models import Avg
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login, logout

from apps.users.models import User


@csrf_exempt
def user_list_api(request):
    users = User.objects.all()

    users_list = list(users.values("id", "first_name", "last_name", "email", "phone"))

    return HttpResponse(json.dumps(users_list), content_type="application/json")


@csrf_exempt
def user_detail_api(request, pk):
    user = User.objects.filter(pk=pk).first()
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

    if User.objects.filter(email=email).exists():
        return HttpResponse('User with this email exists')

    user = User(email=email, first_name=first_name, last_name=last_name, phone=phone)
    user.set_password(password)
    user.save()

    login(request, user)

    return HttpResponse('User created successfully')


@csrf_exempt
def user_update_api(request):
    """Update user profile. Requires authentication and user can only update their own profile."""
    if not request.user.is_authenticated:
        return HttpResponse('Authentication required', status=401)

    data = json.loads(request.body)

    user_id = data.get('user_id')
    if not user_id:
        return HttpResponse('user_id is required', status=400)

    user = User.objects.filter(pk=user_id).first()
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
        if User.objects.filter(email=email).exclude(id=user.id).exists():
            return HttpResponse('Email already exists', status=400)
        user.email = email
    if phone:
        user.phone = phone
    if password:
        # Update password
        user.set_password(password)
        user.save()
        return HttpResponse('User updated successfully')

    user.save()
    return HttpResponse('User updated successfully')


@csrf_exempt
def user_delete_api(request):
    data = json.loads(request.body)
    user_id = data.get('user_id')
    if not user_id:
        return HttpResponse('user_id is required')
    user = User.objects.filter(pk=user_id).first()
    if not user:
        return HttpResponse('user not found')
    user.delete()
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

    return JsonResponse({
        'message': 'Login successful',
        'user': {
            'id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email
        }
    })


@csrf_exempt
def user_logout_api(request):
    """Logout API - uses Django's logout()"""
    logout(request)
    return HttpResponse('Logged out successfully')


@csrf_exempt
def user_me_api(request):
    """Get current logged in user via request.user"""
    if not request.user.is_authenticated:
        return HttpResponse('Not authenticated', status=401)

    user = request.user
    return JsonResponse({
        'id': user.id,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'phone': user.phone,
        'full_name': user.full_name
    })


@csrf_exempt
def user_avg_rating_api(request):
    data = json.loads(request.body)

    player_id = data.get('player_id')

    if not player_id:
        return HttpResponse("player_id is required", status=400)

    player = User.objects.filter(id=player_id).first()
    if not player:
        return HttpResponse("User not found", status=404)

    ratings = player.received_ratings.all()

    if not ratings.exists():
        return HttpResponse("This player has no ratings yet", status=404)

    avg_rating = ratings.aggregate(Avg('score'))['score__avg']

    return HttpResponse(avg_rating)


@csrf_exempt
def players_avg_ratings_api(request):
    """Get average ratings (by others, excluding self-ratings) for multiple players.
    If squad_id is provided, only include ratings from matches in that squad."""
    from apps.ratings.models import Rating
    from apps.matches.models import Match

    if request.method == 'GET':
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

        # Get matches for the squad if squad_id is provided
        squad_matches = None
        if squad_id:
            try:
                squad_id_int = int(squad_id)
                from apps.squads.models import Squad
                squad = Squad.objects.filter(id=squad_id_int).first()
                if squad:
                    squad_matches = Match.objects.filter(squad=squad)
            except (ValueError, TypeError):
                return HttpResponse("Invalid squad_id format", status=400)

        players = User.objects.filter(id__in=player_id_list)
        ratings_data = {}

        for player in players:
            # Base query for ratings by others (excluding self-ratings)
            ratings_query = Rating.objects.filter(
                rated_user=player
            ).exclude(
                rater_user=player
            )

            # Filter by squad matches if squad_id is provided
            if squad_matches is not None:
                ratings_query = ratings_query.filter(match__in=squad_matches)

            # Get average rating
            avg_rating = ratings_query.aggregate(avg=Avg('score'))['avg']

            # Get rating count
            rating_count = ratings_query.count()

            ratings_data[player.id] = {
                'player_id': player.id,
                'average_rating': round(avg_rating, 2) if avg_rating else None,
                'rating_count': rating_count
            }

        return JsonResponse(ratings_data)

    return HttpResponse("Method not allowed", status=405)

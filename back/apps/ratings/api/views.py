import json

from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from apps.core.auth import jwt_optional, permission_required
from apps.matches.repositories import match_repository
from apps.ratings.repositories import rating_repository
from apps.users.repositories import user_repository


@csrf_exempt
@jwt_optional
def rating_list_api(request, match_pk):
    """
    Get ratings for a specific match.
    If ?averages=true, returns average ratings per player (excluding self-ratings).
    Otherwise, returns all ratings for the match.
    """
    match = match_repository.get_by_id(match_pk)
    if not match:
        return HttpResponse("Match not found", status=404)

    if request.GET.get('averages') == 'true':
        all_match_players = []
        for team in match.teams.all():
            all_match_players.extend(team.members.all())

        averages = {}
        for player in all_match_players:
            avg_rating, rating_count = rating_repository.aggregate_avg_for_match_player(
                match, player, exclude_self=True
            )

            averages[player.id] = {
                'player_id': player.id,
                'player_name': player.full_name,
                'average_rating': round(avg_rating, 2) if avg_rating else None,
                'rating_count': rating_count,
            }

        return HttpResponse(json.dumps(averages), content_type="application/json")

    ratings = rating_repository.list_for_match(match)
    ratings_list = []
    for rating in ratings:
        data = {
            'id': rating.id,
            'match_id': match.id,
            'rater_user': {
                'id': rating.rater_user.id,
                'name': rating.rater_user.full_name,
                'email': rating.rater_user.email,
            },
            'rated_user': {
                'id': rating.rated_user.id,
                'name': rating.rated_user.full_name,
                'email': rating.rated_user.email,
            },
            'rating': rating.score,
        }
        ratings_list.append(data)
    return HttpResponse(json.dumps(ratings_list), content_type="application/json")


@csrf_exempt
@jwt_optional
def rating_detail_api(request, pk):
    rating = rating_repository.get_by_id(pk)
    if not rating:
        return JsonResponse({'error': 'Rating not found'}, status=404)

    rating_data = {
        'id': rating.id,
        'match': rating.match.id,
        'rater_user': rating.rater_user.full_name,
        'rated_user': rating.rated_user.full_name,
        'score': rating.score,
    }

    return JsonResponse({'rating': rating_data})


@csrf_exempt
@permission_required('ratings.create')
def rating_create_api(request):
    data = json.loads(request.body)
    match_id = data.get('match_id')
    rated_user_id = data.get('rated_user_id')
    score = data.get('score')

    if not all([match_id, rated_user_id, score]):
        return HttpResponse("match_id, rated_user_id and score are required", status=400)

    try:
        score = int(score)
        if score < 1 or score > 10:
            return HttpResponse("Score must be between 1 and 10", status=400)
    except (ValueError, TypeError):
        return HttpResponse("Invalid score", status=400)

    match = match_repository.get_by_id(match_id)
    if not match:
        return HttpResponse("Match not found", status=404)

    all_match_players = []
    for team in match.teams.all():
        all_match_players.extend(team.members.all())

    if request.user not in all_match_players:
        return HttpResponse("You must be a player in this match to rate", status=403)

    rated_user = user_repository.get_by_id(rated_user_id)
    if not rated_user:
        return HttpResponse("Rated user not found", status=404)

    if rated_user not in all_match_players:
        return HttpResponse("Rated user must be a player in this match", status=400)

    rating, created = rating_repository.get_or_create(
        match=match,
        rater_user=request.user,
        rated_user=rated_user,
        defaults={'score': score},
    )

    if not created:
        rating.score = score
        rating_repository.save(rating)

    return HttpResponse(json.dumps({
        'id': rating.id,
        'match_id': match.id,
        'rater_user': {
            'id': rating.rater_user.id,
            'name': rating.rater_user.full_name,
            'email': rating.rater_user.email,
        },
        'rated_user': {
            'id': rating.rated_user.id,
            'name': rating.rated_user.full_name,
            'email': rating.rated_user.email,
        },
        'rating': rating.score,
    }), content_type="application/json")


@csrf_exempt
@permission_required('ratings.create')
def rating_update_api(request):
    data = json.loads(request.body)
    rating_id = data.get('rating_id')
    score = data.get('score')

    if not rating_id:
        return HttpResponse("rating_id is required", status=400)

    if score is None:
        return HttpResponse("score is required", status=400)

    try:
        score = int(score)
        if score < 1 or score > 10:
            return HttpResponse("Score must be between 1 and 10", status=400)
    except (ValueError, TypeError):
        return HttpResponse("Invalid score", status=400)

    rating = rating_repository.get_by_id(rating_id)
    if not rating:
        return HttpResponse("Rating not found", status=404)

    if rating.rater_user.id != request.user.id:
        return HttpResponse("You can only update your own ratings", status=403)

    rating.score = score
    rating_repository.save(rating)

    return HttpResponse(json.dumps({
        'id': rating.id,
        'match_id': rating.match.id,
        'rater_user': {
            'id': rating.rater_user.id,
            'name': rating.rater_user.full_name,
            'email': rating.rater_user.email,
        },
        'rated_user': {
            'id': rating.rated_user.id,
            'name': rating.rated_user.full_name,
            'email': rating.rated_user.email,
        },
        'rating': rating.score,
    }), content_type="application/json")


@csrf_exempt
@permission_required('ratings.create')
def rating_delete_api(request):
    data = json.loads(request.body)
    rating_id = data.get('rating_id')

    if not rating_id:
        return HttpResponse("Rating is required", status=404)

    rating = rating_repository.get_by_id(rating_id)
    if not rating:
        return HttpResponse("Rating not found", status=404)

    rating_repository.delete(rating)

    return HttpResponse(f"Rating deleted successfully: {rating}")

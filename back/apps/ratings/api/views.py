import json

from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Avg

from apps.matches.models import Match
from apps.users.models import User
from apps.ratings.models import Rating


@csrf_exempt
def rating_list_api(request, match_pk):
    """
    Get ratings for a specific match.
    If ?averages=true, returns average ratings per player (excluding self-ratings).
    Otherwise, returns all ratings for the match.
    """
    match = Match.objects.filter(id=match_pk).first()
    if not match:
        return HttpResponse("Match not found", status=404)
    
    # Check if requesting averages
    if request.GET.get('averages') == 'true':
        # Get average ratings per player (excluding self-ratings)
        all_match_players = []
        for team in match.teams.all():
            all_match_players.extend(team.members.all())
        
        averages = {}
        for player in all_match_players:
            # Get average rating excluding self-ratings
            avg_rating = Rating.objects.filter(
                match=match,
                rated_user=player
            ).exclude(
                rater_user=player
            ).aggregate(avg=Avg('score'))['avg']
            
            rating_count = Rating.objects.filter(
                match=match,
                rated_user=player
            ).exclude(
                rater_user=player
            ).count()
            
            averages[player.id] = {
                'player_id': player.id,
                'player_name': player.full_name,
                'average_rating': round(avg_rating, 2) if avg_rating else None,
                'rating_count': rating_count
            }
        
        return HttpResponse(json.dumps(averages), content_type="application/json")
    
    # Regular ratings list
    ratings = match.rating_set.all()
    ratings_list = []
    for rating in ratings:
        data = {
            'id': rating.id,
            'match_id': match.id,
            'rater_user': {
                'id': rating.rater_user.id,
                'name': rating.rater_user.full_name,
                'email': rating.rater_user.email
            },
            'rated_user': {
                'id': rating.rated_user.id,
                'name': rating.rated_user.full_name,
                'email': rating.rated_user.email
            },
            'rating': rating.score
        }
        ratings_list.append(data)
    return HttpResponse(json.dumps(ratings_list), content_type="application/json")

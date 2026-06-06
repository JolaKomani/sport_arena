from django.db.models import Avg

from apps.matches.repositories.match_repository import match_repository
from apps.ratings.repositories.rating_repository import rating_repository
from apps.squads.repositories.squad_repository import squad_repository
from apps.users.repositories.user_repository import user_repository


def compute_avg_ratings(player_id_list, squad_id=None):
    squad_matches = None
    if squad_id is not None:
        squad = squad_repository.get_by_id(squad_id)
        if squad:
            squad_matches = match_repository.filter_by_squad(squad)

    players = user_repository.filter_by_ids(player_id_list)
    ratings_data = {}

    for player in players:
        ratings_query = rating_repository.queryset_for_rated_user(
            player,
            exclude_rater=player,
            match_qs=squad_matches,
        )

        avg_rating = ratings_query.aggregate(avg=Avg('score'))['avg']
        rating_count = ratings_query.count()

        ratings_data[player.id] = {
            'player_id': player.id,
            'player_name': player.full_name,
            'average_rating': round(avg_rating, 2) if avg_rating else None,
            'rating_count': rating_count,
        }

    return ratings_data


def compute_global_rankings(limit=10):
    ranked = []

    for player in user_repository.list_active_not_deleted():
        ratings_query = rating_repository.queryset_for_rated_user(
            player,
            exclude_rater=player,
        )
        avg_rating = ratings_query.aggregate(avg=Avg('score'))['avg']
        rating_count = ratings_query.count()
        if avg_rating is None:
            continue
        ranked.append({
            'player_id': player.id,
            'name': player.full_name,
            'average_rating': round(avg_rating, 2),
            'rating_count': rating_count,
        })

    ranked.sort(key=lambda row: (-row['average_rating'], -row['rating_count']))
    return ranked[:limit]


def compute_all_rankings():
    """All players with at least one rating received, sorted by average rating."""
    ranked = []

    for player in user_repository.list_active_not_deleted():
        ratings_query = rating_repository.queryset_for_rated_user(
            player,
            exclude_rater=player,
        )
        avg_rating = ratings_query.aggregate(avg=Avg('score'))['avg']
        rating_count = ratings_query.count()
        if avg_rating is None:
            continue
        ranked.append({
            'player_id': player.id,
            'name': player.full_name,
            'email': player.email,
            'average_rating': round(avg_rating, 2),
            'rating_count': rating_count,
        })

    ranked.sort(key=lambda row: (-row['average_rating'], -row['rating_count']))
    for index, row in enumerate(ranked, start=1):
        row['rank'] = index
    return ranked

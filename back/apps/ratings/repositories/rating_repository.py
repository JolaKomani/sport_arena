from django.db.models import Avg

from apps.ratings.models import Rating


class RatingRepository:
    def get_by_id(self, rating_id):
        return Rating.objects.filter(id=rating_id).first()

    def list_for_match(self, match):
        return match.ratings.all()

    def queryset_for_rated_user(self, rated_user, exclude_rater=None, match_qs=None):
        qs = Rating.objects.filter(rated_user=rated_user)
        if exclude_rater is not None:
            qs = qs.exclude(rater_user=exclude_rater)
        if match_qs is not None:
            qs = qs.filter(match__in=match_qs)
        return qs

    def aggregate_avg_for_match_player(self, match, player, exclude_self=True):
        qs = Rating.objects.filter(match=match, rated_user=player)
        if exclude_self:
            qs = qs.exclude(rater_user=player)
        return qs.aggregate(avg=Avg('score'))['avg'], qs.count()

    def get_self_rating_for_match(self, match, user):
        return Rating.objects.filter(
            match=match,
            rater_user=user,
            rated_user=user,
        ).first()

    def avg_for_match_rated_user(self, match, rated_user, exclude_rater):
        return Rating.objects.filter(
            match=match,
            rated_user=rated_user,
        ).exclude(
            rater_user=exclude_rater,
        ).aggregate(avg=Avg('score'))['avg']

    def get_or_create(self, match, rater_user, rated_user, defaults=None):
        return Rating.objects.get_or_create(
            match=match,
            rater_user=rater_user,
            rated_user=rated_user,
            defaults=defaults or {},
        )

    def save(self, rating):
        rating.save()
        return rating

    def delete(self, rating):
        rating.delete()

    def received_ratings(self, player):
        return player.received_ratings.all()

    def list_self_ratings(self, user):
        return Rating.objects.filter(rater_user=user, rated_user=user)


rating_repository = RatingRepository()

from apps.ratings.models import Rating
from apps.squads.models import Squad

from services.populate.seed_config import (
    RATED_MATCHES_PER_SQUAD,
    lab_squad_names,
    rating_score,
)


def populate_ratings():
    ratings_to_create = []
    squads_processed = 0

    for squad_name in lab_squad_names():
        squad = Squad.objects.filter(name=squad_name).first()
        if not squad:
            print(f"Squad '{squad_name}' not found, skipping ratings.")
            continue

        members = list(squad.members.all().order_by('id'))
        if len(members) < 2:
            print(f"Squad '{squad_name}' needs at least 2 members for ratings.")
            continue

        matches = list(squad.matches.order_by('datetime')[:RATED_MATCHES_PER_SQUAD])
        if len(matches) < RATED_MATCHES_PER_SQUAD:
            print(
                f"Squad '{squad_name}' has only {len(matches)} matches; "
                f'expected {RATED_MATCHES_PER_SQUAD}.'
            )
            continue

        for match in matches:
            for rater in members:
                for rated in members:
                    if rater.id == rated.id:
                        continue
                    ratings_to_create.append(
                        Rating(
                            match=match,
                            rater_user=rater,
                            rated_user=rated,
                            score=rating_score(rater.id, rated.id, match.id),
                        )
                    )

        squads_processed += 1

    created = Rating.objects.bulk_create(ratings_to_create, ignore_conflicts=True)
    print(
        f'Ratings: {len(created)} new rows across {squads_processed} squads '
        f'({RATED_MATCHES_PER_SQUAD} matches each, every player rates every other player).'
    )
    return created

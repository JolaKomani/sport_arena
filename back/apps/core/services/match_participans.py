from apps.core.models import MatchParticipant
from apps.core.repositories.match_participant_repository import match_participant_repository


def sync_match_participants(match, actor=None):
    """Rebuild MatchParticipants from team memberships."""
    match_participant_repository.delete_for_match(match)
    participants = []
    for team in match.teams.all():
        for user in team.members.all():
            participants.append(
                MatchParticipant(
                    match=match,
                    user=user,
                    team=team,
                    created_by=actor,
                    updated_by=actor,
                )
            )
    match_participant_repository.bulk_create(participants)

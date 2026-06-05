from apps.core.models import MatchParticipant


class MatchParticipantRepository:
    def delete_for_match(self, match):
        return MatchParticipant.objects.filter(match=match).delete()

    def bulk_create(self, participants):
        if not participants:
            return []
        return MatchParticipant.objects.bulk_create(participants, ignore_conflicts=True)

    def list_user_ids_for_match(self, match):
        return MatchParticipant.objects.filter(match=match).values_list('user_id', flat=True)


match_participant_repository = MatchParticipantRepository()

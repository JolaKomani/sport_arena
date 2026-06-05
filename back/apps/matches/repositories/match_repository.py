from apps.matches.models import Match


class MatchRepository:
    def get_by_id(self, match_id):
        return Match.objects.filter(id=match_id).first()

    def list_by_squad_id(self, squad_id):
        return Match.objects.filter(squad_id=squad_id).order_by('-datetime')

    def filter_by_squad(self, squad):
        return Match.objects.filter(squad=squad)

    def filter_by_teams(self, teams):
        return Match.objects.filter(teams__in=teams).distinct().order_by('datetime')

    def count_for_squad(self, squad):
        return Match.objects.filter(squad=squad).count()

    def save(self, match):
        match.save()
        return match

    def delete(self, match):
        match.delete()

    def add_team(self, match, team):
        match.teams.add(team)

    def add_player(self, match, user):
        match.players.add(user)

    def remove_player(self, match, user):
        match.players.remove(user)


match_repository = MatchRepository()

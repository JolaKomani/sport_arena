from apps.teams.models import Team


class TeamRepository:
    def list_all(self):
        return Team.objects.all()

    def get_by_pk(self, pk):
        return Team.objects.filter(pk=pk).first()

    def get_by_id(self, team_id):
        return Team.objects.filter(id=team_id).first()

    def get_by_id_or_raise(self, team_id):
        return Team.objects.get(id=team_id)

    def filter_by_member(self, user):
        return Team.objects.filter(members=user)

    def create(self, name, **kwargs):
        return Team.objects.create(name=name, **kwargs)

    def save(self, team):
        team.save()
        return team

    def delete(self, team):
        team.delete()

    def set_members(self, team, users):
        team.members.set(users)

    def add_members(self, team, users):
        team.members.add(*users)


team_repository = TeamRepository()

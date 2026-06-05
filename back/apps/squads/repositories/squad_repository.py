from apps.squads.models import Squad


class SquadRepository:
    def get_by_pk(self, pk):
        return Squad.objects.filter(pk=pk).first()

    def get_by_id(self, squad_id):
        return Squad.objects.filter(id=squad_id).first()

    def exists_by_name(self, name):
        return Squad.objects.filter(name=name).exists()

    def filter_admin_squads(self, user):
        return Squad.objects.filter(admins=user)

    def filter_member_squads_excluding_admin(self, user):
        return Squad.objects.filter(members=user).exclude(admins=user)

    def filter_public_excluding_user(self, user):
        return Squad.objects.filter(is_public=True).exclude(admins=user).exclude(members=user)

    def filter_public(self):
        return Squad.objects.filter(is_public=True)

    def filter_other_for_superuser(self, user):
        return Squad.objects.exclude(admins=user).exclude(is_public=True)

    def save(self, squad):
        squad.save()
        return squad

    def delete(self, squad):
        squad.delete()

    def add_admin(self, squad, user):
        squad.admins.add(user)

    def add_members(self, squad, users):
        squad.members.add(*users)

    def remove_member(self, squad, user):
        squad.members.remove(user)

    def member_ids(self, squad):
        return set(squad.members.values_list('id', flat=True))

    def is_admin(self, squad, user):
        return squad.admins.filter(id=user.id).exists()

    def is_member(self, squad, user):
        return squad.members.filter(id=user.id).exists()

    def user_can_view(self, squad, user):
        if squad.is_public:
            return True
        if not user or not user.is_authenticated:
            return False
        return self.is_admin(squad, user) or self.is_member(squad, user)


squad_repository = SquadRepository()

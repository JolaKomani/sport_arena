from apps.users.models import User


class UserRepository:
    def list_all(self):
        return User.objects.all()

    def list_values(self, fields):
        return self.list_all().values(*fields)

    def get_by_pk(self, pk):
        return User.objects.filter(pk=pk).first()

    def get_by_id(self, user_id):
        return User.objects.filter(id=user_id).first()

    def exists_by_email(self, email):
        return User.objects.filter(email=email).exists()

    def exists_by_email_excluding(self, email, exclude_user_id):
        return User.objects.filter(email=email).exclude(id=exclude_user_id).exists()

    def filter_by_emails(self, emails):
        return list(User.objects.filter(email__in=emails))

    def filter_by_ids(self, user_ids):
        return list(User.objects.filter(id__in=user_ids))

    def list_active_not_deleted(self):
        return User.objects.filter(is_active=True, deleted_at__isnull=True)

    def list_role_names(self, user):
        return list(
            user.user_roles.filter(deleted_at__isnull=True).values_list('role__name', flat=True)
        )

    def save(self, user):
        user.save()
        return user

    def delete(self, user):
        user.delete()


user_repository = UserRepository()

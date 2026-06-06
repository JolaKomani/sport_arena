from apps.core.models import LoginHistory


class LoginHistoryRepository:
    def create(self, **kwargs):
        return LoginHistory.objects.create(**kwargs)


login_history_repository = LoginHistoryRepository()

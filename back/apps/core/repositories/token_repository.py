from apps.core.models import RefreshToken


class TokenRepository:
    def create(self, **kwargs):
        return RefreshToken.objects.create(**kwargs)

    def get_by_token(self, token):
        return RefreshToken.objects.filter(token=token).first()

    def get_valid_refresh(self, token):
        row = self.get_by_token(token)
        if row and row.is_active:
            return row
        return None

    def revoke_active_for_user(self, user, revoked_at):
        return RefreshToken.objects.filter(user=user, revoked_at__isnull=True).update(
            revoked_at=revoked_at,
        )

    def revoke_token(self, token_row, revoked_at):
        token_row.revoked_at = revoked_at
        token_row.save(update_fields=['revoked_at', 'updated_at'])


token_repository = TokenRepository()

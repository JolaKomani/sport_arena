from django.conf import settings
from django.db import models

from django.utils import timezone

from apps.common.models import AuditMixin


class SquadAdmin(models.Model):
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    squad = models.ForeignKey('squads.Squad', on_delete=models.CASCADE, related_name='admin_memberships')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='squad_admin_memberships',
    )

    class Meta:
        db_table = 'SquadAdmins'
        unique_together = ('squad', 'user')
        indexes = [
            models.Index(fields=['squad']),
            models.Index(fields=['user']),
        ]


class SquadMember(models.Model):
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    squad = models.ForeignKey('squads.Squad', on_delete=models.CASCADE, related_name='member_memberships')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='squad_member_memberships',
    )

    class Meta:
        db_table = 'SquadMembers'
        unique_together = ('squad', 'user')
        indexes = [
            models.Index(fields=['squad']),
            models.Index(fields=['user']),
        ]


class Squad(AuditMixin):
    name = models.CharField(max_length=120, db_index=True)
    is_public = models.BooleanField(default=False)
    admins = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through=SquadAdmin,
        related_name='created_squads',
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through=SquadMember,
        related_name='squads',
    )

    class Meta:
        db_table = 'Squads'

    def __str__(self):
        return self.name

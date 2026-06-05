from django.conf import settings
from django.db import models

from django.utils import timezone

from apps.common.models import AuditMixin


class TeamMember(models.Model):
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    team = models.ForeignKey('teams.Team', on_delete=models.CASCADE, related_name='team_memberships')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='team_memberships',
    )

    class Meta:
        db_table = 'TeamMembers'
        unique_together = ('team', 'user')
        indexes = [
            models.Index(fields=['team']),
            models.Index(fields=['user']),
        ]


class Team(AuditMixin):
    name = models.CharField(max_length=50)
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through=TeamMember,
        related_name='teams',
    )
    score = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'Teams'

    def __str__(self):
        return self.name

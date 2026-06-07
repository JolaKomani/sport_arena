from django.db import models
from django.utils import timezone

from apps.common.models import AuditMixin
from apps.squads.models import Squad
from apps.teams.models import Team


class MatchTeam(models.Model):
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    match = models.ForeignKey('matches.Match', on_delete=models.CASCADE, related_name='match_teams')
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='match_teams')

    class Meta:
        db_table = 'MatchTeams'
        unique_together = ('match', 'team')
        indexes = [
            models.Index(fields=['match']),
            models.Index(fields=['team']),
        ]


class Match(AuditMixin):
    location = models.CharField(max_length=120)
    datetime = models.DateTimeField(db_index=True)
    teams = models.ManyToManyField(Team, through=MatchTeam, related_name='matches')
    squad = models.ForeignKey(
        Squad,
        on_delete=models.CASCADE,
        related_name='matches',
    )
    venue = models.ForeignKey(
        'core.Venue',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='matches',
    )

    class Meta:
        db_table = 'Matches'
        indexes = [
            models.Index(fields=['squad', 'datetime']),
        ]

    def __str__(self):
        return f"{self.location} - {self.datetime}"

    def delete(self, *args, **kwargs):
        self.teams.all().delete()
        super().delete(*args, **kwargs)

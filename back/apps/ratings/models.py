from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.common.models import AuditMixin
from apps.matches.models import Match
from apps.users.models import User


class Rating(AuditMixin):
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name='ratings')
    rater_user = models.ForeignKey(
        User,
        related_name='given_ratings',
        on_delete=models.CASCADE,
    )
    rated_user = models.ForeignKey(
        User,
        related_name='received_ratings',
        on_delete=models.CASCADE,
    )
    score = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)],
    )

    class Meta:
        db_table = 'Ratings'
        unique_together = ('match', 'rater_user', 'rated_user')
        indexes = [
            models.Index(fields=['match']),
            models.Index(fields=['rated_user']),
            models.Index(fields=['rater_user']),
        ]

    def __str__(self):
        return f"{self.rater_user.first_name} rated {self.rated_user.first_name} - {self.score}"

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

from apps.common.models import AuditMixin


class User(AbstractUser, AuditMixin):
    username = None
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        db_table = 'Users'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['deleted_at']),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def soft_delete(self, user=None):
        self.is_active = False
        super().soft_delete(user=user)

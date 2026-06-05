import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.common.models import AuditMixin


class Role(AuditMixin):
    name = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = 'Roles'

    def __str__(self):
        return self.name


class Permission(AuditMixin):
    code = models.CharField(max_length=80, unique=True)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = 'Permissions'

    def __str__(self):
        return self.code


class UserRole(AuditMixin):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='user_roles',
    )
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='user_roles')

    class Meta:
        db_table = 'UserRoles'
        unique_together = ('user', 'role')
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['role']),
        ]

    def __str__(self):
        return f'{self.user_id} -> {self.role.name}'


class RolePermission(AuditMixin):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='role_permissions')
    permission = models.ForeignKey(
        Permission,
        on_delete=models.CASCADE,
        related_name='role_permissions',
    )

    class Meta:
        db_table = 'RolePermissions'
        unique_together = ('role', 'permission')
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['permission']),
        ]


class RefreshToken(AuditMixin):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='refresh_tokens',
    )
    token = models.CharField(max_length=64, unique=True, db_index=True)
    expires_at = models.DateTimeField(db_index=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'RefreshTokens'
        indexes = [models.Index(fields=['user', 'expires_at'])]

    @property
    def is_active(self):
        return self.revoked_at is None and self.expires_at > timezone.now()


class AuditLog(models.Model):
    ACTION_CREATE = 'create'
    ACTION_UPDATE = 'update'
    ACTION_DELETE = 'delete'
    ACTION_CHOICES = [
        (ACTION_CREATE, 'Create'),
        (ACTION_UPDATE, 'Update'),
        (ACTION_DELETE, 'Delete'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, db_index=True)
    entity_type = models.CharField(max_length=80, db_index=True)
    entity_id = models.CharField(max_length=64, db_index=True)
    changes = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = 'AuditLogs'
        indexes = [
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['created_at']),
        ]


class Notification(AuditMixin):
    TYPE_MATCH_ADDED = 'match_added'
    TYPE_SQUAD_ADDED = 'squad_added'
    TYPE_SQUAD_INVITE = 'squad_invite'
    TYPE_CHOICES = [
        (TYPE_MATCH_ADDED, 'Added to match'),
        (TYPE_SQUAD_ADDED, 'Added to squad'),
        (TYPE_SQUAD_INVITE, 'Squad invitation'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    notification_type = models.CharField(max_length=40, choices=TYPE_CHOICES, db_index=True)
    title = models.CharField(max_length=120)
    message = models.TextField()
    related_entity_type = models.CharField(max_length=80, blank=True)
    related_entity_id = models.CharField(max_length=64, blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'Notifications'
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['user', 'created_at']),
        ]
        ordering = ['-created_at']


class Setting(AuditMixin):
    SCOPE_GLOBAL = 'global'
    SCOPE_USER = 'user'
    SCOPE_CHOICES = [
        (SCOPE_GLOBAL, 'Global'),
        (SCOPE_USER, 'User'),
    ]

    scope = models.CharField(max_length=20, choices=SCOPE_CHOICES, default=SCOPE_GLOBAL, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='settings',
    )
    key = models.CharField(max_length=100, db_index=True)
    value = models.TextField()

    class Meta:
        db_table = 'Settings'
        unique_together = ('scope', 'user', 'key')
        indexes = [models.Index(fields=['scope', 'key'])]


class StoredFile(AuditMixin):
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_files',
    )
    original_name = models.CharField(max_length=255)
    stored_name = models.CharField(max_length=255, unique=True)
    mime_type = models.CharField(max_length=120, blank=True)
    size_bytes = models.PositiveIntegerField(default=0)
    entity_type = models.CharField(max_length=80, blank=True, db_index=True)
    entity_id = models.CharField(max_length=64, blank=True, db_index=True)

    class Meta:
        db_table = 'Files'
        indexes = [models.Index(fields=['entity_type', 'entity_id'])]


class UserProfile(AuditMixin):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
    )
    bio = models.TextField(blank=True)
    avatar_file = models.ForeignKey(
        StoredFile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='profile_avatars',
    )
    preferred_position = models.CharField(max_length=50, blank=True)

    class Meta:
        db_table = 'UserProfiles'


class Venue(AuditMixin):
    name = models.CharField(max_length=120)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=80, blank=True)

    class Meta:
        db_table = 'Venues'

    def __str__(self):
        return self.name


class SquadInvitation(AuditMixin):
    STATUS_PENDING = 'pending'
    STATUS_ACCEPTED = 'accepted'
    STATUS_DECLINED = 'declined'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_ACCEPTED, 'Accepted'),
        (STATUS_DECLINED, 'Declined'),
    ]

    squad = models.ForeignKey('squads.Squad', on_delete=models.CASCADE, related_name='invitations')
    email = models.EmailField(db_index=True)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_squad_invitations',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, db_index=True)

    class Meta:
        db_table = 'SquadInvitations'
        unique_together = ('squad', 'email')
        indexes = [models.Index(fields=['email', 'status'])]


class NotificationPreference(AuditMixin):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_preferences',
    )
    email_enabled = models.BooleanField(default=True)
    in_app_enabled = models.BooleanField(default=True)
    match_added = models.BooleanField(default=True)
    squad_added = models.BooleanField(default=True)

    class Meta:
        db_table = 'NotificationPreferences'


class LoginHistory(AuditMixin):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='login_history',
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    succeeded = models.BooleanField(default=True)

    class Meta:
        db_table = 'LoginHistory'
        indexes = [
            models.Index(fields=['user', 'created_at']),
        ]


class MatchParticipant(AuditMixin):
    match = models.ForeignKey('matches.Match', on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='match_participations')
    team = models.ForeignKey('teams.Team', on_delete=models.CASCADE, related_name='participants')

    class Meta:
        db_table = 'MatchParticipants'
        unique_together = ('match', 'user')
        indexes = [
            models.Index(fields=['match']),
            models.Index(fields=['user']),
        ]

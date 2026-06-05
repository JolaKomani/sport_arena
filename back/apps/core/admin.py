from django.contrib import admin

from apps.core.models import (
    AuditLog,
    LoginHistory,
    MatchParticipant,
    Notification,
    NotificationPreference,
    Permission,
    RefreshToken,
    Role,
    RolePermission,
    Setting,
    SquadInvitation,
    StoredFile,
    UserProfile,
    UserRole,
    Venue,
)

AUDIT_READONLY = ('created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')
AUDIT_READONLY_SHORT = ('created_at', 'updated_at', 'deleted_at')


class RolePermissionInline(admin.TabularInline):
    model = RolePermission
    extra = 0
    autocomplete_fields = ('permission',)
    readonly_fields = AUDIT_READONLY


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'description', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = AUDIT_READONLY
    inlines = [RolePermissionInline]


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ('id', 'code', 'description', 'created_at')
    search_fields = ('code', 'description')
    readonly_fields = AUDIT_READONLY


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'role', 'created_at')
    list_filter = ('role', 'created_at')
    search_fields = ('user__email', 'role__name')
    autocomplete_fields = ('user', 'role', 'created_by', 'updated_by')
    readonly_fields = AUDIT_READONLY


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    list_display = ('id', 'role', 'permission', 'created_at')
    list_filter = ('role',)
    autocomplete_fields = ('role', 'permission', 'created_by', 'updated_by')
    readonly_fields = AUDIT_READONLY


@admin.register(RefreshToken)
class RefreshTokenAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'expires_at', 'revoked_at', 'is_active_display', 'created_at')
    list_filter = ('expires_at', 'revoked_at', 'created_at')
    search_fields = ('user__email', 'token')
    autocomplete_fields = ('user', 'created_by', 'updated_by')
    readonly_fields = (*AUDIT_READONLY, 'token')

    @admin.display(boolean=True, description='Active')
    def is_active_display(self, obj):
        return obj.is_active


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'action', 'entity_type', 'entity_id', 'user', 'ip_address', 'created_at')
    list_filter = ('action', 'entity_type', 'created_at')
    search_fields = ('entity_type', 'entity_id', 'user__email')
    autocomplete_fields = ('user',)
    readonly_fields = ('user', 'action', 'entity_type', 'entity_id', 'changes', 'ip_address', 'created_at')
    date_hierarchy = 'created_at'


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'notification_type', 'title', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('user__email', 'title', 'message')
    autocomplete_fields = ('user', 'created_by', 'updated_by')
    readonly_fields = (*AUDIT_READONLY, 'read_at')


@admin.register(Setting)
class SettingAdmin(admin.ModelAdmin):
    list_display = ('id', 'scope', 'user', 'key', 'value_preview', 'updated_at')
    list_filter = ('scope', 'key')
    search_fields = ('key', 'value', 'user__email')
    autocomplete_fields = ('user', 'created_by', 'updated_by')
    readonly_fields = AUDIT_READONLY

    @admin.display(description='Value')
    def value_preview(self, obj):
        text = obj.value or ''
        return text if len(text) <= 60 else f'{text[:60]}…'


@admin.register(StoredFile)
class StoredFileAdmin(admin.ModelAdmin):
    list_display = ('id', 'original_name', 'stored_name', 'mime_type', 'size_bytes', 'uploaded_by', 'created_at')
    list_filter = ('mime_type', 'entity_type', 'created_at')
    search_fields = ('original_name', 'stored_name', 'entity_type', 'entity_id')
    autocomplete_fields = ('uploaded_by', 'created_by', 'updated_by')
    readonly_fields = AUDIT_READONLY


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'preferred_position', 'avatar_file', 'updated_at')
    search_fields = ('user__email', 'user__first_name', 'bio')
    autocomplete_fields = ('user', 'avatar_file', 'created_by', 'updated_by')
    readonly_fields = AUDIT_READONLY


@admin.register(Venue)
class VenueAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'city', 'address', 'created_at')
    search_fields = ('name', 'city', 'address')
    readonly_fields = AUDIT_READONLY


@admin.register(SquadInvitation)
class SquadInvitationAdmin(admin.ModelAdmin):
    list_display = ('id', 'squad', 'email', 'status', 'invited_by', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('email', 'squad__name', 'invited_by__email')
    autocomplete_fields = ('squad', 'invited_by', 'created_by', 'updated_by')
    readonly_fields = AUDIT_READONLY


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'email_enabled',
        'in_app_enabled',
        'match_added',
        'squad_added',
        'updated_at',
    )
    list_filter = ('email_enabled', 'in_app_enabled', 'match_added', 'squad_added')
    autocomplete_fields = ('user', 'created_by', 'updated_by')
    readonly_fields = AUDIT_READONLY


@admin.register(LoginHistory)
class LoginHistoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'succeeded', 'ip_address', 'created_at')
    list_filter = ('succeeded', 'created_at')
    search_fields = ('user__email', 'ip_address', 'user_agent')
    autocomplete_fields = ('user', 'created_by', 'updated_by')
    readonly_fields = AUDIT_READONLY_SHORT


@admin.register(MatchParticipant)
class MatchParticipantAdmin(admin.ModelAdmin):
    list_display = ('id', 'match', 'user', 'team', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('match__location', 'user__email', 'team__name')
    autocomplete_fields = ('match', 'user', 'team', 'created_by', 'updated_by')
    readonly_fields = AUDIT_READONLY

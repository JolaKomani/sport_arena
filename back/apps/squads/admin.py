from django.contrib import admin

from apps.squads.models import Squad, SquadAdmin, SquadMember

AUDIT_READONLY = ('created_at', 'updated_at', 'deleted_at')


class SquadAdminInline(admin.TabularInline):
    model = SquadAdmin
    extra = 0
    autocomplete_fields = ('user',)
    readonly_fields = AUDIT_READONLY


class SquadMemberInline(admin.TabularInline):
    model = SquadMember
    extra = 0
    autocomplete_fields = ('user',)
    readonly_fields = AUDIT_READONLY


@admin.register(Squad)
class SquadAdminModelAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'is_public', 'admin_count', 'member_count', 'created_at')
    list_filter = ('is_public', 'created_at')
    search_fields = ('name',)
    readonly_fields = (*AUDIT_READONLY, 'created_by', 'updated_by')
    inlines = [SquadAdminInline, SquadMemberInline]

    @admin.display(description='Admins')
    def admin_count(self, obj):
        return obj.admins.count()

    @admin.display(description='Members')
    def member_count(self, obj):
        return obj.members.count()


@admin.register(SquadAdmin)
class SquadAdminMembershipAdmin(admin.ModelAdmin):
    list_display = ('id', 'squad', 'user', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('squad__name', 'user__email')
    autocomplete_fields = ('squad', 'user')
    readonly_fields = AUDIT_READONLY


@admin.register(SquadMember)
class SquadMemberAdmin(admin.ModelAdmin):
    list_display = ('id', 'squad', 'user', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('squad__name', 'user__email')
    autocomplete_fields = ('squad', 'user')
    readonly_fields = AUDIT_READONLY

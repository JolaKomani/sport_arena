from django.contrib import admin

from apps.teams.models import Team, TeamMember

AUDIT_READONLY = ('created_at', 'updated_at', 'deleted_at')


class TeamMemberInline(admin.TabularInline):
    model = TeamMember
    extra = 0
    autocomplete_fields = ('user',)
    readonly_fields = AUDIT_READONLY


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'score', 'member_count', 'created_at')
    search_fields = ('name',)
    list_filter = ('created_at',)
    readonly_fields = (*AUDIT_READONLY, 'created_by', 'updated_by')
    inlines = [TeamMemberInline]

    @admin.display(description='Members')
    def member_count(self, obj):
        return obj.members.count()


@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ('id', 'team', 'user', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('team__name', 'user__email', 'user__first_name', 'user__last_name')
    autocomplete_fields = ('team', 'user')
    readonly_fields = AUDIT_READONLY

from django.contrib import admin

from apps.matches.models import Match, MatchTeam

AUDIT_READONLY = ('created_at', 'updated_at', 'deleted_at')


class MatchTeamInline(admin.TabularInline):
    model = MatchTeam
    extra = 0
    autocomplete_fields = ('team',)
    readonly_fields = AUDIT_READONLY


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ('id', 'location', 'datetime', 'squad', 'team_count', 'created_at')
    list_filter = ('datetime', 'squad', 'created_at')
    search_fields = ('location', 'squad__name')
    autocomplete_fields = ('squad', 'created_by', 'updated_by')
    raw_id_fields = ('venue',)
    readonly_fields = (*AUDIT_READONLY, 'created_by', 'updated_by')
    date_hierarchy = 'datetime'
    inlines = [MatchTeamInline]

    @admin.display(description='Teams')
    def team_count(self, obj):
        return obj.teams.count()


@admin.register(MatchTeam)
class MatchTeamAdmin(admin.ModelAdmin):
    list_display = ('id', 'match', 'team', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('match__location', 'team__name')
    autocomplete_fields = ('match', 'team')
    readonly_fields = AUDIT_READONLY

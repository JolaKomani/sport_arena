from django.contrib import admin

from apps.ratings.models import Rating

AUDIT_READONLY = ('created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ('id', 'match', 'rater_user', 'rated_user', 'score', 'created_at')
    list_filter = ('score', 'created_at')
    search_fields = (
        'match__location',
        'rater_user__email',
        'rated_user__email',
        'rater_user__first_name',
        'rated_user__first_name',
    )
    autocomplete_fields = ('match', 'rater_user', 'rated_user', 'created_by', 'updated_by')
    readonly_fields = AUDIT_READONLY

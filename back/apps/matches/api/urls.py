from django.urls import path
from .views import (
    match_list_api,
    match_detail_api,
    match_create_api,
    match_update_api,
    match_delete_api,
    match_add_player_api,
    match_remove_player_api,
)

app_name = "matches_api"

urlpatterns = [
    path('', match_list_api, name='list'),
]


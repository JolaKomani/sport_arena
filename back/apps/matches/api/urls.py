from django.urls import path
from .export_views import match_export_api
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
    path('export/', match_export_api, name='export'),
    path('', match_list_api, name='list'),
    path('<int:pk>/', match_detail_api, name='detail'),
    path('create/', match_create_api, name='create'),
    path('update/', match_update_api, name='update'),
    path('delete/', match_delete_api, name='delete'),
    path('add-player/', match_add_player_api, name='add-player'),
    path('remove-player/', match_remove_player_api, name='remove-player'),
]


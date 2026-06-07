from django.urls import path

from .export_views import squad_export_api

from .views import (

    squad_list_api,

    squad_detail_api,

    squad_create_api,

    squad_update_api,

    squad_delete_api,

    squad_add_player_api,

    squad_remove_player_api,

    squad_players_api,

    squad_available_players_api,

    squad_invite_players_api,

)



app_name = "squads_api"



urlpatterns = [

    path('export/', squad_export_api, name='export'),

    path('', squad_list_api, name='list'),

    # Static paths before <int:pk>/ so they are never shadowed

    path('invite-players/', squad_invite_players_api, name='invite-players'),

    path('create/', squad_create_api, name='create'),

    path('update/', squad_update_api, name='update'),

    path('delete/', squad_delete_api, name='delete'),

    path('add-player/', squad_add_player_api, name='add-player'),

    path('remove-player/', squad_remove_player_api, name='remove-player'),

    path('<int:pk>/players/', squad_players_api, name='players'),

    path('<int:pk>/available-players/', squad_available_players_api, name='available-players'),

    path('<int:pk>/', squad_detail_api, name='detail'),

]



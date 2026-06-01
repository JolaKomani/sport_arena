from django.urls import path
from .views import (
    match_list_api,
    match_detail_api,
   match_create_api,
    match_update_api,
)

app_name = "matches_api"

urlpatterns = [
    path('', match_list_api, name='list'),
    path('<int:pk>/', match_detail_api, name='detail'),
    path('create/', match_create_api, name='create'),
    path('update/', match_update_api, name='update'),
]


from django.urls import path
from .views import (
    match_list_api,
   match_create_api,
)

app_name = "matches_api"

urlpatterns = [
    path('', match_list_api, name='list'),
    path('create/', match_create_api, name='create'),
]


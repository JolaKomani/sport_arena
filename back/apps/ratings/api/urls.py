from django.urls import path
from .views import (
    rating_list_api,
)

app_name = "ratings_api"

urlpatterns = [
    path('match/<int:match_pk>/', rating_list_api, name='list'),
]


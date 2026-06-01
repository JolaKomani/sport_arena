from django.urls import path
from .views import (
    rating_list_api,
    rating_detail_api,
    rating_create_api,
    rating_update_api,
)

app_name = "ratings_api"

urlpatterns = [
    path('match/<int:match_pk>/', rating_list_api, name='list'),
    path('<int:pk>/', rating_detail_api, name='detail'),
    path('create/', rating_create_api, name='create'),
    path('update/', rating_update_api, name='update'),
]


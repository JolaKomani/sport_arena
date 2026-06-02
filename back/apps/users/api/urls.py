from django.urls import path
from .views import (
    user_list_api,
    user_detail_api,
    user_create_api,
    user_update_api,
    user_delete_api,
    user_login_api,
    user_logout_api,
    user_me_api,
    user_avg_rating_api,
    user_performance_api,
    players_avg_ratings_api,
)

app_name = "users_api"

urlpatterns = [
    path('', user_list_api, name='list'),
    path('<int:pk>/', user_detail_api, name='detail'),

]

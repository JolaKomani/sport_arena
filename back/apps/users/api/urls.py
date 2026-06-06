from django.urls import path
from .auth_views import token_refresh_api, token_verify_api
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
    global_rankings_api,
    rankings_export_api,
)

app_name = "users_api"

urlpatterns = [
    path('', user_list_api, name='list'),
    path('<int:pk>/', user_detail_api, name='detail'),
    path('create/', user_create_api, name='create'),
    path('update/', user_update_api, name='update'),
    path('delete/', user_delete_api, name='delete'),
    path('login/', user_login_api, name='login'),
    path('token/refresh/', token_refresh_api, name='token-refresh'),
    path('token/verify/', token_verify_api, name='token-verify'),
    path('logout/', user_logout_api, name='logout'),
    path('me/', user_me_api, name='me'),
    path('avg-rating/', user_avg_rating_api, name='avg-rating'),
    path('performance/', user_performance_api, name='performance'),
    path('avg-ratings/', players_avg_ratings_api, name='avg-ratings'),
    path('rankings/export/', rankings_export_api, name='rankings-export'),
    path('rankings/', global_rankings_api, name='rankings'),
]

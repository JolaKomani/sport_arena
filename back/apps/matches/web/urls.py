from django.urls import path
from .views import match_list_view, match_create_view, match_detail_view, match_update_view

app_name = "matches_web"

urlpatterns = [
    path('', match_list_view, name='list'),
    path('create/', match_create_view, name='create'),
    path('<int:pk>/', match_detail_view, name='detail'),
    path('<int:pk>/update/', match_update_view, name='update'),
    path('<int:pk>/update', match_update_view, name='update-no-slash'),
]


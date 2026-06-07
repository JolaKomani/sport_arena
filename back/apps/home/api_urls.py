from django.urls import path

from apps.home.api_views import home_stats_api

urlpatterns = [
    path('', home_stats_api, name='stats'),
]

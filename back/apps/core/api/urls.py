from django.urls import path

from apps.core.api.views import (
    notification_delete_api,
    notification_list_api,
    notification_mark_read_api,
)

urlpatterns = [
    path('', notification_list_api, name='list'),
    path('mark-read/', notification_mark_read_api, name='mark-read'),
    path('delete/', notification_delete_api, name='delete'),
]

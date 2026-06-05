from django.urls import path

from apps.core.api.report_views import report_export_api, report_preview_api

urlpatterns = [
    path('preview/', report_preview_api, name='preview'),
    path('export/', report_export_api, name='export'),
]

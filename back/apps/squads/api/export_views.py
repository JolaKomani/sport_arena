from django.views.decorators.csrf import csrf_exempt

from apps.core.auth import jwt_optional
from apps.core.services.data_export import build_export_response
from apps.core.services.export_collectors import SQUAD_EXPORT_HEADERS, collect_squad_export_rows


@csrf_exempt
@jwt_optional
def squad_export_api(request):
    if request.method != 'GET':
        from django.http import HttpResponse
        return HttpResponse('Method not allowed', status=405)

    fmt = request.GET.get('format', 'csv')
    rows = collect_squad_export_rows(request)
    return build_export_response('squads', fmt, SQUAD_EXPORT_HEADERS, rows)

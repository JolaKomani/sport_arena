from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

from apps.core.auth import jwt_optional
from apps.core.services.data_export import build_export_response
from apps.core.services.export_collectors import MATCH_EXPORT_HEADERS, collect_match_export_rows
from apps.squads.permissions import can_view_squad_matches


@csrf_exempt
@jwt_optional
@can_view_squad_matches
def match_export_api(request):
    if request.method != 'GET':
        return HttpResponse('Method not allowed', status=405)

    rows, error = collect_match_export_rows(request)
    if error:
        return HttpResponse(error, status=400)

    fmt = request.GET.get('format', 'csv')
    squad_id = request.GET.get('squad_id', 'matches')
    return build_export_response(f'squad_{squad_id}_matches', fmt, MATCH_EXPORT_HEADERS, rows)

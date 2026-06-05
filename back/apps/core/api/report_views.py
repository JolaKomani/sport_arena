import json

from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from apps.core.auth import jwt_required
from apps.core.services.data_export import build_export_response
from apps.core.services.report_generation import generate_report
from apps.squads.repositories import squad_repository


@csrf_exempt
@jwt_required
def report_preview_api(request):
    if request.method != 'GET':
        return HttpResponse('Method not allowed', status=405)

    report_type = (request.GET.get('report_type') or '').strip().lower()
    squad_id = request.GET.get('squad_id')

    if report_type in ('squad_activity',) and squad_id:
        try:
            squad = squad_repository.get_by_id(int(squad_id))
        except (ValueError, TypeError):
            return HttpResponse('Invalid squad_id', status=400)
        if not squad:
            return HttpResponse('Squad not found', status=404)
        if not squad_repository.user_can_view(squad, request.user):
            return HttpResponse('Access denied', status=403)

    data, error = generate_report(request)
    if error:
        return HttpResponse(error, status=400)

    return JsonResponse(data)


@csrf_exempt
@jwt_required
def report_export_api(request):
    if request.method != 'GET':
        return HttpResponse('Method not allowed', status=405)

    fmt = request.GET.get('format', 'csv')
    data, error = generate_report(request)
    if error:
        return HttpResponse(error, status=400)

    meta = data.get('meta', {})
    headers = data.get('export_headers', [])
    rows = data.get('rows', [])
    slug = meta.get('report_type', 'report')
    filename = f'report_{slug}'

    return build_export_response(
        filename,
        fmt,
        headers,
        rows,
        title=meta.get('title'),
    )

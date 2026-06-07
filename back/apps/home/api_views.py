import json

from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

from apps.core.services.home_stats import build_home_payload


@csrf_exempt
def home_stats_api(request):
    if request.method != 'GET':
        return HttpResponse('Method not allowed', status=405)

    return HttpResponse(
        json.dumps(build_home_payload()),
        content_type='application/json',
    )

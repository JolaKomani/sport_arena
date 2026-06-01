import json

from datetime import datetime

from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

from apps.matches.serializers import serialize_matches, serialize_match
from apps.teams.models import Team
from apps.matches.models import Match
from apps.users.models import User
from apps.squads.models import Squad
from apps.squads.permissions import can_view_squad_matches, can_modify_squad_matches


@can_view_squad_matches
def match_list_api(request):
    squad_id = request.GET.get('squad_id')
    
    if not squad_id:
        return HttpResponse("squad_id parameter is required", status=400)
    
    try:
        squad_id = int(squad_id)
    except (ValueError, TypeError):
        return HttpResponse("Invalid squad_id parameter", status=400)
    
    squad = Squad.objects.filter(id=squad_id).first()
    if not squad:
        return HttpResponse("Squad not found", status=404)
    
    matches = Match.objects.filter(squad_id=squad_id).order_by('-datetime')
    matches_list = serialize_matches(matches)
    return HttpResponse(json.dumps(matches_list), content_type="application/json")

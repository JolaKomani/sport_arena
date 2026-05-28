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


@csrf_exempt
def match_detail_api(request, pk):
    match = Match.objects.filter(id=pk).first()
    if not match:
        return HttpResponse("Match not found", status=404)

    # Check access: public squads or user is admin/member
    squad = match.squad
    if squad:
        user = request.user
        if not squad.is_public:
            if not user.is_authenticated:
                return HttpResponse("Authentication required", status=401)
            if user not in squad.admins.all() and user not in squad.members.all():
                return HttpResponse("Access denied", status=403)

    match_data = serialize_match(match)

    return HttpResponse(json.dumps(match_data), content_type="application/json")

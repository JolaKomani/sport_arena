import json

from datetime import datetime

from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

from apps.core.auth import jwt_optional, permission_required
from apps.core.services.advanced_search import (
    apply_match_search,
    match_search_meta,
    parse_match_search_params,
)
from apps.core.services.audit import log_audit
from apps.core.services.match_participants import sync_match_participants
from apps.core.models import AuditLog
from apps.core.repositories.match_participant_repository import match_participant_repository
from apps.core.services.notifications import notify_match_players, notify_users_added_to_match
from apps.core.utils import stamp_audit
from apps.matches.serializers import serialize_matches, serialize_match
from apps.matches.models import Match
from apps.matches.repositories import match_repository
from apps.squads.repositories import squad_repository
from apps.teams.models import Team
from apps.teams.repositories import team_repository
from apps.users.repositories import user_repository
from apps.squads.permissions import can_view_squad_matches, can_modify_squad_matches


@csrf_exempt
@jwt_optional
@can_view_squad_matches
def match_list_api(request):
    squad_id = request.GET.get('squad_id')
    
    if not squad_id:
        return HttpResponse("squad_id parameter is required", status=400)
    
    try:
        squad_id = int(squad_id)
    except (ValueError, TypeError):
        return HttpResponse("Invalid squad_id parameter", status=400)
    
    squad = squad_repository.get_by_id(squad_id)
    if not squad:
        return HttpResponse("Squad not found", status=404)
    
    params = parse_match_search_params(request)
    matches = match_repository.list_by_squad_id(squad_id)
    matches = apply_match_search(matches, params)

    matches_list = serialize_matches(matches)
    payload = {
        'matches': matches_list,
        'meta': match_search_meta(params, len(matches_list)),
    }
    return HttpResponse(json.dumps(payload), content_type="application/json")


@csrf_exempt
@jwt_optional
def match_detail_api(request, pk):
    match = match_repository.get_by_id(pk)
    if not match:
        return HttpResponse("Match not found", status=404)
    
    # Check access: public squads or user is admin/member
    squad = match.squad
    if squad:
        user = request.user
        if not squad.is_public:
            if not user.is_authenticated:
                return HttpResponse("Authentication required", status=401)
            if not squad_repository.is_admin(squad, user) and not squad_repository.is_member(squad, user):
                return HttpResponse("Access denied", status=403)

    match_data = serialize_match(match)

    return HttpResponse(json.dumps(match_data), content_type="application/json")


@csrf_exempt
@permission_required('matches.create')
@can_modify_squad_matches
def match_create_api(request):
    data = json.loads(request.body)

    location = data.get('location')
    datetime_str = data.get('datetime')
    teams = data.get('teams', [])
    squad_id = data.get('squad_id')

    if not all((location, datetime_str, teams, squad_id)):
        return HttpResponse("location, datetime, teams and squad_id are required")

    if len(teams) != 2:
        return HttpResponse("There should be exactly two teams", status=400)

    squad = squad_repository.get_by_id(squad_id)
    if not squad:
        return HttpResponse("squad not found")

    dt = datetime.strptime(datetime_str, "%Y-%m-%dT%H:%M")

    match = Match(
        location=location,
        datetime=dt,
        squad=squad,
    )
    stamp_audit(match, request.user)
    match_repository.save(match)

    used_player_ids = set()

    for team in teams:
        name = team.get('name')
        members = team.get('members_ids', [])
        score = team.get('score')

        for player_id in members:
            if player_id in used_player_ids:
                return HttpResponse("Same player cannot be in more than one team of the same match")

        used_player_ids.update(members)

        users = user_repository.filter_by_ids(members)

        team_obj = Team(name=name)
        stamp_audit(team_obj, request.user)
        if score is not None:
            team_obj.score = int(score)
        team_repository.save(team_obj)
        team_repository.add_members(team_obj, users)
        match_repository.add_team(match, team_obj)

    sync_match_participants(match, actor=request.user)
    notify_match_players(match, actor=request.user)
    log_audit(
        request,
        AuditLog.ACTION_CREATE,
        'match',
        match.id,
        {'location': location, 'squad_id': squad_id},
    )

    return HttpResponse("Match created successfully")


@csrf_exempt
@permission_required('matches.modify')
@can_modify_squad_matches
def match_update_api(request):
    data = json.loads(request.body)

    match_id = data.get("match_id")
    if not match_id:
        return HttpResponse("match_id is required", status=400)

    match = match_repository.get_by_id(match_id)
    if not match:
        return HttpResponse("Match not found", status=404)

    location = data.get("location")
    datetime_str = data.get("datetime")

    if location:
        match.location = location
    if datetime_str:
        match.datetime = datetime.strptime(datetime_str, "%Y-%m-%dT%H:%M")

    stamp_audit(match, request.user)
    match_repository.save(match)

    teams = data.get("teams", [])

    for team_data in teams:
        team = team_repository.get_by_id_or_raise(team_data['id'])
        name = team_data.get('name')
        team.name = name
        score = team_data.get('score')
        if score is not None:
            team.score = int(score) if score != '' else None
        else:
            team.score = None
        team_repository.save(team)
        players = team_data.get('player_ids', [])
        players = user_repository.filter_by_ids(players)
        team_repository.set_members(team, players)

    old_player_ids = set(match_participant_repository.list_user_ids_for_match(match))
    sync_match_participants(match, actor=request.user)
    new_player_ids = set(match_participant_repository.list_user_ids_for_match(match))
    added_ids = new_player_ids - old_player_ids
    notify_users_added_to_match(match, added_ids, actor=request.user)
    log_audit(request, AuditLog.ACTION_UPDATE, 'match', match.id)

    return HttpResponse(f"Match {match.id} updated successfully")


@csrf_exempt
@permission_required('matches.modify')
@can_modify_squad_matches
def match_delete_api(request):
    data = json.loads(request.body)
    match_id = data.get("match_id")

    if not match_id:
        return HttpResponse("match_id is required", status=400)

    match = match_repository.get_by_id(match_id)
    if not match:
        return HttpResponse("Match not found", status=404)

    match_id = match.id
    match_repository.delete(match)
    log_audit(request, AuditLog.ACTION_DELETE, 'match', match_id)

    return HttpResponse("Match deleted successfully")


@csrf_exempt
@permission_required('matches.modify')
def match_add_player_api(request):
    data = json.loads(request.body)

    match_id = data.get('match_id')
    user_id = data.get('user_id')

    if not all((match_id, user_id)):
        return HttpResponse("match_id, user_id are required", status=400)

    match = match_repository.get_by_id(match_id)
    if not match:
        return HttpResponse("Match not found", status=404)

    user = user_repository.get_by_id(user_id)
    if not user:
        return HttpResponse("User not found", status=404)

    match_repository.add_player(match, user)
    match_repository.save(match)

    return HttpResponse("user created successfully")


@csrf_exempt
@permission_required('matches.modify')
def match_remove_player_api(request):
    data = json.loads(request.body)

    match_id = data.get('match_id')
    user_id = data.get('user_id')

    if not all((match_id, user_id)):
        return HttpResponse("match_id, user_id are required", status=400)

    match = match_repository.get_by_id(match_id)
    if not match:
        return HttpResponse("Match not found", status=404)

    user = user_repository.get_by_id(user_id)
    if not user:
        return HttpResponse("User not found", status=404)

    match_repository.remove_player(match, user)
    match_repository.save(match)

    return HttpResponse("user removed successfully")



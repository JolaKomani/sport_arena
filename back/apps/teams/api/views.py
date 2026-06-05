import json

from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from apps.core.auth import jwt_required, role_required
from apps.teams.models import Team
from apps.teams.repositories import team_repository
from apps.users.repositories import user_repository


@csrf_exempt
@jwt_required
def team_list_api(request):
    teams_list = []
    for team in team_repository.list_all():
        teams_list.append({
            'id': team.id,
            'name': team.name,
        })

    return JsonResponse({"teams": teams_list})


@csrf_exempt
@jwt_required
def team_detail_api(request, pk):
    team = team_repository.get_by_pk(pk)
    if not team:
        return HttpResponse("teams not found", status=404)

    teams_data = {
        'id': team.id,
        'name': team.name,
        'members': [user.full_name for user in team.members.all()],
    }

    return JsonResponse({"teams": teams_data})


@csrf_exempt
@role_required('admin')
def team_create_api(request):
    data = json.loads(request.body)
    name = data.get('name')
    if not name:
        return HttpResponse("name is required")
    team_repository.create(name=name)
    return HttpResponse('Team Created')


@csrf_exempt
@role_required('admin')
def team_update_api(request):
    data = json.loads(request.body)

    team_id = data.get('team_id')
    if not team_id:
        return HttpResponse("team id is required")

    team = team_repository.get_by_pk(team_id)
    if not team:
        return HttpResponse("team not found")

    name = data.get('name')
    members = data.get('members')

    if name:
        team.name = name
    if members:
        users = user_repository.filter_by_ids(members)
        team_repository.set_members(team, users)

    team_repository.save(team)

    return HttpResponse('Team Updated Successfully')


@csrf_exempt
@role_required('admin')
def team_delete_api(request):
    data = json.loads(request.body)
    team_id = data.get('team_id')
    if not team_id:
        return HttpResponse("team id is required")

    team = team_repository.get_by_pk(team_id)
    if not team:
        return HttpResponse("team not found")

    team_repository.delete(team)

    return HttpResponse('Team Deleted Successfully')


@csrf_exempt
@jwt_required
def team_matches_api(request, pk):
    team = team_repository.get_by_id(pk)
    if not team:
        return HttpResponse("Team not found", status=404)

    matches = team.matches.all()
    matches_list = []

    for match in matches:
        matches_list.append({
            'id': match.id,
            'location': match.location,
            'date': str(match.datetime.date()) if match.datetime else '',
            'time': str(match.datetime.time()) if match.datetime else '',
        })

    return JsonResponse({'matches': matches_list})


@csrf_exempt
@role_required('admin')
def team_add_player_api(request):
    data = json.loads(request.body)

    team_id = data.get('team_id')
    user_id = data.get('user_id')

    if not all((team_id, user_id)):
        return HttpResponse("Team ID and User ID are required")

    team = team_repository.get_by_id(team_id)
    if not team:
        return HttpResponse("Team not found")

    user = user_repository.get_by_id(user_id)
    if not user:
        return HttpResponse("User not found")

    team_repository.add_members(team, [user])
    team_repository.save(team)

    return HttpResponse('Player Created')


@csrf_exempt
@role_required('admin')
def team_remove_player_api(request):
    data = json.loads(request.body)

    team_id = data.get('team_id')
    user_id = data.get('user_id')

    if not all((team_id, user_id)):
        return HttpResponse("Team ID and User ID are required")

    team = team_repository.get_by_id(team_id)
    if not team:
        return HttpResponse("Team not found")

    user = user_repository.get_by_id(user_id)
    if not user:
        return HttpResponse("User not found")

    team.members.remove(user)
    team_repository.save(team)

    return HttpResponse('Player Removed')

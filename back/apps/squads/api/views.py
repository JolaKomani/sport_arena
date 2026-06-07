import json

from django.db.models import Q
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

from apps.core.auth import jwt_optional, jwt_required, permission_required
from apps.core.models import AuditLog
from apps.core.services.audit import log_audit
from apps.core.services.notifications import notify_squad_members_added
from apps.core.services.rbac import ensure_admin_role
from apps.core.utils import stamp_audit
from apps.core.services.advanced_search import (
    apply_squad_search,
    parse_squad_search_params,
    squad_search_meta,
)
from apps.squads.serializers import serialize_squad, serialize_squads
from apps.squads.models import Squad
from apps.squads.permissions import can_view_squad, can_modify_squad
from apps.squads.repositories import squad_repository
from apps.users.repositories import user_repository


@csrf_exempt
@jwt_optional
def squad_list_api(request):
    params = parse_squad_search_params(request)

    user = request.user
    admin_squads = squad_repository.filter_admin_squads(user)
    my_squads = Squad.objects.none()
    public_squads = Squad.objects.none()
    other_squads = Squad.objects.none()

    if user.is_authenticated:
        my_squads = Squad.objects.filter(Q(admins=user) | Q(members=user)).distinct()
        public_squads = squad_repository.filter_public_excluding_user(user)
    else:
        public_squads = squad_repository.filter_public()

    if user.is_superuser:
        other_squads = squad_repository.filter_other_for_superuser(user)

    my_squads = apply_squad_search(my_squads, params)
    public_squads = apply_squad_search(public_squads, params)
    if other_squads is not None and hasattr(other_squads, 'exists'):
        other_squads = apply_squad_search(other_squads, params)

    my_squads_data = serialize_squads(my_squads)
    admin_ids = set(admin_squads.values_list('id', flat=True))

    squads = {
        'my_squads': my_squads_data,
        'admin_squad_ids': list(admin_ids),
        'user_squads': [s for s in my_squads_data if s['id'] in admin_ids],
        'member_squads': [s for s in my_squads_data if s['id'] not in admin_ids],
    }

    if public_squads.exists():
        squads['public_squads'] = serialize_squads(public_squads)

    if user.is_superuser and other_squads.exists():
        squads['other_squads'] = serialize_squads(other_squads)

    counts = {
        'my_squads': len(my_squads_data),
        'public_squads': len(squads.get('public_squads', [])),
        'other_squads': len(squads.get('other_squads', [])),
    }
    squads['meta'] = squad_search_meta(params, counts)

    return HttpResponse(json.dumps(squads), content_type="application/json")


@csrf_exempt
@jwt_optional
@can_view_squad
def squad_detail_api(request, pk):
    squad = squad_repository.get_by_pk(pk)
    if not squad:
        return HttpResponse("Squad not found", status=404)

    squad_data = serialize_squad(squad)
    return HttpResponse(json.dumps(squad_data), content_type="application/json")


@csrf_exempt
@jwt_required
@permission_required('squads.create')
def squad_invite_players_api(request):
    """All active users the creator can add when creating a squad."""
    if request.method != 'GET':
        return HttpResponse('Method not allowed', status=405)

    users = (
        user_repository.list_active_not_deleted()
        .exclude(id=request.user.id)
        .order_by('first_name', 'last_name')
    )
    payload = [
        {
            'id': u.id,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'email': u.email,
            'name': u.full_name,
        }
        for u in users
    ]
    return HttpResponse(json.dumps(payload), content_type='application/json')


@csrf_exempt
@permission_required('squads.create')
def squad_create_api(request):
    data = json.loads(request.body)
    name = data.get('name')
    members_emails = data.get('members_emails', [])
    member_ids = data.get('member_ids', [])
    is_public = data.get('is_public', False)

    if not name:
        return HttpResponse("Name is required", status=400)

    if squad_repository.exists_by_name(name):
        return HttpResponse("Squad already exists", status=400)

    squad = Squad(name=name, is_public=is_public)
    stamp_audit(squad, request.user)
    squad_repository.save(squad)

    squad_repository.add_admin(squad, request.user)
    ensure_admin_role(request.user, actor=request.user)

    users = []
    if member_ids:
        try:
            ids = [int(uid) for uid in member_ids]
        except (TypeError, ValueError):
            return HttpResponse('Invalid member_ids', status=400)
        users = user_repository.filter_by_ids(ids)
        users = [u for u in users if u.id != request.user.id]
    elif members_emails:
        users = user_repository.filter_by_emails(members_emails)
    if users:
        squad_repository.add_members(squad, users)
        notify_squad_members_added(squad, users, actor=request.user)

    log_audit(
        request,
        AuditLog.ACTION_CREATE,
        'squad',
        squad.id,
        {'name': name, 'is_public': is_public},
    )

    squad_data = serialize_squad(squad)
    return HttpResponse(json.dumps(squad_data), content_type="application/json")


@csrf_exempt
@permission_required('squads.modify')
@can_modify_squad
def squad_update_api(request):
    data = json.loads(request.body)

    squad_id = data.get('squad_id')
    if not squad_id:
        return HttpResponse("Squad id is required", status=400)

    squad = squad_repository.get_by_id(squad_id)
    if not squad:
        return HttpResponse("Squad not found", status=404)

    name = data.get('name')
    players = data.get('players')
    player_ids = data.get('player_ids')
    is_public = data.get('is_public')

    if name:
        squad.name = name
    added_users = []
    existing_ids = set(squad_repository.member_ids(squad))
    users_to_add = []
    if player_ids:
        try:
            ids = [int(uid) for uid in player_ids]
        except (TypeError, ValueError):
            return HttpResponse('Invalid player_ids', status=400)
        users_to_add = user_repository.filter_by_ids(ids)
    elif players:
        users_to_add = user_repository.filter_by_emails(players)
    if users_to_add:
        squad_repository.add_members(squad, users_to_add)
        added_users = [u for u in users_to_add if u.id not in existing_ids]
        if added_users:
            notify_squad_members_added(squad, added_users, actor=request.user)
    if is_public is not None:
        squad.is_public = is_public

    stamp_audit(squad, request.user)
    squad_repository.save(squad)
    log_audit(request, AuditLog.ACTION_UPDATE, 'squad', squad.id)

    return HttpResponse("Squad updated successfully")


@csrf_exempt
@permission_required('squads.modify')
@can_modify_squad
def squad_delete_api(request):
    data = json.loads(request.body)

    squad_id = data.get('squad_id')
    if not squad_id:
        return HttpResponse("Squad id is required", status=400)

    squad = squad_repository.get_by_id(squad_id)
    if not squad:
        return HttpResponse("Squad not found", status=404)

    squad_id = squad.id
    squad_repository.delete(squad)
    log_audit(request, AuditLog.ACTION_DELETE, 'squad', squad_id)
    return HttpResponse("Squad deleted successfully")


@csrf_exempt
@permission_required('squads.modify')
@can_modify_squad
def squad_add_player_api(request):
    data = json.loads(request.body)

    squad_id = data.get('squad_id')
    user_id = data.get('user_id')

    if not all((squad_id, user_id)):
        return HttpResponse("squad_id, user_id are required", status=400)

    squad = squad_repository.get_by_id(squad_id)
    if not squad:
        return HttpResponse("Squad not found", status=404)

    user = user_repository.get_by_id(user_id)
    if not user:
        return HttpResponse("User not found", status=404)

    if not squad_repository.is_member(squad, user):
        squad_repository.add_members(squad, [user])
        notify_squad_members_added(squad, [user], actor=request.user)
    squad_repository.save(squad)
    log_audit(request, AuditLog.ACTION_UPDATE, 'squad', squad.id, {'added_user_id': user.id})

    return HttpResponse("Squad was added successfully")


@csrf_exempt
@permission_required('squads.modify')
@can_modify_squad
def squad_remove_player_api(request):
    data = json.loads(request.body)
    squad_id = data.get('squad_id')
    user_id = data.get('user_id')

    if not all((squad_id, user_id)):
        return HttpResponse("squad_id, user_id are required", status=400)

    squad = squad_repository.get_by_id(squad_id)
    if not squad:
        return HttpResponse("Squad not found", status=404)

    user = user_repository.get_by_id(user_id)
    if not user:
        return HttpResponse("User not found", status=404)

    squad_repository.remove_member(squad, user)
    squad_repository.save(squad)

    return HttpResponse("Squad removed successfully")


@csrf_exempt
@jwt_optional
@can_view_squad
def squad_players_api(request, pk):
    squad = squad_repository.get_by_pk(pk)
    if not squad:
        return HttpResponse("Squad not found", status=404)

    players_data = [{"id": p.id, "name": p.full_name} for p in squad.members.all()]
    return HttpResponse(json.dumps(players_data), content_type="application/json")


@csrf_exempt
@jwt_required
@can_modify_squad
def squad_available_players_api(request, pk):
    """Users that can be added to this squad (for squad admin picker)."""
    if request.method != 'GET':
        return HttpResponse('Method not allowed', status=405)

    squad = squad_repository.get_by_pk(pk)
    if not squad:
        return HttpResponse('Squad not found', status=404)

    member_ids = squad_repository.member_ids(squad)
    admin_ids = set(squad.admins.values_list('id', flat=True))
    exclude_ids = member_ids | admin_ids

    users = user_repository.list_active_not_deleted().exclude(id__in=exclude_ids).order_by(
        'first_name',
        'last_name',
    )
    payload = [
        {
            'id': u.id,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'email': u.email,
            'name': u.full_name,
        }
        for u in users
    ]
    return HttpResponse(json.dumps(payload), content_type='application/json')

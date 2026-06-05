import json

from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from apps.core.auth import permission_required
from apps.core.repositories.notification_repository import notification_repository
from apps.core.services.notifications import (
    delete_notification,
    mark_notification_read,
    unread_count,
)


def _serialize_notification(notification):
    return {
        'id': notification.id,
        'type': notification.notification_type,
        'title': notification.title,
        'message': notification.message,
        'is_read': notification.is_read,
        'created_at': notification.created_at.isoformat(),
        'related_entity_type': notification.related_entity_type,
        'related_entity_id': notification.related_entity_id,
    }


@csrf_exempt
@permission_required('notifications.view')
def notification_list_api(request):
    limit = 50
    try:
        limit = min(int(request.GET.get('limit', 50)), 100)
    except (TypeError, ValueError):
        pass

    notifications = notification_repository.list_for_user(request.user, limit=limit)

    payload = {
        'unread_count': unread_count(request.user),
        'notifications': [_serialize_notification(n) for n in notifications],
        'storage': notification_repository.storage,
    }
    return JsonResponse(payload)


@csrf_exempt
@permission_required('notifications.view')
def notification_mark_read_api(request):
    if request.method != 'POST':
        return HttpResponse('Method not allowed', status=405)

    data = json.loads(request.body or '{}')
    notification_id = data.get('notification_id')
    mark_all = data.get('mark_all', False)

    if mark_all:
        notification_repository.mark_all_read(request.user)
        from apps.core.services.realtime import push_unread_count

        push_unread_count(request.user.id, count=0)
        return HttpResponse('All notifications marked as read')

    if not notification_id:
        return HttpResponse('notification_id is required', status=400)

    notification = notification_repository.get_for_user(notification_id, request.user)
    if not notification:
        return HttpResponse('Notification not found', status=404)

    mark_notification_read(notification, request.user)
    return HttpResponse('Notification marked as read')


@csrf_exempt
@permission_required('notifications.view')
def notification_delete_api(request):
    if request.method != 'POST':
        return HttpResponse('Method not allowed', status=405)

    data = json.loads(request.body or '{}')
    notification_id = data.get('notification_id')
    if not notification_id:
        return HttpResponse('notification_id is required', status=400)

    if not delete_notification(notification_id, request.user):
        return HttpResponse('Notification not found', status=404)

    return HttpResponse('Notification deleted')

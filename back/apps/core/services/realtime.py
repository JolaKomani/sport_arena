from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from apps.core.services.notifications import unread_count
from apps.core.ws_registry import push_to_user


def _user_group(user_id):
    return f'notifications_{user_id}'


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


def _send_to_user(user_id, payload):
    if push_to_user(user_id, payload):
        return

    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    async_to_sync(channel_layer.group_send)(
        _user_group(user_id),
        {
            'type': 'notify.message',
            'payload': payload,
        },
    )


def push_notification_created(user, notification):
    count = unread_count(user)
    _send_to_user(
        user.id,
        {
            'event': 'notification.created',
            'notification': _serialize_notification(notification),
            'unread_count': count,
        },
    )


def push_unread_count(user_id, count=None):
    if count is None:
        from apps.users.repositories import user_repository

        user = user_repository.get_by_id(user_id)
        if not user:
            return
        count = unread_count(user)
    _send_to_user(
        user_id,
        {
            'event': 'notification.unread_count',
            'unread_count': count,
        },
    )

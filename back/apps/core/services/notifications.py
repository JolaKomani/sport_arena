from django.utils import timezone

from apps.core.models import Notification
from apps.core.repositories.notification_preference_repository import notification_preference_repository
from apps.core.repositories.notification_repository import notification_repository


def _preferences_enabled(user, notification_type):
    prefs, _ = notification_preference_repository.get_or_create_for_user(user=user)
    if not prefs.in_app_enabled:
        return False
    if notification_type == Notification.TYPE_MATCH_ADDED:
        return prefs.match_added
    if notification_type in (Notification.TYPE_SQUAD_ADDED, Notification.TYPE_SQUAD_INVITE):
        return prefs.squad_added
    return True


def create_notification(user, notification_type, title, message, related_entity_type='', related_entity_id='', actor=None):
    if not _preferences_enabled(user, notification_type):
        return None

    notification = notification_repository.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
        related_entity_type=related_entity_type,
        related_entity_id=str(related_entity_id) if related_entity_id else '',
        created_by=actor,
        updated_by=actor,
    )

    if notification:
        from apps.core.services.realtime import push_notification_created

        push_notification_created(user, notification)

    return notification


def notify_users_added_to_match(match, user_ids, actor):
    """Notify specific users they were added to a match (with WebSocket push)."""
    squad_name = match.squad.name if match.squad_id else 'your squad'
    when = match.datetime.strftime('%Y-%m-%d %H:%M')

    for user_id in user_ids:
        if actor and user_id == actor.id:
            continue
        from apps.users.repositories import user_repository

        user = user_repository.get_by_id(user_id)
        if not user:
            continue
        create_notification(
            user=user,
            notification_type=Notification.TYPE_MATCH_ADDED,
            title='Added to match',
            message=f'You were added to a match at {match.location} ({when}) in squad "{squad_name}".',
            related_entity_type='match',
            related_entity_id=match.id,
            actor=actor,
        )


def notify_match_players(match, actor, exclude_user_ids=None):
    exclude = set(exclude_user_ids or [])
    if actor:
        exclude.add(actor.id)

    squad_name = match.squad.name if match.squad_id else 'your squad'
    when = match.datetime.strftime('%Y-%m-%d %H:%M')

    for participant in match.participants.select_related('user').all():
        user = participant.user
        if user.id in exclude:
            continue
        create_notification(
            user=user,
            notification_type=Notification.TYPE_MATCH_ADDED,
            title='New match scheduled',
            message=f'You were added to a match at {match.location} ({when}) in squad "{squad_name}".',
            related_entity_type='match',
            related_entity_id=match.id,
            actor=actor,
        )


def notify_squad_members_added(squad, users, actor):
    for user in users:
        if actor and user.id == actor.id:
            continue
        create_notification(
            user=user,
            notification_type=Notification.TYPE_SQUAD_ADDED,
            title='Added to squad',
            message=f'You were added to squad "{squad.name}".',
            related_entity_type='squad',
            related_entity_id=squad.id,
            actor=actor,
        )


def mark_notification_read(notification, user):
    if notification.user_id != user.id:
        return False
    if notification.is_read:
        return True
    notification.is_read = True
    notification.read_at = timezone.now()
    notification_repository.save(notification)

    from apps.core.services.realtime import push_unread_count

    push_unread_count(user.id)
    return True


def delete_notification(notification_id, user):
    notification = notification_repository.get_for_user(notification_id, user)
    if not notification:
        return False
    was_unread = not notification.is_read
    if not notification_repository.delete_for_user(notification_id, user):
        return False
    if was_unread:
        from apps.core.services.realtime import push_unread_count

        push_unread_count(user.id)
    return True


def unread_count(user):
    return notification_repository.unread_count(user)

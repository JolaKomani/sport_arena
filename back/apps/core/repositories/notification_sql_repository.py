from django.utils import timezone

from apps.core.models import Notification
from apps.core.notification_record import NotificationRecord


class NotificationSqlRepository:
    def create(self, **kwargs):
        notification = Notification.objects.create(**kwargs)
        return NotificationRecord.from_django(notification)

    def list_for_user(self, user, limit=50):
        qs = Notification.objects.filter(
            user=user,
            deleted_at__isnull=True,
        ).order_by('-created_at')[:limit]
        return [NotificationRecord.from_django(n) for n in qs]

    def get_for_user(self, notification_id, user):
        try:
            pk = int(notification_id)
        except (TypeError, ValueError):
            return None
        notification = Notification.objects.filter(
            id=pk,
            user=user,
            deleted_at__isnull=True,
        ).first()
        return NotificationRecord.from_django(notification) if notification else None

    def delete_for_user(self, notification_id, user):
        try:
            pk = int(notification_id)
        except (TypeError, ValueError):
            return False
        now = timezone.now()
        updated = Notification.objects.filter(
            id=pk,
            user=user,
            deleted_at__isnull=True,
        ).update(deleted_at=now, updated_at=now)
        return updated > 0

    def mark_all_read(self, user):
        return Notification.objects.filter(user=user, is_read=False).update(
            is_read=True,
            read_at=timezone.now(),
        )

    def unread_count(self, user):
        return Notification.objects.filter(
            user=user,
            is_read=False,
            deleted_at__isnull=True,
        ).count()

    def save(self, notification):
        try:
            pk = int(notification.id)
        except (TypeError, ValueError):
            return notification
        row = Notification.objects.filter(id=pk, user_id=notification.user_id).first()
        if not row:
            return notification
        row.is_read = notification.is_read
        row.read_at = notification.read_at
        row.save(update_fields=['is_read', 'read_at', 'updated_at'])
        return NotificationRecord.from_django(row)


sql_notification_repository = NotificationSqlRepository()

import logging

from apps.core.mongo import is_mongo_enabled
from apps.core.repositories.notification_mongo_repository import mongo_notification_repository
from apps.core.repositories.notification_sql_repository import sql_notification_repository

logger = logging.getLogger(__name__)


class NotificationRepository:
    def _read_backend(self):
        if is_mongo_enabled():
            return mongo_notification_repository
        return sql_notification_repository

    def create(self, **kwargs):
        if is_mongo_enabled():
            try:
                notification = mongo_notification_repository.create(**kwargs)
                if notification:
                    return notification
            except Exception as exc:
                logger.warning(
                    'MongoDB notification insert failed (%s); using SQL fallback.',
                    exc,
                )
        return sql_notification_repository.create(**kwargs)

    def list_for_user(self, user, limit=50):
        return self._read_backend().list_for_user(user, limit=limit)

    def get_for_user(self, notification_id, user):
        return self._read_backend().get_for_user(notification_id, user)

    def mark_all_read(self, user):
        return self._read_backend().mark_all_read(user)

    def delete_for_user(self, notification_id, user):
        return self._read_backend().delete_for_user(notification_id, user)

    def unread_count(self, user):
        return self._read_backend().unread_count(user)

    def save(self, notification):
        if is_mongo_enabled() and isinstance(notification.id, str):
            try:
                return mongo_notification_repository.save(notification)
            except Exception as exc:
                logger.warning('MongoDB notification save failed (%s).', exc)
        return sql_notification_repository.save(notification)

    @property
    def storage(self):
        return 'mongodb' if is_mongo_enabled() else 'postgresql'


notification_repository = NotificationRepository()

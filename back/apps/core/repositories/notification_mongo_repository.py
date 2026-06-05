from datetime import datetime

from bson import ObjectId
from bson.errors import InvalidId
from django.utils import timezone

from apps.core.mongo import get_notifications_collection
from apps.core.notification_record import NotificationRecord


def _parse_object_id(notification_id):
    if isinstance(notification_id, ObjectId):
        return notification_id
    try:
        return ObjectId(str(notification_id))
    except (InvalidId, TypeError):
        return None


class NotificationMongoRepository:
    def create(self, **kwargs):
        collection = get_notifications_collection()
        if collection is None:
            return None

        user = kwargs.pop('user', None)
        created_by = kwargs.pop('created_by', None)
        updated_by = kwargs.pop('updated_by', None)
        now = timezone.now()

        doc = {
            'user_id': user.id if user else kwargs.pop('user_id', None),
            'notification_type': kwargs.pop('notification_type', ''),
            'title': kwargs.pop('title', ''),
            'message': kwargs.pop('message', ''),
            'related_entity_type': kwargs.pop('related_entity_type', ''),
            'related_entity_id': kwargs.pop('related_entity_id', ''),
            'is_read': False,
            'read_at': None,
            'created_at': now,
            'updated_at': now,
            'created_by_id': created_by.id if created_by else None,
            'updated_by_id': updated_by.id if updated_by else None,
            'deleted_at': None,
        }
        result = collection.insert_one(doc)
        doc['_id'] = result.inserted_id
        return NotificationRecord.from_mongo(doc)

    def list_for_user(self, user, limit=50):
        collection = get_notifications_collection()
        if collection is None:
            return []

        cursor = (
            collection.find(
                {'user_id': user.id, 'deleted_at': None},
                sort=[('created_at', -1)],
            )
            .limit(limit)
        )
        return [NotificationRecord.from_mongo(doc) for doc in cursor]

    def get_for_user(self, notification_id, user):
        collection = get_notifications_collection()
        if collection is None:
            return None

        oid = _parse_object_id(notification_id)
        if oid is None:
            return None

        doc = collection.find_one(
            {'_id': oid, 'user_id': user.id, 'deleted_at': None},
        )
        return NotificationRecord.from_mongo(doc) if doc else None

    def delete_for_user(self, notification_id, user):
        collection = get_notifications_collection()
        if collection is None:
            return False

        oid = _parse_object_id(notification_id)
        if oid is None:
            return False

        now = timezone.now()
        result = collection.update_one(
            {'_id': oid, 'user_id': user.id, 'deleted_at': None},
            {'$set': {'deleted_at': now, 'updated_at': now}},
        )
        return result.modified_count > 0

    def mark_all_read(self, user):
        collection = get_notifications_collection()
        if collection is None:
            return 0

        now = timezone.now()
        result = collection.update_many(
            {'user_id': user.id, 'is_read': False, 'deleted_at': None},
            {'$set': {'is_read': True, 'read_at': now, 'updated_at': now}},
        )
        return result.modified_count

    def unread_count(self, user):
        collection = get_notifications_collection()
        if collection is None:
            return 0

        return collection.count_documents(
            {'user_id': user.id, 'is_read': False, 'deleted_at': None},
        )

    def save(self, notification):
        collection = get_notifications_collection()
        if collection is None:
            return notification

        oid = _parse_object_id(notification.id)
        if oid is None:
            return notification

        now = timezone.now()
        collection.update_one(
            {'_id': oid, 'user_id': notification.user_id},
            {
                '$set': {
                    'is_read': notification.is_read,
                    'read_at': notification.read_at,
                    'updated_at': now,
                },
            },
        )
        notification.created_at = notification.created_at or now
        return notification


mongo_notification_repository = NotificationMongoRepository()

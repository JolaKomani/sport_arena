"""Lightweight notification object returned by SQL or Mongo repositories."""


class NotificationRecord:
    def __init__(
        self,
        *,
        id,
        user_id,
        notification_type,
        title,
        message,
        related_entity_type='',
        related_entity_id='',
        is_read=False,
        read_at=None,
        created_at=None,
        deleted_at=None,
    ):
        self.id = id
        self.user_id = user_id
        self.notification_type = notification_type
        self.title = title
        self.message = message
        self.related_entity_type = related_entity_type or ''
        self.related_entity_id = related_entity_id or ''
        self.is_read = is_read
        self.read_at = read_at
        self.created_at = created_at
        self.deleted_at = deleted_at

    @classmethod
    def from_django(cls, notification):
        return cls(
            id=notification.id,
            user_id=notification.user_id,
            notification_type=notification.notification_type,
            title=notification.title,
            message=notification.message,
            related_entity_type=notification.related_entity_type,
            related_entity_id=notification.related_entity_id,
            is_read=notification.is_read,
            read_at=notification.read_at,
            created_at=notification.created_at,
            deleted_at=notification.deleted_at,
        )

    @classmethod
    def from_mongo(cls, doc):
        return cls(
            id=str(doc['_id']),
            user_id=doc['user_id'],
            notification_type=doc['notification_type'],
            title=doc['title'],
            message=doc['message'],
            related_entity_type=doc.get('related_entity_type', ''),
            related_entity_id=doc.get('related_entity_id', ''),
            is_read=doc.get('is_read', False),
            read_at=doc.get('read_at'),
            created_at=doc.get('created_at'),
            deleted_at=doc.get('deleted_at'),
        )

"""MongoDB connection for the notification activity feed (NoSQL lab store)."""

from django.conf import settings

_client = None


def is_mongo_enabled():
    return bool(getattr(settings, 'NOTIFICATIONS_USE_MONGO', False))


def get_mongo_client():
    global _client
    if _client is not None:
        return _client

    if not is_mongo_enabled():
        return None

    from pymongo import MongoClient

    _client = MongoClient(
        settings.MONGODB_URI,
        serverSelectionTimeoutMS=3000,
    )
    return _client


def get_notifications_collection():
    client = get_mongo_client()
    if client is None:
        return None
    db = client[getattr(settings, 'MONGODB_DB', 'sportz')]
    return db['notifications']

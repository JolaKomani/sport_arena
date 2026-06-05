"""In-process WebSocket registry for reliable dev delivery (with InMemoryChannelLayer)."""

import json
from collections import defaultdict

from asgiref.sync import async_to_sync

_connections = defaultdict(set)


def register(user_id, consumer):
    _connections[user_id].add(consumer)


def unregister(user_id, consumer):
    _connections[user_id].discard(consumer)
    if not _connections[user_id]:
        _connections.pop(user_id, None)


def push_to_user(user_id, payload):
    consumers = list(_connections.get(user_id, ()))
    if not consumers:
        return False

    text = json.dumps(payload)
    delivered = False
    dead = []

    for consumer in consumers:
        try:
            async_to_sync(consumer.send)(text_data=text)
            delivered = True
        except Exception:
            dead.append(consumer)

    for consumer in dead:
        unregister(user_id, consumer)

    return delivered

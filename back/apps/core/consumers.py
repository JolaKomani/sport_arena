import json
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from apps.core.services.jwt_auth import get_user_from_access_token
from apps.core.services.notifications import unread_count
from apps.core.ws_registry import register, unregister


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = await self._authenticate()
        if not self.user:
            await self.close(code=4401)
            return

        self.group_name = f'notifications_{self.user.id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        register(self.user.id, self)
        await self.accept()

        count = await database_sync_to_async(unread_count)(self.user)
        await self.send(
            text_data=json.dumps({
                'event': 'notification.connected',
                'unread_count': count,
            })
        )

    async def disconnect(self, close_code):
        if hasattr(self, 'user') and self.user:
            unregister(self.user.id, self)
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if text_data == 'ping':
            await self.send(text_data=json.dumps({'event': 'pong'}))

    async def notify_message(self, event):
        await self.send(text_data=json.dumps(event['payload']))

    @database_sync_to_async
    def _authenticate(self):
        query_string = self.scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token = (params.get('token') or [''])[0]
        if not token:
            return None
        return get_user_from_access_token(token)

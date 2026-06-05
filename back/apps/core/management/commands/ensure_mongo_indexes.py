from django.core.management.base import BaseCommand

from apps.core.mongo import get_notifications_collection, is_mongo_enabled


class Command(BaseCommand):
    help = 'Create MongoDB indexes for the notifications collection.'

    def handle(self, *args, **options):
        if not is_mongo_enabled():
            self.stdout.write(
                self.style.WARNING(
                    'MongoDB is disabled. Set MONGODB_URI in .env to enable notifications storage.'
                )
            )
            return

        collection = get_notifications_collection()
        if collection is None:
            self.stderr.write(self.style.ERROR('Could not connect to MongoDB.'))
            return

        collection.create_index([('user_id', 1), ('created_at', -1)])
        collection.create_index([('user_id', 1), ('is_read', 1)])
        collection.create_index('deleted_at')

        client = collection.database.client
        client.admin.command('ping')
        self.stdout.write(
            self.style.SUCCESS(
                f'MongoDB ready: database="{collection.database.name}" '
                f'collection="{collection.name}"'
            )
        )

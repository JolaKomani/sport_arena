from django.core.management.base import BaseCommand
from services.populate.populate import  populate

class Command(BaseCommand):
    help = (
        'Populate database with sample data: users from JSON, then '
        '5 public + 5 private squads (15 members each), 12 matches per squad '
        '(10 players per match), and full '
        'player-to-player ratings on the first 8 matches of each squad.'
    )

    def handle(self, *args, **kwargs):
        populate()

        self.stdout.write(self.style.SUCCESS('Database populated successfully!'))
from django.core.management.base import BaseCommand
from django.db import connection


LAB_TABLES = {
    'Users',
    'Roles',
    'UserRoles',
    'Permissions',
    'RolePermissions',
    'RefreshTokens',
    'AuditLogs',
    'Notifications',
    'Settings',
    'Files',
    'Teams',
    'TeamMembers',
    'Squads',
    'SquadMembers',
    'SquadAdmins',
    'Matches',
    'MatchTeams',
    'Ratings',
    'UserProfiles',
    'Venues',
    'SquadInvitations',
    'NotificationPreferences',
    'LoginHistory',
    'MatchParticipants',
}


class Command(BaseCommand):
    help = 'Print application table count for lab database verification.'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            if connection.vendor == 'sqlite':
                cursor.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
                )
            else:
                cursor.execute(
                    "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
                )
            all_tables = {row[0] for row in cursor.fetchall()}

        present = sorted(LAB_TABLES & all_tables)
        missing = sorted(LAB_TABLES - all_tables)
        self.stdout.write(f'Lab tables present: {len(present)} / {len(LAB_TABLES)}')
        for name in present:
            self.stdout.write(f'  OK {name}')
        if missing:
            self.stdout.write(self.style.WARNING('Missing:'))
            for name in missing:
                self.stdout.write(f'  MISSING {name}')
        self.stdout.write(f'Total DB tables (all apps): {len(all_tables)}')

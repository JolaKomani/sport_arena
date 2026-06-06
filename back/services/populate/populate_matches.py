from apps.matches.models import Match
from apps.squads.models import Squad
from apps.teams.models import Team
from services.populate.seed_config import (
    MATCHES_PER_SQUAD,
    MATCH_LOCATIONS,
    PLAYERS_PER_MATCH,
    lab_squad_names,
    match_datetime,
    pick_match_players,
)


def populate_matches():
    squad_names = lab_squad_names()
    matches_created = []

    for squad_index, squad_name in enumerate(squad_names):
        squad = Squad.objects.filter(name=squad_name).first()
        if not squad:
            print(f"Squad '{squad_name}' not found, skipping matches.")
            continue

        members = list(squad.members.all().order_by('id'))
        if len(members) < 2:
            print(f"Squad '{squad_name}' has fewer than 2 members, skipping matches.")
            continue

        for match_index in range(MATCHES_PER_SQUAD):
            location = MATCH_LOCATIONS[(squad_index + match_index) % len(MATCH_LOCATIONS)]
            when = match_datetime(squad_index, match_index)

            match, _created = Match.objects.get_or_create(
                location=location,
                datetime=when,
                squad=squad,
            )

            match_players = pick_match_players(members, match_index)
            _ensure_match_teams(match, match_players, squad_name, match_index)
            matches_created.append(match)

    print(
        f'Created/updated {len(matches_created)} matches ({MATCHES_PER_SQUAD} per squad, '
        f'up to {PLAYERS_PER_MATCH} players per match).'
    )
    return matches_created


def _ensure_match_teams(match, members, squad_name, match_index):
    midpoint = len(members) // 2 or 1
    team_specs = [
        (f'{squad_name} M{match_index + 1}A', members[:midpoint], 8 + (match_index % 3)),
        (f'{squad_name} M{match_index + 1}B', members[midpoint:], 3 + (match_index % 2)),
    ]

    for team_name, players, score in team_specs:
        if not players:
            continue

        team = Team.objects.filter(name=team_name, matches=match).first()
        if not team:
            team = Team.objects.create(name=team_name, score=score)
            match.teams.add(team)
        else:
            team.score = score
            team.save(update_fields=['score', 'updated_at'])

        team.members.clear()
        team.members.add(*players)

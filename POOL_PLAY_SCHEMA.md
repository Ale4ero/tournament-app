# Pool Play Database Schema

## Updated Tournament Structure

```json
/tournaments/{tournamentId}
{
  "id": "tournament_abc123",
  "name": "Summer Volleyball Championship",
  "description": "...",
  "organizationId": "org_xyz",
  "type": "pool_play_bracket",  // NEW: "single_elimination" | "pool_play_bracket"
  "status": "pool_play",         // NEW: "upcoming" | "pool_play" | "playoffs" | "completed"
  "teams": ["Team A", "Team B", ...],
  "createdBy": "admin_uid",
  "createdAt": 1234567890,
  "startDate": 1234567890,
  "endDate": null,

  // Pool Play Configuration (only if type === "pool_play_bracket")
  "poolConfig": {
    "numPools": 2,                    // Number of pools (A, B, C, etc.)
    "teamsPerPool": 4,                // Teams in each pool
    "pointsPerWin": 3,                // Points awarded for a win
    "pointsPerLoss": 0,               // Points awarded for a loss
    "pointsPerTie": 1,                // Points for tie (if applicable)
    "advancePerPool": 2,              // Top X teams from each pool advance
    "poolMatchRules": {               // Default rules for pool matches
      "firstTo": 25,
      "winBy": 2,
      "cap": 30,
      "bestOf": 3
    }
  },

  // Playoff Configuration (only if type === "pool_play_bracket")
  "playoffConfig": {
    "matchRules": {                   // Rules per playoff round
      "finals": { "firstTo": 25, "winBy": 2, "cap": 30, "bestOf": 5 },
      "semifinals": { "firstTo": 25, "winBy": 2, "cap": 30, "bestOf": 3 },
      // ...
    }
  },

  // Tracking
  "poolPlayCompletedAt": null,        // Timestamp when all pool matches done
  "playoffsStartedAt": null,          // Timestamp when playoffs began
  "completedAt": null
}
```

## Pool Structure

```json
/pools/{tournamentId}/{poolId}
{
  "id": "pool_A",                     // "pool_A", "pool_B", "pool_C", etc.
  "name": "Pool A",
  "tournamentId": "tournament_abc123",
  "teams": ["Team 1", "Team 2", "Team 3", "Team 4"],
  "matchesCompleted": 0,
  "totalMatches": 6,                  // n*(n-1)/2 for round robin
  "status": "in_progress",            // "upcoming" | "in_progress" | "completed"
  "createdAt": 1234567890
}
```

## Pool Standings

```json
/pools/{tournamentId}/{poolId}/standings/{teamName}
{
  "team": "Team 1",
  "poolId": "pool_A",
  "tournamentId": "tournament_abc123",
  "matchesPlayed": 3,
  "wins": 2,
  "losses": 1,
  "ties": 0,
  "points": 6,                        // Based on pointsPerWin/Loss config
  "setsWon": 6,
  "setsLost": 3,
  "pointsFor": 150,                   // Total points scored across all sets
  "pointsAgainst": 120,               // Total points conceded
  "pointDifferential": 30,            // pointsFor - pointsAgainst
  "setDifferential": 3,               // setsWon - setsLost
  "rank": 1,                          // Current rank in pool (1-indexed)
  "advancesToPlayoffs": true,         // Whether this team advances
  "playoffSeed": 1,                   // Overall seed for playoffs (calculated when advancing)
  "lastUpdated": 1234567890
}
```

## Pool Matches

Pool matches reuse the existing `/matches` structure but with additional metadata:

```json
/matches/{tournamentId}/{matchId}
{
  "id": "tournament_abc123_poolA_m1",
  "tournamentId": "tournament_abc123",
  "matchType": "pool",                // NEW: "pool" | "playoff"
  "poolId": "pool_A",                 // NEW: Only for pool matches
  "round": null,                      // null for pool matches
  "matchNumber": 1,
  "team1": "Team 1",
  "team2": "Team 2",
  "score1": null,
  "score2": null,
  "winner": null,
  "status": "upcoming",
  "setScores": [],
  "rules": {
    "firstTo": 25,
    "winBy": 2,
    "cap": 30,
    "bestOf": 3
  },
  "approvedAt": null,
  "approvedBy": null,
  "nextMatchId": null,                // null for pool matches
  "isTeam1Winner": null
}
```

## Playoff Seeding

When advancing to playoffs, create a seeding record:

```json
/tournaments/{tournamentId}/playoffSeeding
{
  "seeds": [
    {
      "seed": 1,
      "team": "Team A",
      "poolId": "pool_A",
      "poolRank": 1,
      "poolPoints": 9,
      "poolRecord": "3-0"
    },
    {
      "seed": 2,
      "team": "Team B",
      "poolId": "pool_B",
      "poolRank": 1,
      "poolPoints": 6,
      "poolRecord": "2-1"
    },
    // ... top teams from each pool
  ],
  "generatedAt": 1234567890,
  "generatedBy": "admin_uid"
}
```

## Status Transitions

```
Tournament Creation
  ↓
status: "upcoming" (teams assigned to pools, matches generated)
  ↓
Admin starts tournament / First pool match begins
  ↓
status: "pool_play" (pool matches in progress)
  ↓
All pool matches completed
  ↓
Admin clicks "Advance to Playoffs"
  ↓
status: "playoffs" (playoff bracket generated with seeded teams)
  ↓
All playoff matches completed
  ↓
status: "completed"
```

## Database Paths Summary

| Path | Purpose | Read Access | Write Access |
|------|---------|-------------|--------------|
| `/tournaments/{tid}` | Tournament metadata | Public | Admin |
| `/pools/{tid}/{poolId}` | Pool information | Public | Admin |
| `/pools/{tid}/{poolId}/standings/{team}` | Team standings | Public | System (via cloud function or service) |
| `/matches/{tid}/{matchId}` | All matches (pool + playoff) | Public | Admin |
| `/submissions/{matchId}` | Score submissions | Public | Public (write), Admin (approve) |
| `/tournaments/{tid}/playoffSeeding` | Playoff seed assignments | Public | Admin |

## Key Design Decisions

1. **Reuse existing match system**: Pool matches use the same `/matches` path with `matchType: "pool"` to leverage existing scoreboard, submission, and approval flows.

2. **Standings auto-update**: When a pool match is approved, a service function recalculates standings for that pool.

3. **Pools are ephemeral metadata**: Pool assignments are stored in the pool object but teams remain in the main tournament.teams array.

4. **Seeding is calculated, then frozen**: When "Advance to Playoffs" is clicked, seeding is calculated once and stored, then playoff bracket is generated with those seeds.

5. **Tiebreakers**: Rank teams by:
   - Points (wins × pointsPerWin)
   - Set differential
   - Point differential
   - Head-to-head result (if applicable)

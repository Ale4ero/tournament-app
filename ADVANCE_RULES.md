# Flexible Playoff Advancement - Documentation

## Overview

VolleyFlow now supports **flexible playoff advancement** for any number of teams, not just powers of 2. The system automatically suggests the optimal format (Auto-Byes or Play-In Matches) and handles bracket generation seamlessly.

## Features

### 🎯 Smart Format Suggestion

The system analyzes the number of advancing teams and suggests the format that impacts the fewest teams:

- **Auto-Byes**: Top-seeded teams skip Round 1 and automatically advance to Round 2
- **Play-In Matches**: Lowest-seeded teams play extra matches to fill the bracket

### 📊 How It Works

For **N** teams advancing (where N is not a power of 2):

1. **Lower Power**: Largest power of 2 ≤ N (e.g., 8 for 10 teams)
2. **Higher Power**: Smallest power of 2 ≥ N (e.g., 16 for 10 teams)
3. **Byes Needed**: Higher - N teams would skip Round 1
4. **Play-In Teams**: (N - Lower) × 2 teams would play extra matches

**Suggestion Logic**: Recommend **Play-In** if it impacts fewer teams than Byes.

### 📖 Example Scenarios

#### 10 Teams Advancing
- Lower: 8, Higher: 16
- Byes: 6 teams idle
- Play-In: 4 teams playing extra matches
- **Suggested**: Play-In (4 < 6)
- **Result**: Seeds 7-10 play 2 play-in matches, winners join seeds 1-6 in main bracket (8 teams)

#### 12 Teams Advancing
- Lower: 8, Higher: 16
- Byes: 4 teams idle
- Play-In: 8 teams playing extra matches
- **Suggested**: Byes (4 < 8)
- **Result**: Seeds 1-4 get byes to Round 2, seeds 5-12 play Round 1 (4 matches)

#### 9 Teams Advancing
- Lower: 8, Higher: 16
- Byes: 7 teams idle
- Play-In: 2 teams playing extra matches
- **Suggested**: Play-In (2 < 7)
- **Result**: Seeds 8-9 play 1 play-in match, winner joins seeds 1-7 in main bracket

## Admin Workflow

### 1. Tournament Creation

When creating a Pool Play + Playoffs tournament:

1. Navigate to **Create Tournament**
2. Fill in basic tournament details
3. Configure **Pool Configuration** (number of pools, teams advancing per pool)
4. Set **Pool Match Rules**
5. Configure **Playoff Match Rules** (per round)
6. Arrange **Team Seeding** (drag-and-drop)

### 2. Advance Rules Section

The **Playoff Advancement Rules** section appears automatically for pool play tournaments:

- **Input**: Number of Teams Advancing (calculated from pools)
- **Live Suggestion**: System shows recommended format with math breakdown
- **Format Selection**: Choose Auto-Byes or Play-In (defaults to suggested)
- **Explanation**: Detailed description of what each format means

**Example Display**:
```
Suggested: Play-In
Byes: 6 teams skip Round 1
Play-In Teams: 4 teams play extra matches
Lower Bracket: 8 teams
Upper Bracket: 16 teams

Play-in is suggested because it impacts fewer teams (4 vs 6 idle).
```

### 3. Generating Playoffs

After pool play completes:

1. Navigate to tournament page
2. Click **"Advance to Playoffs"** button
3. System reads advance rules from draft
4. Generates bracket with byes or play-ins
5. Matches are created and linked automatically

## Technical Implementation

### Core Algorithms

```javascript
// Power of 2 helpers
function lowerPowerOfTwo(n) { return 2 ** Math.floor(Math.log2(n)); }
function higherPowerOfTwo(n) { return 2 ** Math.ceil(Math.log2(n)); }

// Smart suggestion
function suggestPlayoffFormat(numTeams) {
  const lower = lowerPowerOfTwo(numTeams);
  const higher = higherPowerOfTwo(numTeams);
  const byes = higher - numTeams;
  const playInMatches = numTeams - lower;
  const playIns = playInMatches * 2;

  return (playIns < byes)
    ? { suggestion: "play-in", byes, playIns, lower, higher }
    : { suggestion: "byes", byes, playIns, lower, higher };
}

// Seeding pairing
function pairSeedsForRound(seeds) {
  const pairs = [];
  let i = 0, j = seeds.length - 1;
  while (i < j) pairs.push([seeds[i++], seeds[j--]]);
  return pairs;
}
```

### Data Schema

#### Tournament Draft
```json
{
  "advanceRules": {
    "numTeamsAdvancing": 10,
    "suggestedFormat": "play-in",
    "formatChosen": "play-in",
    "math": {
      "byes": 6,
      "playIns": 4,
      "lower": 8,
      "higher": 16
    }
  }
}
```

#### Tournament
```json
{
  "phase": "playoffs",
  "advanceRules": {
    "numTeamsAdvancing": 10,
    "format": "play-in",
    "math": { "byes": 6, "playIns": 4, "lower": 8, "higher": 16 }
  },
  "playoffs": {
    "seeds": [
      { "teamId": "team_1", "teamName": "Team A", "seed": 1 },
      { "teamId": "team_2", "teamName": "Team B", "seed": 2 }
    ],
    "rounds": {
      "play-in": { "matchIds": ["match1", "match2"] },
      "round1": { "matchIds": ["match3", "match4"] },
      "semifinals": { "matchIds": ["match5"] },
      "finals": { "matchIds": ["match6"] }
    }
  }
}
```

#### Match Structure
```json
{
  "id": "tournament_play-in_m1",
  "tournamentId": "tournament_id",
  "round": 5,
  "roundName": "play-in",
  "matchType": "playoff",
  "team1": "Team G",
  "team2": "Team H",
  "seed1": 7,
  "seed2": 8,
  "nextMatchId": "tournament_round1_m4",
  "isTeam1Winner": true
}
```

### Services

#### `advance.service.js`
- `suggestPlayoffFormat(numTeams)` - Computes suggestion
- `buildSeeds(teamsWithRank)` - Builds seed array from standings
- `generatePlayoffBracket(...)` - Generates bracket structure
- `pairSeedsForRound(seeds)` - Pairs seeds optimally

#### `bracket.service.js`
- `generateAndSavePlayoffs(...)` - Generates and saves to Firebase
- `getPlayoffData(tournamentId)` - Retrieves playoff metadata

#### `tournament.service.js`
- `generatePlayoffsFromStandings(...)` - Generates from pool standings
- Updated `createPoolPlayTournamentFromDraft` to include advance rules

### Security Rules

```json
{
  "tournamentDrafts": {
    "$draftId": {
      "advanceRules": {
        ".read": "auth != null && admin",
        ".write": "auth != null && admin"
      }
    }
  },
  "tournaments": {
    "$tournamentId": {
      "advanceRules": {
        ".read": true,
        ".write": "auth != null && admin"
      },
      "playoffs": {
        ".read": true,
        ".write": "auth != null && admin"
      }
    }
  }
}
```

## UI Components

### `AdvanceRulesForm.jsx`
- Displays advance rules configuration
- Shows live suggestion and math
- Allows format override
- Auto-saves to draft

### `useAdvanceRules.js`
- Custom hook for managing advance rules state
- Syncs with Firebase draft
- Handles recalculation on team count change

### `BracketView.jsx` (Updated)
- Displays play-in round separately (purple header)
- Shows main bracket rounds in order
- Supports both mobile and desktop layouts

## Testing

### Manual Test Cases

1. **10 Teams**: Expect play-in with 2 matches (seeds 7-10)
2. **12 Teams**: Expect byes with 4 matches (seeds 5-12 in R1)
3. **9 Teams**: Expect play-in with 1 match (seeds 8-9)
4. **8 Teams**: No byes or play-ins needed (standard bracket)

### Verification Steps

1. Create pool play tournament with N teams
2. Configure pools so total advancing = test case
3. Check Advance Rules section shows correct suggestion
4. Complete pool play
5. Generate playoffs
6. Verify bracket structure matches expected format

## Backwards Compatibility

- Existing tournaments continue to work (no advance rules = standard behavior)
- Single elimination tournaments unaffected
- Power-of-2 pool tournaments work as before

## Future Enhancements

- Double elimination support
- Custom seeding adjustments after pools
- Re-seeding between playoff rounds
- Automatic tiebreaker rules for pool standings

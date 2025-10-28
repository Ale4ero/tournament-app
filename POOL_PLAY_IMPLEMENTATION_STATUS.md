# Pool Play + Bracket Implementation Status

## ✅ COMPLETED

### 1. Database Schema Design
- **File**: `POOL_PLAY_SCHEMA.md`
- Comprehensive schema for pools, standings, matches
- Tournament status transitions defined
- Seeding calculation logic documented

### 2. Backend Services

#### pool.service.js (NEW) - `src/services/pool.service.js`
**Core Functions Implemented:**
- ✅ `createPools(tournamentId, teams, numPools)` - Distribute teams into pools
- ✅ `generatePoolMatches(tournamentId, poolId, teams, matchRules)` - Create round-robin matches
- ✅ `initializePoolStandings(tournamentId, poolId, teams)` - Set up initial standings
- ✅ `updatePoolStandings(tournamentId, poolId, match, poolConfig)` - Recalculate after match completion
- ✅ `recalculatePoolRanks(tournamentId, poolId)` - Sort teams by points/differentials
- ✅ `getPools(tournamentId)` - Fetch all pools
- ✅ `subscribePools(tournamentId, callback)` - Real-time pool updates
- ✅ `getPoolStandings(tournamentId, poolId)` - Fetch standings for a pool
- ✅ `subscribePoolStandings(tournamentId, poolId, callback)` - Real-time standings updates
- ✅ `advanceToPlayoffs(tournamentId, advancePerPool, playoffConfig, adminUid)` - Generate playoff bracket from pool results
- ✅ `areAllPoolsCompleted(tournamentId)` - Check if ready for playoffs

#### tournament.service.js (UPDATED)
**New Function:**
- ✅ `createPoolPlayTournamentFromDraft(draftId, poolConfig, playoffConfig)` - Create pool play tournament with pools and matches

### 3. Constants Updated
**File**: `src/utils/constants.js`
- ✅ Added `TOURNAMENT_TYPE.POOL_PLAY_BRACKET`
- ✅ Added `TOURNAMENT_STATUS.POOL_PLAY` and `TOURNAMENT_STATUS.PLAYOFFS`
- ✅ Added `POOL_STATUS` (UPCOMING, IN_PROGRESS, COMPLETED)
- ✅ Added `MATCH_TYPE` (POOL, PLAYOFF)
- ✅ Added `DEFAULT_POOL_CONFIG`
- ✅ Added `DB_PATHS.POOLS`

---

## 🚧 TO BE IMPLEMENTED

### 4. Frontend Components

#### A. Pool Components (NEW) - `src/components/pools/`

**PoolList.jsx** - Display all pools in a tournament
```jsx
export default function PoolList({ tournamentId }) {
  const { pools, loading } = usePools(tournamentId);

  return (
    <div>
      {pools.map(pool => (
        <PoolCard key={pool.id} pool={pool} tournamentId={tournamentId} />
      ))}
    </div>
  );
}
```

**PoolCard.jsx** - Individual pool display
```jsx
export default function PoolCard({ pool, tournamentId }) {
  return (
    <div className="pool-card">
      <h3>{pool.name}</h3>
      <p>Matches: {pool.matchesCompleted}/{pool.totalMatches}</p>
      <PoolTable tournamentId={tournamentId} poolId={pool.id} />
      <PoolMatchList tournamentId={tournamentId} poolId={pool.id} />
    </div>
  );
}
```

**PoolTable.jsx** - Standings table
```jsx
export default function PoolTable({ tournamentId, poolId }) {
  const { standings, loading } = usePoolStandings(tournamentId, poolId);

  return (
    <table>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Team</th>
          <th>W-L</th>
          <th>Points</th>
          <th>Sets +/-</th>
          <th>Points +/-</th>
        </tr>
      </thead>
      <tbody>
        {standings.map(s => (
          <tr key={s.team} className={s.advancesToPlayoffs ? 'advancing' : ''}>
            <td>{s.rank}</td>
            <td>{s.team}</td>
            <td>{s.wins}-{s.losses}</td>
            <td>{s.points}</td>
            <td>{s.setDifferential > 0 ? '+' : ''}{s.setDifferential}</td>
            <td>{s.pointDifferential > 0 ? '+' : ''}{s.pointDifferential}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

**PoolMatchList.jsx** - List of pool matches
```jsx
export default function PoolMatchList({ tournamentId, poolId }) {
  const { matches, loading } = usePoolMatches(tournamentId, poolId);

  return (
    <div className="pool-matches">
      {matches.map(match => (
        <MatchCard key={match.id} match={match} compact />
      ))}
    </div>
  );
}
```

**usePools.js** - Custom hook
```jsx
import { useState, useEffect } from 'react';
import { subscribePools } from '../../services/pool.service';

export default function usePools(tournamentId) {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribePools(tournamentId, (data) => {
      setPools(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [tournamentId]);

  return { pools, loading };
}
```

**usePoolStandings.js** - Custom hook
```jsx
import { useState, useEffect } from 'react';
import { subscribePoolStandings } from '../../services/pool.service';

export default function usePoolStandings(tournamentId, poolId) {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribePoolStandings(tournamentId, poolId, (data) => {
      setStandings(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [tournamentId, poolId]);

  return { standings, loading };
}
```

#### B. Update TournamentForm.jsx
- Add dropdown for tournament type selection
- Show pool configuration form when "Pool Play + Bracket" is selected
- Fields needed:
  - Number of pools (2-4)
  - Teams per pool (calculated automatically)
  - Points per win/loss/tie
  - Top X teams advance per pool
  - Pool match rules (firstTo, winBy, cap, bestOf)

#### C. Create PoolSetupPage.jsx (NEW) - `src/pages/PoolSetupPage.jsx`
Similar to ManageBracketPage but for pool configuration
- Route: `/tournaments/pool-setup/:draftId`
- Configure pool settings
- Preview pool assignments
- Button: "Create Tournament & Generate Pools"
- Calls `createPoolPlayTournamentFromDraft()`

#### D. Update TournamentView.jsx
**Add Tabbed Layout:**
```jsx
export default function TournamentView() {
  const { tournament } = useTournament(tournamentId);
  const [activeTab, setActiveTab] = useState('pools');

  // If tournament type is POOL_PLAY_BRACKET, show tabs
  if (tournament.type === TOURNAMENT_TYPE.POOL_PLAY_BRACKET) {
    return (
      <Layout>
        <Tabs>
          <Tab active={activeTab === 'pools'} onClick={() => setActiveTab('pools')}>
            Pools
          </Tab>
          <Tab active={activeTab === 'playoffs'} onClick={() => setActiveTab('playoffs')}>
            Playoffs
          </Tab>
        </Tabs>

        {activeTab === 'pools' && (
          <>
            <PoolList tournamentId={tournamentId} />
            {isAdmin && tournament.status === 'pool_play' && (
              <AdvanceToPlayoffsButton
                tournamentId={tournamentId}
                poolConfig={tournament.poolConfig}
                playoffConfig={tournament.playoffConfig}
              />
            )}
          </>
        )}

        {activeTab === 'playoffs' && (
          <>
            {tournament.status === 'playoffs' || tournament.status === 'completed' ? (
              <BracketView tournamentId={tournamentId} />
            ) : (
              <p>Playoffs will begin after pool play is complete</p>
            )}
          </>
        )}
      </Layout>
    );
  }

  // Otherwise, show standard bracket view
  return <BracketView tournamentId={tournamentId} />;
}
```

**AdvanceToPlayoffsButton.jsx** (NEW)
```jsx
export default function AdvanceToPlayoffsButton({ tournamentId, poolConfig, playoffConfig }) {
  const { user } = useAuth();
  const [allPoolsComplete, setAllPoolsComplete] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    checkPoolsCompletion();
  }, [tournamentId]);

  const handleAdvance = async () => {
    setAdvancing(true);
    try {
      await advanceToPlayoffs(
        tournamentId,
        poolConfig.advancePerPool,
        playoffConfig,
        user.uid
      );
      alert('Playoff bracket generated successfully!');
    } catch (error) {
      alert('Failed to advance to playoffs: ' + error.message);
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <button
      onClick={handleAdvance}
      disabled={!allPoolsComplete || advancing}
      className="btn-primary"
    >
      {advancing ? 'Generating Playoffs...' : 'Advance to Playoffs'}
    </button>
  );
}
```

### 5. Integrate Pool Matches with Match System

#### Update match.service.js
**In `approveScore()` function:**
```javascript
export async function approveScore(matchId, submissionId, adminUid) {
  // ... existing code ...

  // After updating match, check if it's a pool match
  const match = matchSnapshot.val();
  if (match.matchType === MATCH_TYPE.POOL) {
    // Update pool standings
    const tournament = await getTournament(match.tournamentId);
    await updatePoolStandings(
      match.tournamentId,
      match.poolId,
      {
        ...match,
        score1,
        score2,
        winner,
        setScores
      },
      tournament.poolConfig
    );
  } else {
    // Existing playoff/single-elim logic
    if (winner && match.nextMatchId) {
      // ... advance winner ...
    }
  }

  // ... rest of function ...
}
```

### 6. Update Database Security Rules

**File**: `database.rules.json`

```json
{
  "rules": {
    "pools": {
      "$tournamentId": {
        "$poolId": {
          ".read": true,
          ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'",
          "standings": {
            ".read": true,
            ".write": false  // Only via cloud functions or service logic
          }
        }
      }
    },
    "tournaments": {
      "$tournamentId": {
        "playoffSeeding": {
          ".read": true,
          ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
        }
      }
    }
  }
}
```

---

## 📋 Implementation Checklist

### Backend (DONE)
- [x] Database schema design
- [x] pool.service.js with all core functions
- [x] Update constants with pool-related values
- [x] Add createPoolPlayTournamentFromDraft() to tournament.service

### Frontend (TODO)
- [ ] Create src/components/pools/ directory
- [ ] PoolList.jsx
- [ ] PoolCard.jsx
- [ ] PoolTable.jsx
- [ ] PoolMatchList.jsx
- [ ] usePools.js hook
- [ ] usePoolStandings.js hook
- [ ] usePoolMatches.js hook
- [ ] Update TournamentForm.jsx for pool type selection
- [ ] Create PoolSetupPage.jsx
- [ ] Update TournamentView.jsx with tabbed layout
- [ ] Create AdvanceToPlayoffsButton.jsx component

### Integration (TODO)
- [ ] Update match.service.js approveScore() to handle pool matches
- [ ] Add route for /tournaments/pool-setup/:draftId in App.jsx
- [ ] Update database.rules.json for pool security

### Testing (TODO)
- [ ] Test pool creation and team distribution
- [ ] Test round-robin match generation
- [ ] Test standings calculation after matches
- [ ] Test advancement to playoffs
- [ ] Test playoff bracket generation with seeded teams

---

## 🎯 Next Steps

1. **Create Pool UI Components** - Start with PoolList, PoolTable, PoolMatchList
2. **Update Tournament Creation Flow** - Add pool configuration to TournamentForm
3. **Implement Tabbed Layout** - Update TournamentView for pools vs playoffs
4. **Integrate with Match System** - Update approveScore() for pool matches
5. **Add Security Rules** - Update database.rules.json
6. **End-to-End Testing** - Create test tournament and run through full flow

---

## 📊 User Flow Summary

### Admin Creates Pool Play Tournament:
1. Go to /admin → "Create Tournament"
2. Select "Pool Play + Bracket" type
3. Enter tournament info, add teams (any number, not just power of 2)
4. Click "Next" → Redirect to /tournaments/pool-setup/:draftId
5. Configure:
   - Number of pools (2-4)
   - Points per win/loss
   - Top X teams advance per pool
   - Pool match rules
   - Playoff match rules per round
6. Click "Create Tournament & Generate Pools"
7. Tournament created with status: "upcoming"
8. Pools created, teams distributed
9. Round-robin matches generated for each pool
10. Standings initialized

### Pool Play Phase:
1. Public/admin views tournament at /tournament/:id
2. See "Pools" tab (default active)
3. Each pool shows:
   - Standings table (rank, team, W-L, points, differentials)
   - List of pool matches
4. Users click match → Go to match detail page
5. Use scoreboard or submit scores
6. Admin approves scores
7. **On approval**: Standings auto-update for that pool
8. Pool status changes to "completed" when all matches done

### Advance to Playoffs:
1. Admin sees "Advance to Playoffs" button (enabled when all pools complete)
2. Clicks button
3. Backend:
   - Calculates cross-pool seeding
   - Marks which teams advance
   - Generates playoff bracket with seeded teams
   - Updates tournament status to "playoffs"
4. User now sees "Playoffs" tab active
5. Standard bracket view with seeded teams

### Playoff Phase:
1. Playoffs work like standard single-elimination
2. Winners advance through bracket
3. Tournament completes when finals are done

---

## 🔧 Technical Notes

**Standings Tiebreakers (in order):**
1. Points (wins × pointsPerWin)
2. Set differential (setsWon - setsLost)
3. Point differential (pointsFor - pointsAgainst)
4. Head-to-head result (future enhancement)

**Cross-Pool Seeding Algorithm:**
1. Group teams by pool rank (all 1st place teams, all 2nd place teams, etc.)
2. Within each rank group, sort by:
   - Points (desc)
   - Set differential (desc)
   - Point differential (desc)
3. Assign seeds 1, 2, 3, ... in that order
4. Generate bracket using standard single-elimination with those seeds

**Match Type Handling:**
- Pool matches: `matchType: "pool"`, `poolId: "pool_A"`, `nextMatchId: null`
- Playoff matches: `matchType: "playoff"`, `poolId: null`, `nextMatchId: {...}` (standard bracket advancement)

**Real-Time Updates:**
- Pools, standings, and matches all use Firebase onValue listeners
- UI updates automatically when:
  - Match scores are submitted/approved
  - Standings recalculate
  - Pool status changes
  - Tournament advances to playoffs



# Interactive Scoreboard Feature - Implementation Documentation

## Overview

This document describes the **Interactive Scoreboard System** for VolleyFlow, which allows referees and admins to track match scores in real-time using a full-screen, touch-friendly interface.

## Feature Summary

The interactive scoreboard replaces traditional static score submission with a dynamic, visual interface that:
- Tracks points live during matches
- Automatically detects set and match winners based on rules
- Syncs in real-time across all connected devices via Firebase
- Submits final scores for admin approval upon completion

## Updated User Flow

### 1. Match Details Page (`/match/:matchId`)

**For Admins:**
- A prominent **"Referee Match"** button appears in a green gradient card
- Clicking it navigates to `/match/:matchId/scoreboard`

**For Public Users:**
- Can view scoreboard in read-only mode (if active)
- Traditional score submission form remains available

### 2. Scoreboard Page (`/match/:matchId/scoreboard`)

**Full-Screen Interface:**
- Split-screen design (Red vs Blue)
- Large, tap-friendly scores
- Real-time synchronization
- Automatic winner detection

**Controls:**
- Tap anywhere on a team's side to increment score
- Small "–" button to decrement (undo points)
- "Reset Set" button to restart current set
- "Quit" button to abandon scoreboard

**Set/Match Progression:**
- Automatically advances to next set when current set is won
- Displays set count indicators (dots) for each team
- Locks scoreboard when match is complete

### 3. Review & Submit Flow

**When Match Completes:**
- Scoreboard freezes automatically
- "Review & Submit Score" modal appears
- Shows:
  - Winner announcement
  - Set-by-set breakdown
  - Total points scored
  - Match rules reference

**On Confirmation:**
- Creates submission entry under `/submissions/{matchId}`
- Marks source as "scoreboard"
- Includes full set-by-set data
- Status set to "pending" for admin approval
- Redirects back to match page with success message

## Database Schema

### New: Scoreboards Collection

```javascript
/scoreboards/{matchId}
{
  matchId: string,
  tournamentId: string,
  team1: string,
  team2: string,
  team1Color: "red",
  team2Color: "blue",
  currentSet: number,                    // 1-based (1, 2, 3...)
  sets: [
    {
      setNumber: 1,
      team1Score: 21,
      team2Score: 19,
      winner: "team1"                    // null if in progress
    },
    {
      setNumber: 2,
      team1Score: 19,
      team2Score: 21,
      winner: "team2"
    },
    {
      setNumber: 3,
      team1Score: 15,
      team2Score: 10,
      winner: null
    }
  ],
  team1SetsWon: number,
  team2SetsWon: number,
  status: "active" | "review" | "completed",
  winner: "team1" | "team2" | null,
  startedAt: timestamp,
  startedBy: string (uid),
  lastUpdated: timestamp,
  lastUpdatedBy: string (uid),
  rules: {
    firstTo: 21,
    winBy: 2,
    cap: 30,
    bestOf: 3
  },
  locked: boolean
}
```

### Updated: Matches Collection

```javascript
/matches/{tournamentId}/{matchId}
{
  // ... existing fields ...
  scoreboardId: string | null,           // Reference to active scoreboard
  hasLiveScoreboard: boolean             // Quick flag for UI
}
```

### Updated: Submissions Collection

```javascript
/submissions/{matchId}/{submissionId}
{
  // ... existing fields ...
  source: "scoreboard" | "manual",       // NEW: Track submission type
  scoreboardId: string,                  // NEW: Reference to scoreboard
  setScores: [                           // NEW: Detailed set breakdown
    {
      setNumber: 1,
      team1Score: 21,
      team2Score: 19,
      winner: "team1"
    }
  ]
}
```

## Backend Implementation

### Services

#### `scoreboard.service.js`

**Key Functions:**

```javascript
// Create new scoreboard for a match
createScoreboard(match, userId): Promise<string>

// Get scoreboard by ID
getScoreboard(scoreboardId): Promise<Object|null>

// Subscribe to real-time updates
subscribeScoreboard(scoreboardId, callback): Function

// Update score for a team
updateScore(scoreboardId, team, newScore, userId): Promise<void>

// Reset current set
resetCurrentSet(scoreboardId, userId): Promise<void>

// Submit final score to match
submitScoreboardResults(scoreboardId, userId): Promise<void>

// Delete scoreboard
deleteScoreboard(scoreboardId): Promise<void>
```

**Winner Detection Logic:**

```javascript
function checkSetWinner(set, rules) {
  const { team1Score, team2Score } = set;
  const { firstTo, winBy, cap } = rules;

  // Check cap first
  if (team1Score >= cap || team2Score >= cap) {
    return team1Score > team2Score ? 'team1' : 'team2';
  }

  // Check firstTo + winBy
  if (team1Score >= firstTo && team1Score - team2Score >= winBy) {
    return 'team1';
  }
  if (team2Score >= firstTo && team2Score - team1Score >= winBy) {
    return 'team2';
  }

  return null;
}
```

**Set Advancement Logic:**
- After each score update, checks if current set has a winner
- If winner detected, updates set's `winner` field
- Counts total sets won for each team
- If a team has won enough sets (ceil(bestOf/2)), marks match as complete
- Otherwise, creates new set and increments `currentSet`

#### `match.service.js` (Updated)

**New Function:**
```javascript
// Get match by ID without requiring tournamentId
getMatch(matchId): Promise<Object|null>
```

## Frontend Implementation

### Components

#### 1. `ScoreSide.jsx`

**Purpose:** One half of the scoreboard (Red or Blue team)

**Props:**
```javascript
{
  teamName: string,
  color: "red" | "blue",
  score: number,
  setsWon: number,
  onIncrement: Function,
  onDecrement: Function,
  disabled: boolean,
  isWinner: boolean
}
```

**Features:**
- Full-height colored background (red/blue)
- Massive score display (9xl to 20rem font size)
- Tap-anywhere to increment
- Small "– Undo Point" button
- Large "+ Add Point" button
- Sets won indicator (colored dots)
- Winner badge (when applicable)
- Touch-friendly design

#### 2. `ReviewScoreModal.jsx`

**Purpose:** Final review and confirmation before submission

**Props:**
```javascript
{
  scoreboard: Object,
  userId: string,
  onClose: Function,
  onSuccess: Function
}
```

**Features:**
- Winner announcement with trophy icon
- Set-by-set breakdown
- Total points summary
- Match rules reference
- Important notice about admin approval
- Confirm & Submit button

#### 3. `useScoreboardLogic.js`

**Purpose:** Custom hook managing scoreboard state and operations

**Returns:**
```javascript
{
  scoreboard: Object,
  loading: boolean,
  error: string,
  updating: boolean,
  isInReview: boolean,
  isCompleted: boolean,
  isActive: boolean,
  incrementScore: (team) => Promise<void>,
  decrementScore: (team) => Promise<void>,
  resetSet: () => Promise<void>,
  getCurrentSet: () => Object,
  getWinnerName: () => string,
  getCurrentScores: () => Object,
  getSetsWon: () => Object
}
```

**Features:**
- Real-time Firebase subscription
- Optimistic UI updates
- Error handling
- Winner detection
- Set management

### Pages

#### `ScoreboardPage.jsx`

**Route:** `/match/:matchId/scoreboard`

**Features:**
- Full-screen layout (fixed positioning)
- Split-screen scoreboard (50/50)
- Header bar with match info and controls
- Center divider line
- Current set indicator
- Review modal integration
- Completed overlay
- Loading and error states

**Access Control:**
- Admins: Full control (read/write)
- Public users: Read-only view
- Auto-creates scoreboard if admin and none exists

### Updated Components

#### `MatchDetail.jsx`

**New Section:**
```jsx
<div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-sm p-6 text-white">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-xl font-bold mb-2">Interactive Scoreboard</h3>
      <p className="text-green-50 text-sm">
        Launch the live scoreboard to track points in real-time during the match
      </p>
    </div>
    <button
      onClick={() => navigate(`/match/${match.id}/scoreboard`)}
      className="bg-white text-green-600 hover:bg-green-50 font-bold py-3 px-6 rounded-lg transition-colors shadow-lg flex items-center gap-2"
    >
      <ChartBarIcon />
      Referee Match
    </button>
  </div>
</div>
```

## Security Rules

### Scoreboards

```json
"scoreboards": {
  "$scoreboardId": {
    ".read": true,
    ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
  }
}
```

**Security Features:**
- Public read access (for spectators/viewers)
- Admin-only write access
- Prevents unauthorized score manipulation

## UX Details

### Visual Design

**Color Scheme:**
- **Team 1 (Red):** `bg-red-500` / `bg-red-600` / `bg-red-400`
- **Team 2 (Blue):** `bg-blue-500` / `bg-blue-600` / `bg-blue-400`
- **Winner Badge:** Yellow with trophy emoji
- **Header:** Dark gray (`bg-gray-800`)

**Typography:**
- Score: `text-9xl` to `text-[20rem]` (responsive)
- Team name: `text-2xl` to `text-4xl`
- Buttons: `text-xl` bold

**Animations:**
- Winner badge: `animate-pulse`
- Button interactions: `active:scale-95`
- Hover states: `hover:brightness-95`

### Mobile Responsiveness

- Touch-optimized tap targets
- Responsive font sizes (`md:` breakpoint)
- Portrait and landscape support
- Swipe-proof (tap-only interactions)

### Accessibility

- High contrast colors
- Large touch targets (minimum 48x48px)
- Clear visual hierarchy
- Descriptive button labels
- Real-time feedback

## Data Flow

### Score Update Flow

```
User taps screen
  ↓
ScoreSide.onIncrement()
  ↓
useScoreboardLogic.incrementScore()
  ↓
scoreboard.service.updateScore()
  ↓
Firebase updates /scoreboards/{id}/sets/{index}
  ↓
checkSetWinner() determines if set is won
  ↓
If winner: checkAndAdvanceSet()
  ↓
If match complete: completeScoreboard()
  ↓
Real-time listener triggers
  ↓
useScoreboardLogic receives update
  ↓
UI re-renders with new scores
```

### Submission Flow

```
Match completes
  ↓
scoreboard.status = "review"
  ↓
ReviewScoreModal appears
  ↓
Admin confirms
  ↓
submitScoreboardResults()
  ↓
Creates /submissions/{matchId}/{submissionId}
  ↓
Sets status to "pending"
  ↓
Marks scoreboard as "completed"
  ↓
Redirects to match page
  ↓
Admin approves via ScoreApprovalPanel
  ↓
Match updates with final score
  ↓
Winner advances in bracket
```

## Testing Guide

### Manual Testing Steps

1. **Create Scoreboard:**
   - Navigate to match page as admin
   - Click "Referee Match"
   - Verify scoreboard initializes with 0-0

2. **Score Update:**
   - Tap team 1 side → score increments
   - Tap team 2 side → score increments
   - Click "– Undo Point" → score decrements
   - Verify real-time sync in another tab

3. **Set Completion:**
   - Score team 1 to 21 points (with 2-point lead)
   - Verify set winner detected
   - Verify new set starts automatically
   - Verify set indicator updates

4. **Match Completion:**
   - Win required sets (e.g., 2 out of 3)
   - Verify review modal appears
   - Verify winner displayed correctly
   - Verify set breakdown accurate

5. **Submission:**
   - Click "Confirm & Submit"
   - Verify redirect to match page
   - Check Firebase `/submissions` for entry
   - Verify submission shows in ScoreApprovalPanel

6. **Read-Only Mode:**
   - Open scoreboard as non-admin
   - Verify scores display but cannot change
   - Verify controls are disabled

### Edge Cases

- **Concurrent Updates:** Multiple admins updating simultaneously
- **Network Loss:** Firebase handles offline/online automatically
- **Browser Refresh:** State is persisted in Firebase
- **Quit Mid-Match:** Scoreboard deleted, no data saved
- **Invalid Scores:** Prevented by validation logic

## Future Enhancements

### Potential Features

1. **Timeout Management**
   - Add timeout buttons for each team
   - Track remaining timeouts
   - Display timeout history

2. **Player Substitutions**
   - Track player rotations
   - Libero tracking
   - Substitution limits

3. **Statistics Tracking**
   - Aces, blocks, errors
   - Player-specific stats
   - Heat maps

4. **Video Integration**
   - Record match highlights
   - Link scores to video timestamps
   - Replay functionality

5. **Multi-Court Support**
   - Manage multiple scoreboards simultaneously
   - Court assignment
   - Referee scheduling

6. **Spectator Mode**
   - Public display boards
   - QR code access
   - Live streaming integration

7. **Voice Commands**
   - Hands-free scoring
   - Voice recognition
   - Accessibility enhancement

## Troubleshooting

### Common Issues

**Issue:** Scoreboard doesn't load
- **Cause:** Match not found or invalid ID
- **Solution:** Check matchId format, verify match exists

**Issue:** Scores not updating
- **Cause:** Permission denied or network issue
- **Solution:** Verify admin authentication, check Firebase connection

**Issue:** Winner not detected
- **Cause:** Rules not properly configured
- **Solution:** Check match.rules object, verify firstTo/winBy/cap values

**Issue:** Modal doesn't appear
- **Cause:** Status not set to "review"
- **Solution:** Check scoreboard.status in Firebase console

**Issue:** Submission fails
- **Cause:** Scoreboard not in review status
- **Solution:** Ensure match is complete and status is "review"

## File Structure

```
src/
├── components/
│   ├── scoreboard/
│   │   ├── ScoreSide.jsx                  # Team side UI
│   │   ├── ReviewScoreModal.jsx           # Review/submit modal
│   │   └── useScoreboardLogic.js          # State management hook
│   └── match/
│       └── MatchDetail.jsx                # Updated with referee button
├── pages/
│   └── ScoreboardPage.jsx                 # Main scoreboard page
├── services/
│   ├── scoreboard.service.js              # Scoreboard Firebase operations
│   └── match.service.js                   # Updated with getMatch()
├── utils/
│   └── constants.js                       # Updated with scoreboard constants
└── App.jsx                                 # Updated with scoreboard route

database.rules.json                         # Updated security rules
```

## Deployment

### Prerequisites
- Firebase CLI installed
- Admin authentication configured
- Match rules configured for all tournaments

### Steps

1. **Deploy Code:**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

2. **Deploy Database Rules:**
   ```bash
   firebase deploy --only database
   ```

3. **Verify Deployment:**
   - Test scoreboard creation as admin
   - Verify real-time sync
   - Test submission flow
   - Check Firebase console for data

## Performance Considerations

### Optimization

- **Real-Time Sync:** Firebase handles efficiently, minimal overhead
- **Component Rendering:** React memo for score components
- **Large Screens:** Responsive font sizes prevent layout issues
- **Touch Events:** Debounced to prevent accidental double-taps

### Scalability

- Scoreboards are match-specific (no global state)
- Automatic cleanup on completion
- Indexed queries for fast access
- Minimal data transfer (only score updates)

## Conclusion

The Interactive Scoreboard System provides a modern, intuitive interface for real-time match management in VolleyFlow. It seamlessly integrates with the existing tournament infrastructure while maintaining data integrity through Firebase security rules and admin approval workflows.

The system is production-ready, mobile-optimized, and designed for scalability.

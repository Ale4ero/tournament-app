# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**VolleyFlow** is a real-time volleyball tournament management web application with multi-organization support. Each organization can have multiple admins who manage tournaments specific to their organization. Public users (without authentication) can view live brackets and submit scores for approval.

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: TailwindCSS with custom utility classes
- **Backend**: Firebase Realtime Database
- **Auth**: Firebase Auth (admin-only)
- **Routing**: React Router v6

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (with hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Firebase (requires firebase-tools)
firebase deploy
firebase deploy --only database  # Deploy only database rules
firebase deploy --only hosting   # Deploy only hosting
```

## Architecture Overview

### Data Flow

1. **Public Score Submission**: Users submit scores → stored in `/submissions/{matchId}` with status "pending"
2. **Admin Approval**: Admin reviews → approves/rejects submission
3. **Auto-Advancement**: On approval → score moves to `/matches/{tournamentId}/{matchId}`, winner advances to next match
4. **Real-Time Updates**: Firebase listeners update UI instantly across all connected clients

### Firebase Realtime Database Structure

```
/organizations/{organizationId}
  - id, name, description, createdBy, createdAt
  - admins: { uid1: true, uid2: true, ... }

/tournaments/{tournamentId}
  - id, name, description, type, status, teams[], organizationId
  - createdAt, createdBy, startDate, endDate

/matches/{tournamentId}/{matchId}
  - id, tournamentId, round, matchNumber, team1, team2, score1, score2
  - winner, status, nextMatchId, isTeam1Winner, approvedAt, approvedBy

/submissions/{matchId}/{submissionId}
  - matchId, tournamentId, team1, team2, score1, score2
  - submittedBy, submittedAt, status (pending/approved/rejected)

/users/{uid}
  - email, role (admin), organizationId, createdAt
```

### Key Architectural Patterns

**Service Layer** (`src/services/`):
- All Firebase operations are abstracted into service modules
- `organization.service.js`: Organization CRUD, admin management
- `tournament.service.js`: CRUD for tournaments, organization filtering
- `match.service.js`: Match management, score submission/approval
- `auth.service.js`: Admin authentication, user profile management

**Real-Time Subscriptions**:
- Custom hooks (`useTournament`, `useMatches`, `useSubmissions`) subscribe to Firebase changes
- Components automatically re-render on data updates
- Clean up subscriptions on unmount

**Bracket Generation** (`src/utils/bracketGenerator.js`):
- Generates single-elimination brackets (power of 2 teams required)
- Links matches with `nextMatchId` for auto-advancement
- Supports random or manual seeding

**Authentication Context** (`src/contexts/AuthContext.jsx`):
- Manages admin auth state globally
- Provides `isAdmin` flag for conditional rendering
- Protects admin routes

### Component Organization

```
components/
├── layout/          # Header, Footer, Layout wrapper
├── organization/    # OrganizationForm (create/join organization)
├── tournament/      # TournamentList, TournamentCard, TournamentForm
├── bracket/         # BracketView, MatchCard (visual bracket display)
├── match/           # MatchDetail, ScoreSubmissionForm, ScoreApprovalPanel
├── admin/           # AdminDashboard
└── auth/            # LoginForm

pages/               # Route-level components
├── Home.jsx         # Public tournament list
├── TournamentView.jsx  # Public bracket view
├── MatchPage.jsx    # Match detail (public score submission)
├── OrganizationSetupPage.jsx  # Organization onboarding
├── AdminDashboardPage.jsx  # Admin panel
└── CreateTournamentPage.jsx  # Tournament creation form
```

## Important Implementation Details

### Organization Architecture

**Multi-Tenancy Model:**
- Each admin belongs to exactly one organization
- Each tournament belongs to exactly one organization
- Admins can only manage tournaments within their organization

**Onboarding Flow:**
1. New admin signs up → redirected to `/organization/setup`
2. Choose "Create Organization" or "Join Organization"
3. If creating → provide org name and description
4. If joining → select from existing organizations
5. User's `organizationId` is set in `/users/{uid}`
6. Redirect to `/admin` dashboard

**Data Isolation:**
- `subscribeTournamentsByOrganization()` filters tournaments by `organizationId`
- Admin dashboard only shows tournaments from their organization
- Security rules prevent cross-organization data access

**Organization Services:**
- `createOrganization()` - Creates org and sets creator as admin
- `addAdminToOrganization()` - Adds user to org admin list
- `subscribeOrganization()` - Real-time org data updates

### Tournament Creation

- Teams must be power of 2 (2, 4, 8, 16, etc.) for single elimination
- Validation happens in `TournamentForm.jsx:handleSubmit`
- Bracket is auto-generated on tournament creation via `bracketGenerator.js`

### Score Approval Flow

1. Public user submits via `ScoreSubmissionForm`
2. Score stored in `/submissions/{matchId}` with status "pending"
3. Admin sees submission in `ScoreApprovalPanel` (on match page)
4. Admin clicks "Approve" → triggers `approveScore()` in `match.service.js`
5. Service determines winner, updates match, advances winner to next match
6. All subscribed components update in real-time

### Winner Advancement

- Implemented in `advanceWinner()` in `bracketGenerator.js`
- Uses `nextMatchId` and `isTeam1Winner` to place winner correctly
- Next match's `team1` or `team2` is populated with winner's name

### Security Rules

- Tournaments and matches are **publicly readable**
- Only admins can write to tournaments and matches
- Submissions are **publicly writable** (no auth required)
- Only admins can read submissions
- Rules defined in `database.rules.json`

## Common Development Tasks

### Adding a New Tournament Type

1. Add constant to `src/utils/constants.js` (e.g., `DOUBLE_ELIMINATION`)
2. Create generator function in `src/utils/bracketGenerator.js`
3. Update `TournamentForm.jsx` to include new option
4. Modify `createTournament()` in `tournament.service.js` to handle new type

### Modifying Match Display

- Bracket tree layout: `src/components/bracket/BracketView.jsx`
- Individual match cards: `src/components/bracket/MatchCard.jsx`
- Match detail page: `src/components/match/MatchDetail.jsx`

### Adding New Admin Features

1. Create component in `src/components/admin/`
2. Add route in `src/App.jsx` under admin routes
3. Protect route with `useAuth()` check (see `AdminDashboardPage.jsx`)

### Customizing Styles

- Global styles: `src/index.css`
- TailwindCSS config: `tailwind.config.js`
- Custom utilities defined in `@layer components` in `index.css`
- Color palette uses `primary-*` scale (blue by default)

## Firebase Setup for New Developers

1. Create Firebase project at console.firebase.google.com
2. Enable Authentication → Email/Password provider
3. Enable Realtime Database
4. Copy config to `.env.local` (see `.env.local` template)
5. Create admin user in Firebase Auth
6. Manually add admin to `/users/{uid}` with `role: "admin"` in Realtime Database
7. Deploy rules: `firebase deploy --only database`

## Testing Locally

1. Set up Firebase project (see above)
2. Run `npm run dev`
3. Login as admin at `/login`
4. Create a test tournament with sample teams (see `src/utils/sampleData.js`)
5. Open match page in separate browser/incognito window
6. Submit score as public user
7. Approve as admin → verify bracket updates in real-time

## Troubleshooting

**"Permission denied" errors**:
- Check Firebase security rules are deployed
- Verify admin user has `role: "admin"` in `/users/{uid}`

**Bracket not generating**:
- Ensure teams count is power of 2
- Check console for errors in `bracketGenerator.js`

**Real-time updates not working**:
- Verify Firebase Realtime Database URL is correct in `.env.local`
- Check browser console for WebSocket connection errors

**Admin can't login**:
- Verify user exists in Firebase Auth
- Confirm user has admin role in Realtime Database `/users/{uid}`

## Flexible Playoff Advancement (NEW)

VolleyFlow now supports **any number of teams** advancing to playoffs, not just powers of 2!

### Key Features

- **Smart Format Suggestion**: System automatically recommends Auto-Byes or Play-In format
- **Auto-Byes**: Top seeds skip Round 1 and advance directly to Round 2
- **Play-In Matches**: Lowest seeds play extra matches to fill bracket to nearest power of 2
- **Admin Override**: Manual format selection available

### How to Use

1. **During Tournament Creation** (Pool Play + Playoffs):
   - Configure pools and teams advancing per pool
   - The **Playoff Advancement Rules** section appears automatically
   - System shows live suggestion with math breakdown
   - Choose format (defaults to suggested) or override

2. **The Math**:
   - For N teams (not power of 2):
     - **Lower Power**: Largest power of 2 ≤ N
     - **Higher Power**: Smallest power of 2 ≥ N
     - **Byes**: Higher - N teams idle
     - **Play-Ins**: (N - Lower) × 2 teams playing extra
   - Suggestion: Recommend format that impacts fewer teams

3. **Examples**:
   - **10 teams**: Play-In suggested (4 teams play extra vs 6 idle)
   - **12 teams**: Byes suggested (4 idle vs 8 playing extra)
   - **9 teams**: Play-In suggested (2 teams play extra vs 7 idle)

### Technical Details

**Services**:
- `src/services/advance.service.js` - Core algorithms and suggestion logic
- `src/services/bracket.service.js` - Bracket generation with byes/play-ins
- `generatePlayoffsFromStandings()` in `tournament.service.js` - Generate playoffs from pools

**Components**:
- `src/components/advance/AdvanceRulesForm.jsx` - Admin UI for configuration
- `src/components/advance/useAdvanceRules.js` - State management hook
- Updated `BracketView.jsx` - Displays play-in rounds separately (purple header)

**Schema**:
- `tournamentDrafts/{id}/advanceRules` - Stores configuration during setup
- `tournaments/{id}/advanceRules` - Persisted in tournament
- `tournaments/{id}/playoffs` - Generated bracket with seeds and rounds
- `matches/{tid}/{mid}` - Play-in matches have `roundName: "play-in"`

**Full Documentation**: See `ADVANCE_RULES.md` for detailed implementation guide

### No Breaking Changes

- Existing tournaments continue to work
- Single elimination tournaments unaffected
- Power-of-2 tournaments work as before (no byes/play-ins needed)

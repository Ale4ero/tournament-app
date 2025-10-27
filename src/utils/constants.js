// Tournament statuses
export const TOURNAMENT_STATUS = {
  UPCOMING: 'upcoming',
  LIVE: 'live',
  COMPLETED: 'completed',
};

// Match statuses
export const MATCH_STATUS = {
  UPCOMING: 'upcoming',
  LIVE: 'live',
  COMPLETED: 'completed',
};

// Submission statuses
export const SUBMISSION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

// Tournament types
export const TOURNAMENT_TYPE = {
  SINGLE_ELIMINATION: 'single-elimination',
  // Future: DOUBLE_ELIMINATION, ROUND_ROBIN, etc.
};

// Seeding types
export const SEEDING_TYPE = {
  MANUAL: 'manual',
  RANDOM: 'random',
};

// User roles
export const USER_ROLE = {
  ADMIN: 'admin',
};

// Database paths
export const DB_PATHS = {
  ORGANIZATIONS: 'organizations',
  TOURNAMENTS: 'tournaments',
  TOURNAMENT_DRAFTS: 'tournamentDrafts',
  MATCHES: 'matches',
  SUBMISSIONS: 'submissions',
  USERS: 'users',
  SCOREBOARDS: 'scoreboards',
};

// Default match rules for volleyball
export const DEFAULT_MATCH_RULES = {
  firstTo: 21,
  winBy: 2,
  cap: 30,
  bestOf: 3,
};

// Scoreboard statuses
export const SCOREBOARD_STATUS = {
  ACTIVE: 'active',
  REVIEW: 'review',
  COMPLETED: 'completed',
};

// Team colors for scoreboard
export const TEAM_COLORS = {
  RED: 'red',
  BLUE: 'blue',
};

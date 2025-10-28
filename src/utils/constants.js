// Tournament statuses
export const TOURNAMENT_STATUS = {
  UPCOMING: 'upcoming',
  LIVE: 'live',
  POOL_PLAY: 'pool_play',
  PLAYOFFS: 'playoffs',
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
  SINGLE_ELIMINATION: 'single_elimination',
  POOL_PLAY_BRACKET: 'pool_play_bracket',
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
  POOLS: 'pools',
};

// Pool statuses
export const POOL_STATUS = {
  UPCOMING: 'upcoming',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
};

// Match types
export const MATCH_TYPE = {
  POOL: 'pool',
  PLAYOFF: 'playoff',
};

// Default pool configuration
export const DEFAULT_POOL_CONFIG = {
  numPools: 2,
  pointsPerWin: 3,
  pointsPerLoss: 0,
  advancePerPool: 2,
  poolMatchRules: {
    firstTo: 25,
    winBy: 2,
    cap: 30,
    numSets: 2, // Number of sets per match (records based on sets won/lost, not matches)
  },
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

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
  TOURNAMENTS: 'tournaments',
  MATCHES: 'matches',
  SUBMISSIONS: 'submissions',
  USERS: 'users',
};

/**
 * Authorization utility functions for checking admin permissions
 */

/**
 * Check if the current user is an admin for a specific tournament
 * @param {Object} user - Current user object with organizationId
 * @param {Object} tournament - Tournament object with organizationId
 * @returns {boolean} - True if user is admin of the tournament's organization
 */
export function canManageTournament(user, tournament) {
  if (!user || !tournament) {
    return false;
  }

  // User must be an admin
  if (user.role !== 'admin') {
    return false;
  }

  // User must belong to the same organization as the tournament
  if (!user.organizationId || !tournament.organizationId) {
    return false;
  }

  return user.organizationId === tournament.organizationId;
}

/**
 * Check if the current user can approve scores for a match
 * @param {Object} user - Current user object with organizationId
 * @param {Object} tournament - Tournament object with organizationId
 * @returns {boolean} - True if user can approve scores
 */
export function canApproveScores(user, tournament) {
  // Same logic as tournament management for now
  return canManageTournament(user, tournament);
}

/**
 * Check if the current user can delete a tournament
 * @param {Object} user - Current user object with organizationId
 * @param {Object} tournament - Tournament object with organizationId
 * @returns {boolean} - True if user can delete the tournament
 */
export function canDeleteTournament(user, tournament) {
  // Same logic as tournament management for now
  return canManageTournament(user, tournament);
}

/**
 * Check if the current user can edit tournament configuration
 * @param {Object} user - Current user object with organizationId
 * @param {Object} tournament - Tournament object with organizationId
 * @returns {boolean} - True if user can edit tournament config
 */
export function canEditTournament(user, tournament) {
  // Same logic as tournament management for now
  return canManageTournament(user, tournament);
}

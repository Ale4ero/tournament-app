import { TOURNAMENT_STATUS } from './constants';

/**
 * Determines tournament status based on dates and matches
 * @param {number} startDate - Tournament start timestamp
 * @param {number} endDate - Tournament end timestamp
 * @param {Object[]} matches - All tournament matches
 * @returns {string} Tournament status
 */
export function getTournamentStatus(startDate, endDate, matches = []) {
  const now = Date.now();

  // Check if all matches are completed
  const allMatchesCompleted = matches.length > 0 && matches.every(m => m.status === 'completed');

  if (allMatchesCompleted || (endDate && now > endDate)) {
    return TOURNAMENT_STATUS.COMPLETED;
  }

  if (startDate && now >= startDate) {
    return TOURNAMENT_STATUS.LIVE;
  }

  return TOURNAMENT_STATUS.UPCOMING;
}

/**
 * Formats a timestamp to a readable date string
 * @param {number} timestamp - Timestamp in milliseconds
 * @returns {string} Formatted date string
 */
export function formatDate(timestamp) {
  if (!timestamp) return 'TBD';
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats a timestamp to a readable date and time string
 * @param {number} timestamp - Timestamp in milliseconds
 * @returns {string} Formatted date and time string
 */
export function formatDateTime(timestamp) {
  if (!timestamp) return 'TBD';
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

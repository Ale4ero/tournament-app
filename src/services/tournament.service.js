import { ref, push, set, get, update, remove, onValue, query, orderByChild } from 'firebase/database';
import { database } from './firebase';
import { DB_PATHS, TOURNAMENT_STATUS } from '../utils/constants';
import { generateSingleEliminationBracket } from '../utils/bracketGenerator';
import { getTournamentStatus } from '../utils/tournamentStatus';

/**
 * Create a new tournament
 * @param {Object} tournamentData - Tournament data
 * @param {string} adminUid - Admin user ID
 * @returns {Promise<string>} Tournament ID
 */
export async function createTournament(tournamentData, adminUid) {
  try {
    const tournamentRef = push(ref(database, DB_PATHS.TOURNAMENTS));
    const tournamentId = tournamentRef.key;

    const tournament = {
      id: tournamentId,
      ...tournamentData,
      status: TOURNAMENT_STATUS.UPCOMING,
      createdAt: Date.now(),
      createdBy: adminUid,
    };

    await set(tournamentRef, tournament);

    // Generate bracket if teams are provided
    if (tournamentData.teams && tournamentData.teams.length > 0) {
      const matches = generateSingleEliminationBracket(
        tournamentData.teams,
        tournamentId,
        tournamentData.seedingType || 'random'
      );

      // Save all matches
      const matchesRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}`);
      const matchesData = {};
      matches.forEach(match => {
        matchesData[match.id] = match;
      });
      await set(matchesRef, matchesData);
    }

    return tournamentId;
  } catch (error) {
    console.error('Error creating tournament:', error);
    throw error;
  }
}

/**
 * Get all tournaments
 * @returns {Promise<Object[]>} Array of tournaments
 */
export async function getAllTournaments() {
  try {
    const tournamentsRef = ref(database, DB_PATHS.TOURNAMENTS);
    const snapshot = await get(tournamentsRef);

    if (!snapshot.exists()) {
      return [];
    }

    const tournaments = [];
    snapshot.forEach((child) => {
      tournaments.push(child.val());
    });

    return tournaments.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error getting tournaments:', error);
    throw error;
  }
}

/**
 * Get tournament by ID
 * @param {string} tournamentId - Tournament ID
 * @returns {Promise<Object|null>} Tournament object or null
 */
export async function getTournamentById(tournamentId) {
  try {
    const tournamentRef = ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}`);
    const snapshot = await get(tournamentRef);

    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error getting tournament:', error);
    throw error;
  }
}

/**
 * Update tournament
 * @param {string} tournamentId - Tournament ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateTournament(tournamentId, updates) {
  try {
    const tournamentRef = ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}`);
    await update(tournamentRef, updates);
  } catch (error) {
    console.error('Error updating tournament:', error);
    throw error;
  }
}

/**
 * Delete tournament
 * @param {string} tournamentId - Tournament ID
 * @returns {Promise<void>}
 */
export async function deleteTournament(tournamentId) {
  try {
    // Delete tournament
    const tournamentRef = ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}`);
    await remove(tournamentRef);

    // Delete associated matches
    const matchesRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}`);
    await remove(matchesRef);

    // Delete associated submissions
    const submissionsRef = ref(database, `${DB_PATHS.SUBMISSIONS}`);
    const snapshot = await get(submissionsRef);
    if (snapshot.exists()) {
      const updates = {};
      snapshot.forEach((child) => {
        const submission = child.val();
        if (submission.tournamentId === tournamentId) {
          updates[child.key] = null;
        }
      });
      await update(submissionsRef, updates);
    }
  } catch (error) {
    console.error('Error deleting tournament:', error);
    throw error;
  }
}

/**
 * Subscribe to tournament updates
 * @param {string} tournamentId - Tournament ID
 * @param {Function} callback - Callback function with tournament data
 * @returns {Function} Unsubscribe function
 */
export function subscribeTournament(tournamentId, callback) {
  const tournamentRef = ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}`);
  return onValue(tournamentRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
}

/**
 * Subscribe to all tournaments
 * @param {Function} callback - Callback function with tournaments array
 * @returns {Function} Unsubscribe function
 */
export function subscribeTournaments(callback) {
  const tournamentsRef = ref(database, DB_PATHS.TOURNAMENTS);
  return onValue(tournamentsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const tournaments = [];
    snapshot.forEach((child) => {
      tournaments.push(child.val());
    });

    callback(tournaments.sort((a, b) => b.createdAt - a.createdAt));
  });
}

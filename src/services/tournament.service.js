import { ref, push, set, get, update, remove, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { database } from './firebase';
import { DB_PATHS, TOURNAMENT_STATUS, TOURNAMENT_TYPE } from '../utils/constants';
import { generateSingleEliminationBracket, generateDefaultMatchRules } from '../utils/bracketGenerator';
import { getTournamentStatus } from '../utils/tournamentStatus';
import { createPools, generatePoolMatches, initializePoolStandings, recalculatePoolRanks } from './pool.service';
import { generateAndSavePlayoffs } from './bracket.service';
import { buildSeeds } from './advance.service';

/**
 * Create a tournament draft (basic info without bracket)
 * @param {Object} draftData - Draft tournament data
 * @param {string} adminUid - Admin user ID
 * @param {string} organizationId - Organization ID
 * @returns {Promise<string>} Draft ID
 */
export async function createTournamentDraft(draftData, adminUid, organizationId) {
  try {
    const draftRef = push(ref(database, DB_PATHS.TOURNAMENT_DRAFTS));
    const draftId = draftRef.key;

    const draft = {
      id: draftId,
      ...draftData,
      organizationId,
      createdBy: adminUid,
      createdAt: Date.now(),
      step: 'basic',
    };

    await set(draftRef, draft);
    return draftId;
  } catch (error) {
    console.error('Error creating tournament draft:', error);
    throw error;
  }
}

/**
 * Get tournament draft by ID
 * @param {string} draftId - Draft ID
 * @returns {Promise<Object|null>} Draft object or null
 */
export async function getTournamentDraft(draftId) {
  try {
    const draftRef = ref(database, `${DB_PATHS.TOURNAMENT_DRAFTS}/${draftId}`);
    const snapshot = await get(draftRef);
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error getting tournament draft:', error);
    throw error;
  }
}

/**
 * Update tournament draft
 * @param {string} draftId - Draft ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateTournamentDraft(draftId, updates) {
  try {
    const draftRef = ref(database, `${DB_PATHS.TOURNAMENT_DRAFTS}/${draftId}`);
    await update(draftRef, updates);
  } catch (error) {
    console.error('Error updating tournament draft:', error);
    throw error;
  }
}

/**
 * Delete tournament draft
 * @param {string} draftId - Draft ID
 * @returns {Promise<void>}
 */
export async function deleteTournamentDraft(draftId) {
  try {
    const draftRef = ref(database, `${DB_PATHS.TOURNAMENT_DRAFTS}/${draftId}`);
    await remove(draftRef);
  } catch (error) {
    console.error('Error deleting tournament draft:', error);
    throw error;
  }
}

/**
 * Create a new tournament from draft with match rules
 * @param {string} draftId - Draft ID
 * @param {Object} matchRules - Match rules per round
 * @returns {Promise<string>} Tournament ID
 */
export async function createTournamentFromDraft(draftId, matchRules) {
  try {
    // Get draft data
    const draft = await getTournamentDraft(draftId);
    if (!draft) {
      throw new Error('Draft not found');
    }

    // Create tournament
    const tournamentRef = push(ref(database, DB_PATHS.TOURNAMENTS));
    const tournamentId = tournamentRef.key;

    const tournament = {
      id: tournamentId,
      name: draft.name,
      description: draft.description,
      type: draft.type,
      seedingType: draft.seedingType || 'manual', // Default to manual since admin controls seeding
      startDate: draft.startDate,
      teams: draft.teams,
      matchRules,
      advanceRules: draft.advanceRules || null, // Include advance rules if present
      organizationId: draft.organizationId,
      status: TOURNAMENT_STATUS.UPCOMING,
      createdAt: Date.now(),
      createdBy: draft.createdBy,
    };

    // Only include endDate if it exists in the draft
    if (draft.endDate) {
      tournament.endDate = draft.endDate;
    }

    await set(tournamentRef, tournament);

    // Generate bracket with flexible advancement
    if (draft.teams && draft.teams.length > 0) {
      // Use flexible bracket generation if advance rules exist
      if (draft.advanceRules && draft.advanceRules.math) {
        // Build seeds from teams (manual seeding order)
        const seeds = buildSeeds(
          draft.teams.map((team, index) => ({
            teamId: `team_${index}`,
            teamName: team,
            rank: index + 1,
          }))
        );

        // Generate playoffs with advance rules
        await generateAndSavePlayoffs({
          tournamentId,
          seeds,
          format: draft.advanceRules.formatChosen || draft.advanceRules.suggestedFormat || 'byes',
          math: draft.advanceRules.math,
          rules: matchRules,
        });
      } else {
        // Fallback to old method for backwards compatibility
        const matches = generateSingleEliminationBracket(
          draft.teams,
          tournamentId,
          draft.seedingType || 'random',
          matchRules
        );

        // Save all matches
        const matchesRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}`);
        const matchesData = {};
        matches.forEach(match => {
          matchesData[match.id] = match;
        });
        await set(matchesRef, matchesData);
      }
    }

    // Delete draft
    await deleteTournamentDraft(draftId);

    return tournamentId;
  } catch (error) {
    console.error('Error creating tournament from draft:', error);
    throw error;
  }
}

/**
 * Create a Pool Play + Bracket tournament from draft
 * @param {string} draftId - Draft ID
 * @param {Object} poolConfig - Pool configuration (numPools, advancePerPool, etc.)
 * @param {Object} playoffConfig - Playoff bracket configuration (matchRules per round)
 * @returns {Promise<string>} Tournament ID
 */
export async function createPoolPlayTournamentFromDraft(draftId, poolConfig, playoffConfig) {
  try {
    // Get draft data
    const draft = await getTournamentDraft(draftId);
    if (!draft) {
      throw new Error('Draft not found');
    }

    // Create tournament
    const tournamentRef = push(ref(database, DB_PATHS.TOURNAMENTS));
    const tournamentId = tournamentRef.key;

    const tournament = {
      id: tournamentId,
      name: draft.name,
      description: draft.description,
      type: TOURNAMENT_TYPE.POOL_PLAY_BRACKET,
      seedingType: draft.seedingType || 'manual', // Default to manual since admin controls seeding
      startDate: draft.startDate,
      teams: draft.teams,
      poolConfig,
      playoffConfig,
      advanceRules: draft.advanceRules || null, // Include advance rules from draft
      organizationId: draft.organizationId,
      status: TOURNAMENT_STATUS.UPCOMING,
      createdAt: Date.now(),
      createdBy: draft.createdBy,
      poolPlayCompletedAt: null,
      playoffsStartedAt: null,
    };

    // Only include endDate if it exists in the draft
    if (draft.endDate) {
      tournament.endDate = draft.endDate;
    }

    await set(tournamentRef, tournament);

    // Create pools and distribute teams using seed order if available
    const seedOrder = draft.seedOrder || draft.teams; // Use seed order if it exists, otherwise use teams array
    const poolAssignments = await createPools(tournamentId, draft.teams, poolConfig.numPools, seedOrder);

    // Generate matches for each pool
    for (const [poolId, poolData] of Object.entries(poolAssignments)) {
      await generatePoolMatches(tournamentId, poolId, poolData.teams, poolConfig.poolMatchRules);
      await initializePoolStandings(tournamentId, poolId, poolData.teams, poolData.teamSeeds);
      // Recalculate ranks to set initial rankings (1, 2, 3, etc.)
      await recalculatePoolRanks(tournamentId, poolId);
    }

    // Delete draft
    await deleteTournamentDraft(draftId);

    return tournamentId;
  } catch (error) {
    console.error('Error creating pool play tournament from draft:', error);
    throw error;
  }
}

/**
 * Create a new tournament (legacy support - without match rules configuration)
 * @param {Object} tournamentData - Tournament data
 * @param {string} adminUid - Admin user ID
 * @param {string} organizationId - Organization ID
 * @returns {Promise<string>} Tournament ID
 */
export async function createTournament(tournamentData, adminUid, organizationId) {
  try {
    const tournamentRef = push(ref(database, DB_PATHS.TOURNAMENTS));
    const tournamentId = tournamentRef.key;

    // Generate default match rules if not provided
    const matchRules = tournamentData.matchRules ||
      (tournamentData.teams ? generateDefaultMatchRules(tournamentData.teams.length) : {});

    const tournament = {
      id: tournamentId,
      name: tournamentData.name,
      description: tournamentData.description,
      type: tournamentData.type,
      seedingType: tournamentData.seedingType || 'manual', // Default to manual since admin controls seeding
      startDate: tournamentData.startDate,
      teams: tournamentData.teams,
      matchRules,
      organizationId,
      status: TOURNAMENT_STATUS.UPCOMING,
      createdAt: Date.now(),
      createdBy: adminUid,
    };

    // Only include endDate if it's provided
    if (tournamentData.endDate) {
      tournament.endDate = tournamentData.endDate;
    }

    await set(tournamentRef, tournament);

    // Generate bracket if teams are provided
    if (tournamentData.teams && tournamentData.teams.length > 0) {
      const matches = generateSingleEliminationBracket(
        tournamentData.teams,
        tournamentId,
        tournamentData.seedingType || 'random',
        matchRules
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

    // Delete associated pools (for pool play tournaments)
    const poolsRef = ref(database, `pools/${tournamentId}`);
    await remove(poolsRef);

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
  return onValue(
    tournamentsRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }

      const tournaments = [];
      snapshot.forEach((child) => {
        tournaments.push(child.val());
      });

      callback(tournaments.sort((a, b) => b.createdAt - a.createdAt));
    },
    (error) => {
      console.error('Error subscribing to tournaments:', error);
      callback([]);
    }
  );
}

/**
 * Get tournaments by organization ID
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Object[]>} Array of tournaments
 */
export async function getTournamentsByOrganization(organizationId) {
  try {
    const tournamentsRef = ref(database, DB_PATHS.TOURNAMENTS);
    const orgQuery = query(tournamentsRef, orderByChild('organizationId'), equalTo(organizationId));
    const snapshot = await get(orgQuery);

    if (!snapshot.exists()) {
      return [];
    }

    const tournaments = [];
    snapshot.forEach((child) => {
      tournaments.push(child.val());
    });

    return tournaments.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error getting organization tournaments:', error);
    throw error;
  }
}

/**
 * Subscribe to tournaments for an organization
 * @param {string} organizationId - Organization ID
 * @param {Function} callback - Callback function with tournaments array
 * @returns {Function} Unsubscribe function
 */
export function subscribeTournamentsByOrganization(organizationId, callback) {
  const tournamentsRef = ref(database, DB_PATHS.TOURNAMENTS);
  const orgQuery = query(tournamentsRef, orderByChild('organizationId'), equalTo(organizationId));

  return onValue(orgQuery, (snapshot) => {
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

/**
 * Generate playoffs from pool standings with flexible advance rules
 * @param {string} tournamentId - Tournament ID
 * @param {Array<Object>} standings - Ordered standings with { teamId, teamName, rank }
 * @param {Object} advanceRules - Advance rules from draft (format, math)
 * @param {Object} matchRules - Match rules for playoff rounds
 * @returns {Promise<void>}
 */
export async function generatePlayoffsFromStandings(tournamentId, standings, advanceRules, matchRules) {
  try {
    // Build seeds from standings
    const seeds = buildSeeds(standings);

    // Generate and save playoffs using advance rules
    const { formatChosen, math } = advanceRules;
    await generateAndSavePlayoffs({
      tournamentId,
      seeds,
      format: formatChosen || 'byes',
      math,
      rules: matchRules,
    });

    // Update tournament status to playoffs
    await update(ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}`), {
      status: TOURNAMENT_STATUS.PLAYOFFS,
      phase: 'playoffs',
      playoffsStartedAt: Date.now(),
    });
  } catch (error) {
    console.error('Error generating playoffs from standings:', error);
    throw error;
  }
}

import { ref, set, get, update, remove, onValue, serverTimestamp } from 'firebase/database';
import { database } from './firebase';
import { DB_PATHS, SCOREBOARD_STATUS, TEAM_COLORS, DEFAULT_MATCH_RULES } from '../utils/constants';

/**
 * Create a new scoreboard for a match
 * @param {Object} match - Match object
 * @param {string} userId - User ID starting the scoreboard
 * @returns {Promise<string>} Scoreboard ID
 */
export async function createScoreboard(match, userId) {
  try {
    const scoreboardId = match.id;
    const scoreboardRef = ref(database, `${DB_PATHS.SCOREBOARDS}/${scoreboardId}`);

    // Check if scoreboard already exists
    const existingSnapshot = await get(scoreboardRef);
    if (existingSnapshot.exists()) {
      const existing = existingSnapshot.val();
      if (existing.status !== SCOREBOARD_STATUS.COMPLETED) {
        // Return existing active scoreboard
        return scoreboardId;
      }
    }

    const rules = match.rules || DEFAULT_MATCH_RULES;

    // Initialize first set
    const initialSet = {
      setNumber: 1,
      team1Score: 0,
      team2Score: 0,
      winner: null,
    };

    const scoreboard = {
      matchId: match.id,
      tournamentId: match.tournamentId,
      team1: match.team1 || 'Team 1',
      team2: match.team2 || 'Team 2',
      team1Color: TEAM_COLORS.RED,
      team2Color: TEAM_COLORS.BLUE,
      currentSet: 1,
      sets: [initialSet],
      team1SetsWon: 0,
      team2SetsWon: 0,
      status: SCOREBOARD_STATUS.ACTIVE,
      winner: null,
      startedAt: Date.now(),
      startedBy: userId,
      lastUpdated: Date.now(),
      lastUpdatedBy: userId,
      rules,
      locked: false,
    };

    await set(scoreboardRef, scoreboard);

    // Update match to reference scoreboard
    const matchRef = ref(database, `${DB_PATHS.MATCHES}/${match.tournamentId}/${match.id}`);
    await update(matchRef, {
      scoreboardId,
      hasLiveScoreboard: true,
    });

    return scoreboardId;
  } catch (error) {
    console.error('Error creating scoreboard:', error);
    throw error;
  }
}

/**
 * Get scoreboard by ID
 * @param {string} scoreboardId - Scoreboard ID
 * @returns {Promise<Object|null>} Scoreboard object or null
 */
export async function getScoreboard(scoreboardId) {
  try {
    const scoreboardRef = ref(database, `${DB_PATHS.SCOREBOARDS}/${scoreboardId}`);
    const snapshot = await get(scoreboardRef);
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error getting scoreboard:', error);
    throw error;
  }
}

/**
 * Subscribe to scoreboard updates
 * @param {string} scoreboardId - Scoreboard ID
 * @param {Function} callback - Callback function with scoreboard data
 * @returns {Function} Unsubscribe function
 */
export function subscribeScoreboard(scoreboardId, callback) {
  const scoreboardRef = ref(database, `${DB_PATHS.SCOREBOARDS}/${scoreboardId}`);
  return onValue(scoreboardRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
}

/**
 * Update score for a team in the current set
 * @param {string} scoreboardId - Scoreboard ID
 * @param {string} team - 'team1' or 'team2'
 * @param {number} newScore - New score value
 * @param {string} userId - User ID making the update
 * @returns {Promise<void>}
 */
export async function updateScore(scoreboardId, team, newScore, userId) {
  try {
    const scoreboard = await getScoreboard(scoreboardId);
    if (!scoreboard) {
      throw new Error('Scoreboard not found');
    }

    if (scoreboard.locked || scoreboard.status !== SCOREBOARD_STATUS.ACTIVE) {
      throw new Error('Scoreboard is locked');
    }

    const currentSetIndex = scoreboard.currentSet - 1;
    const currentSet = scoreboard.sets[currentSetIndex];

    if (!currentSet) {
      throw new Error('Current set not found');
    }

    // Update the score
    const scoreField = team === 'team1' ? 'team1Score' : 'team2Score';
    currentSet[scoreField] = newScore;

    // Check if set is won
    const setWinner = checkSetWinner(currentSet, scoreboard.rules);
    if (setWinner) {
      currentSet.winner = setWinner;
    }

    const scoreboardRef = ref(database, `${DB_PATHS.SCOREBOARDS}/${scoreboardId}`);
    await update(scoreboardRef, {
      [`sets/${currentSetIndex}`]: currentSet,
      lastUpdated: Date.now(),
      lastUpdatedBy: userId,
    });

    // If set is won, check if match is won
    if (setWinner) {
      await checkAndAdvanceSet(scoreboardId, userId);
    }
  } catch (error) {
    console.error('Error updating score:', error);
    throw error;
  }
}

/**
 * Check if a set has a winner
 * @param {Object} set - Set object
 * @param {Object} rules - Match rules
 * @returns {string|null} 'team1', 'team2', or null
 */
function checkSetWinner(set, rules) {
  const { team1Score, team2Score } = set;
  const { firstTo, winBy, cap } = rules;

  // Check if either team reached the cap
  if (team1Score >= cap) {
    return team1Score > team2Score ? 'team1' : team2Score > team1Score ? 'team2' : null;
  }
  if (team2Score >= cap) {
    return team2Score > team1Score ? 'team2' : team1Score > team2Score ? 'team1' : null;
  }

  // Check if either team reached firstTo AND has winBy lead
  if (team1Score >= firstTo && team1Score - team2Score >= winBy) {
    return 'team1';
  }
  if (team2Score >= firstTo && team2Score - team1Score >= winBy) {
    return 'team2';
  }

  return null;
}

/**
 * Check if match is won and advance to next set or complete
 * @param {string} scoreboardId - Scoreboard ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function checkAndAdvanceSet(scoreboardId, userId) {
  try {
    const scoreboard = await getScoreboard(scoreboardId);
    if (!scoreboard) return;

    // Count sets won
    let team1SetsWon = 0;
    let team2SetsWon = 0;

    scoreboard.sets.forEach((set) => {
      if (set.winner === 'team1') team1SetsWon++;
      if (set.winner === 'team2') team2SetsWon++;
    });

    // Determine match completion based on format
    const totalSets = scoreboard.rules.numSets || scoreboard.rules.bestOf;
    const usesBestOf = scoreboard.rules.bestOf !== undefined && scoreboard.rules.numSets === undefined;

    if (usesBestOf) {
      // Best-of format: match ends when one team wins majority
      const setsToWin = Math.ceil(scoreboard.rules.bestOf / 2);

      if (team1SetsWon >= setsToWin) {
        await completeScoreboard(scoreboardId, 'team1', userId, team1SetsWon, team2SetsWon);
        return;
      }
      if (team2SetsWon >= setsToWin) {
        await completeScoreboard(scoreboardId, 'team2', userId, team1SetsWon, team2SetsWon);
        return;
      }
    } else {
      // Fixed number of sets: match ends after all sets played (ties allowed)
      if (scoreboard.currentSet >= totalSets) {
        const currentSet = scoreboard.sets[scoreboard.currentSet - 1];
        if (currentSet.winner) {
          // All sets complete - determine winner or tie
          const winner = team1SetsWon > team2SetsWon ? 'team1' :
                        team2SetsWon > team1SetsWon ? 'team2' : null; // null = tie
          await completeScoreboard(scoreboardId, winner, userId, team1SetsWon, team2SetsWon);
          return;
        }
      }
    }

    // Advance to next set if current set is complete
    const currentSet = scoreboard.sets[scoreboard.currentSet - 1];
    if (currentSet.winner && scoreboard.currentSet < totalSets) {
      const nextSetNumber = scoreboard.currentSet + 1;
      const newSet = {
        setNumber: nextSetNumber,
        team1Score: 0,
        team2Score: 0,
        winner: null,
      };

      const scoreboardRef = ref(database, `${DB_PATHS.SCOREBOARDS}/${scoreboardId}`);
      await update(scoreboardRef, {
        currentSet: nextSetNumber,
        [`sets/${nextSetNumber - 1}`]: newSet,
        team1SetsWon,
        team2SetsWon,
        lastUpdated: Date.now(),
        lastUpdatedBy: userId,
      });
    }
  } catch (error) {
    console.error('Error checking and advancing set:', error);
    throw error;
  }
}

/**
 * Complete the scoreboard and mark as ready for review
 * @param {string} scoreboardId - Scoreboard ID
 * @param {string} winner - 'team1' or 'team2'
 * @param {string} userId - User ID
 * @param {number} team1SetsWon - Final count of sets won by team1
 * @param {number} team2SetsWon - Final count of sets won by team2
 * @returns {Promise<void>}
 */
async function completeScoreboard(scoreboardId, winner, userId, team1SetsWon, team2SetsWon) {
  try {
    const scoreboardRef = ref(database, `${DB_PATHS.SCOREBOARDS}/${scoreboardId}`);
    await update(scoreboardRef, {
      status: SCOREBOARD_STATUS.REVIEW,
      winner,
      team1SetsWon,
      team2SetsWon,
      locked: true,
      lastUpdated: Date.now(),
      lastUpdatedBy: userId,
    });
  } catch (error) {
    console.error('Error completing scoreboard:', error);
    throw error;
  }
}

/**
 * Submit final score from scoreboard to match
 * @param {string} scoreboardId - Scoreboard ID
 * @param {string} userId - User ID submitting
 * @returns {Promise<void>}
 */
export async function submitScoreboardResults(scoreboardId, userId) {
  try {
    const scoreboard = await getScoreboard(scoreboardId);
    if (!scoreboard) {
      throw new Error('Scoreboard not found');
    }

    if (scoreboard.status !== SCOREBOARD_STATUS.REVIEW) {
      throw new Error('Scoreboard must be in review status');
    }

    // Determine final scores based on match format
    let score1, score2;
    const totalSets = scoreboard.rules.numSets || scoreboard.rules.bestOf || 1;

    if (totalSets > 1) {
      // For multi-set matches, use sets won as the final score
      score1 = scoreboard.team1SetsWon;
      score2 = scoreboard.team2SetsWon;
    } else {
      // For single-set matches, use the point total from the only set
      const firstSet = scoreboard.sets[0];
      score1 = firstSet ? firstSet.team1Score : 0;
      score2 = firstSet ? firstSet.team2Score : 0;
    }

    // Transform sets data to match expected format (score1, score2, set, winner)
    const transformedSets = scoreboard.sets.map((set, index) => ({
      set: set.setNumber || index + 1,
      score1: set.team1Score,
      score2: set.team2Score,
      winner: set.winner === 'team1' ? scoreboard.team1 : (set.winner === 'team2' ? scoreboard.team2 : null),
    }));

    // Create submission entry
    const submissionRef = ref(database, `${DB_PATHS.SUBMISSIONS}/${scoreboard.matchId}/${Date.now()}`);
    await set(submissionRef, {
      matchId: scoreboard.matchId,
      tournamentId: scoreboard.tournamentId,
      team1: scoreboard.team1,
      team2: scoreboard.team2,
      score1,
      score2,
      submittedBy: userId,
      submittedAt: Date.now(),
      status: 'pending',
      source: 'scoreboard',
      scoreboardId,
      setScores: transformedSets,
    });

    // Mark scoreboard as completed
    const scoreboardRef = ref(database, `${DB_PATHS.SCOREBOARDS}/${scoreboardId}`);
    await update(scoreboardRef, {
      status: SCOREBOARD_STATUS.COMPLETED,
      lastUpdated: Date.now(),
      lastUpdatedBy: userId,
    });

    // Update match (optional - may fail if user is not admin)
    try {
      const matchRef = ref(database, `${DB_PATHS.MATCHES}/${scoreboard.tournamentId}/${scoreboard.matchId}`);
      await update(matchRef, {
        hasLiveScoreboard: false,
      });
    } catch (matchUpdateError) {
      // Silently fail - not critical for submission
      console.warn('Could not update match hasLiveScoreboard flag:', matchUpdateError);
    }
  } catch (error) {
    console.error('Error submitting scoreboard results:', error);
    throw error;
  }
}

/**
 * Reset the current set scores
 * @param {string} scoreboardId - Scoreboard ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function resetCurrentSet(scoreboardId, userId) {
  try {
    const scoreboard = await getScoreboard(scoreboardId);
    if (!scoreboard || scoreboard.locked) {
      throw new Error('Cannot reset locked scoreboard');
    }

    const currentSetIndex = scoreboard.currentSet - 1;
    const scoreboardRef = ref(database, `${DB_PATHS.SCOREBOARDS}/${scoreboardId}`);

    await update(scoreboardRef, {
      [`sets/${currentSetIndex}/team1Score`]: 0,
      [`sets/${currentSetIndex}/team2Score`]: 0,
      [`sets/${currentSetIndex}/winner`]: null,
      lastUpdated: Date.now(),
      lastUpdatedBy: userId,
    });
  } catch (error) {
    console.error('Error resetting current set:', error);
    throw error;
  }
}

/**
 * Delete scoreboard
 * @param {string} scoreboardId - Scoreboard ID
 * @returns {Promise<void>}
 */
export async function deleteScoreboard(scoreboardId) {
  try {
    const scoreboard = await getScoreboard(scoreboardId);
    if (!scoreboard) return;

    // Remove scoreboard reference from match
    const matchRef = ref(database, `${DB_PATHS.MATCHES}/${scoreboard.tournamentId}/${scoreboard.matchId}`);
    await update(matchRef, {
      scoreboardId: null,
      hasLiveScoreboard: false,
    });

    // Delete scoreboard
    const scoreboardRef = ref(database, `${DB_PATHS.SCOREBOARDS}/${scoreboardId}`);
    await remove(scoreboardRef);
  } catch (error) {
    console.error('Error deleting scoreboard:', error);
    throw error;
  }
}

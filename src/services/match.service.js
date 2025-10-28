import { ref, push, set, get, update, onValue } from 'firebase/database';
import { database } from './firebase';
import { DB_PATHS, MATCH_STATUS, SUBMISSION_STATUS, MATCH_TYPE } from '../utils/constants';
import { determineWinner, advanceWinner } from '../utils/bracketGenerator';
import { updateTournament, getTournamentById } from './tournament.service';
import { updatePoolStandings } from './pool.service';

/**
 * Update tournament status based on match completion
 * @param {string} tournamentId - Tournament ID
 */
async function updateTournamentStatus(tournamentId) {
  try {
    const tournament = await getTournamentById(tournamentId);
    const allMatches = await getMatchesByTournament(tournamentId);
    const isPoolPlayTournament = tournament.type === 'pool_play_bracket';

    if (isPoolPlayTournament) {
      // For pool play tournaments, check pool vs playoff matches separately
      const poolMatches = allMatches.filter(m => m.matchType === 'pool');
      const playoffMatches = allMatches.filter(m => m.matchType === 'playoff');

      const allPoolMatchesComplete = poolMatches.length > 0 && poolMatches.every(m => m.status === MATCH_STATUS.COMPLETED);
      const anyPoolMatchesComplete = poolMatches.some(m => m.status === MATCH_STATUS.COMPLETED);
      const allPlayoffMatchesComplete = playoffMatches.length > 0 && playoffMatches.every(m => m.status === MATCH_STATUS.COMPLETED);

      if (allPlayoffMatchesComplete) {
        console.log('All playoff matches completed - updating tournament to completed');
        await updateTournament(tournamentId, { status: 'completed' });
      } else if (allPoolMatchesComplete && tournament.status !== 'playoffs') {
        console.log('All pool matches completed - updating tournament to pool_play');
        await updateTournament(tournamentId, { status: 'pool_play' });
      } else if (anyPoolMatchesComplete && tournament.status === 'upcoming') {
        console.log('Pool matches started - updating to pool_play');
        await updateTournament(tournamentId, { status: 'pool_play' });
      }
    } else {
      // Single elimination: use original logic
      const allCompleted = allMatches.every(m => m.status === MATCH_STATUS.COMPLETED);
      const anyCompleted = allMatches.some(m => m.status === MATCH_STATUS.COMPLETED);

      if (allCompleted) {
        console.log('All matches completed - updating tournament to completed');
        await updateTournament(tournamentId, { status: 'completed' });
      } else if (anyCompleted) {
        console.log('Tournament has active matches - updating to live');
        await updateTournament(tournamentId, { status: 'live' });
      }
    }
  } catch (error) {
    console.error('Error updating tournament status:', error);
  }
}

/**
 * Get all matches for a tournament
 * @param {string} tournamentId - Tournament ID
 * @returns {Promise<Object[]>} Array of matches
 */
export async function getMatchesByTournament(tournamentId) {
  try {
    const matchesRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}`);
    const snapshot = await get(matchesRef);

    if (!snapshot.exists()) {
      return [];
    }

    const matches = [];
    snapshot.forEach((child) => {
      matches.push(child.val());
    });

    return matches.sort((a, b) => a.matchNumber - b.matchNumber);
  } catch (error) {
    console.error('Error getting matches:', error);
    throw error;
  }
}

/**
 * Get match by ID
 * @param {string} tournamentId - Tournament ID
 * @param {string} matchId - Match ID
 * @returns {Promise<Object|null>} Match object or null
 */
export async function getMatchById(tournamentId, matchId) {
  try {
    const matchRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}/${matchId}`);
    const snapshot = await get(matchRef);

    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error getting match:', error);
    throw error;
  }
}

/**
 * Get match by ID (searches across all tournaments)
 * @param {string} matchId - Match ID
 * @returns {Promise<Object|null>} Match object or null
 */
export async function getMatch(matchId) {
  try {
    console.log('getMatch called with matchId:', matchId);

    // matchId formats:
    // - Playoff: tournamentId_rX_mY
    // - Pool: tournamentId_poolId_mX (e.g., tournament123_pool_A_m1)
    // Extract tournament ID (everything before the first underscore followed by 'r' or 'pool')
    let tournamentId;

    if (matchId.includes('_r')) {
      // Playoff match: split on _r
      tournamentId = matchId.split('_r')[0];
      console.log('Detected playoff match, tournamentId:', tournamentId);
    } else if (matchId.includes('_pool')) {
      // Pool match: split on _pool
      tournamentId = matchId.split('_pool')[0];
      console.log('Detected pool match, tournamentId:', tournamentId);
    } else {
      // Fallback: try to extract from path parts
      const parts = matchId.split('_');
      tournamentId = parts[0]; // Assume first part is tournament ID
      console.log('Fallback extraction, tournamentId:', tournamentId);
    }

    console.log('Calling getMatchById with:', tournamentId, matchId);
    const match = await getMatchById(tournamentId, matchId);
    console.log('Match retrieved:', match);

    return match;
  } catch (error) {
    console.error('Error getting match:', error);
    throw error;
  }
}

/**
 * Submit a score (public users)
 * @param {string} matchId - Match ID
 * @param {Object} scoreData - Score submission data
 * @returns {Promise<string>} Submission ID
 */
export async function submitScore(matchId, scoreData) {
  try {
    const submissionRef = push(ref(database, `${DB_PATHS.SUBMISSIONS}/${matchId}`));
    const submissionId = submissionRef.key;

    const submission = {
      id: submissionId,
      ...scoreData,
      submittedAt: Date.now(),
      status: SUBMISSION_STATUS.PENDING,
    };

    await set(submissionRef, submission);
    return submissionId;
  } catch (error) {
    console.error('Error submitting score:', error);
    throw error;
  }
}

/**
 * Get pending submissions for a match
 * @param {string} matchId - Match ID
 * @returns {Promise<Object[]>} Array of pending submissions
 */
export async function getPendingSubmissions(matchId) {
  try {
    const submissionsRef = ref(database, `${DB_PATHS.SUBMISSIONS}/${matchId}`);
    const snapshot = await get(submissionsRef);

    if (!snapshot.exists()) {
      return [];
    }

    const submissions = [];
    snapshot.forEach((child) => {
      const submission = child.val();
      if (submission.status === SUBMISSION_STATUS.PENDING) {
        submissions.push(submission);
      }
    });

    return submissions.sort((a, b) => b.submittedAt - a.submittedAt);
  } catch (error) {
    console.error('Error getting pending submissions:', error);
    throw error;
  }
}

/**
 * Get all pending submissions across all matches
 * @returns {Promise<Object[]>} Array of all pending submissions
 */
export async function getAllPendingSubmissions() {
  try {
    const submissionsRef = ref(database, DB_PATHS.SUBMISSIONS);
    const snapshot = await get(submissionsRef);

    if (!snapshot.exists()) {
      return [];
    }

    const allSubmissions = [];
    snapshot.forEach((matchChild) => {
      matchChild.forEach((submissionChild) => {
        const submission = submissionChild.val();
        if (submission.status === SUBMISSION_STATUS.PENDING) {
          allSubmissions.push(submission);
        }
      });
    });

    return allSubmissions.sort((a, b) => b.submittedAt - a.submittedAt);
  } catch (error) {
    console.error('Error getting all pending submissions:', error);
    throw error;
  }
}

/**
 * Approve a score submission and update match (admin only)
 * @param {string} matchId - Match ID
 * @param {string} submissionId - Submission ID
 * @param {string} adminUid - Admin user ID
 * @returns {Promise<void>}
 */
export async function approveScore(matchId, submissionId, adminUid) {
  try {
    // Get submission
    const submissionRef = ref(database, `${DB_PATHS.SUBMISSIONS}/${matchId}/${submissionId}`);
    const submissionSnapshot = await get(submissionRef);

    if (!submissionSnapshot.exists()) {
      throw new Error('Submission not found');
    }

    const submission = submissionSnapshot.val();
    const { tournamentId, score1, score2, team1, team2, setScores } = submission;

    // Determine winner
    const winner = determineWinner(score1, score2, team1, team2);

    // Update match with scores
    const matchRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}/${matchId}`);
    const matchSnapshot = await get(matchRef);

    if (!matchSnapshot.exists()) {
      throw new Error('Match not found');
    }

    const match = matchSnapshot.val();

    const matchUpdates = {
      score1,
      score2,
      winner,
      status: MATCH_STATUS.COMPLETED,
      approvedAt: Date.now(),
      approvedBy: adminUid,
    };

    // Include setScores if this came from scoreboard
    if (setScores && Array.isArray(setScores)) {
      matchUpdates.setScores = setScores;
    }

    await update(matchRef, matchUpdates);

    // Update submission status
    await update(submissionRef, {
      status: SUBMISSION_STATUS.APPROVED,
    });

    // Reject all other pending submissions for this match
    const allSubmissionsRef = ref(database, `${DB_PATHS.SUBMISSIONS}/${matchId}`);
    const allSubmissionsSnapshot = await get(allSubmissionsRef);

    if (allSubmissionsSnapshot.exists()) {
      const updatePromises = [];
      allSubmissionsSnapshot.forEach((child) => {
        const otherSubmission = child.val();
        const otherSubmissionId = child.key; // Get Firebase key
        // Reject if it's a different submission and still pending
        if (otherSubmissionId !== submissionId && otherSubmission.status === SUBMISSION_STATUS.PENDING) {
          const otherSubmissionRef = ref(database, `${DB_PATHS.SUBMISSIONS}/${matchId}/${otherSubmissionId}`);
          updatePromises.push(
            update(otherSubmissionRef, {
              status: SUBMISSION_STATUS.REJECTED,
            })
          );
        }
      });

      // Wait for all rejections to complete
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        console.log(`Rejected ${updatePromises.length} other pending submissions for match ${matchId}`);
      }
    }

    // Check if this is a pool match - if so, update pool standings
    if (match.matchType === MATCH_TYPE.POOL && match.poolId) {
      console.log('Pool match detected - updating pool standings for pool:', match.poolId);
      try {
        // Get tournament to access pool configuration
        const tournament = await getTournamentById(tournamentId);
        if (tournament && tournament.poolConfig) {
          await updatePoolStandings(
            tournamentId,
            match.poolId,
            {
              ...match,
              score1,
              score2,
              winner,
              setScores
            },
            tournament.poolConfig
          );
          console.log('Pool standings updated successfully');
        }
      } catch (poolError) {
        console.error('Error updating pool standings:', poolError);
        // Don't fail the entire approval if pool update fails
      }
    }

    // Advance winner to next match if exists (playoff/single-elimination matches only)
    if (winner && match.nextMatchId) {
      console.log('Advancing winner:', winner, 'to match:', match.nextMatchId);
      const allMatches = await getMatchesByTournament(tournamentId);
      const updatedMatch = {
        ...match,
        score1,
        score2,
        winner,
        status: MATCH_STATUS.COMPLETED,
      };

      console.log('Updated match data:', updatedMatch);
      const nextMatch = advanceWinner(updatedMatch, allMatches);
      console.log('Next match after advancement:', nextMatch);

      if (nextMatch) {
        const nextMatchRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}/${nextMatch.id}`);

        // Only update the field that changed (team1 or team2)
        const updates = {};
        if (updatedMatch.isTeam1Winner === true) {
          updates.team1 = nextMatch.team1;
        } else if (updatedMatch.isTeam1Winner === false) {
          updates.team2 = nextMatch.team2;
        }

        console.log('Updating next match with:', updates);
        await update(nextMatchRef, updates);
        console.log('Successfully advanced winner to next match');
      } else {
        console.log('No next match found');
      }
    }

    // Update tournament status based on match completion
    await updateTournamentStatus(tournamentId);
  } catch (error) {
    console.error('Error approving score:', error);
    throw error;
  }
}

/**
 * Reject a score submission (admin only)
 * @param {string} matchId - Match ID
 * @param {string} submissionId - Submission ID
 * @returns {Promise<void>}
 */
export async function rejectScore(matchId, submissionId) {
  try {
    const submissionRef = ref(database, `${DB_PATHS.SUBMISSIONS}/${matchId}/${submissionId}`);
    const submissionSnapshot = await get(submissionRef);

    if (submissionSnapshot.exists()) {
      const submission = submissionSnapshot.val();

      // Mark submission as rejected
      await update(submissionRef, {
        status: SUBMISSION_STATUS.REJECTED,
      });

      // If submission came from a scoreboard, delete the scoreboard and clear match reference
      if (submission.scoreboardId) {
        try {
          const scoreboardRef = ref(database, `${DB_PATHS.SCOREBOARDS}/${submission.scoreboardId}`);
          await set(scoreboardRef, null); // Delete scoreboard

          // Clear scoreboardId from match
          const matchRef = ref(database, `${DB_PATHS.MATCHES}/${submission.tournamentId}/${matchId}`);
          await update(matchRef, {
            scoreboardId: null,
            hasLiveScoreboard: false,
          });
        } catch (scoreboardError) {
          console.warn('Could not delete scoreboard:', scoreboardError);
        }
      }
    }
  } catch (error) {
    console.error('Error rejecting score:', error);
    throw error;
  }
}

/**
 * Submit score directly as admin (bypasses approval process)
 * @param {string} tournamentId - Tournament ID
 * @param {string} matchId - Match ID
 * @param {number} score1 - Team 1 score
 * @param {number} score2 - Team 2 score
 * @param {string} adminUid - Admin user ID
 * @param {Array} setScores - Optional array of set scores
 * @returns {Promise<void>}
 */
export async function submitScoreAsAdmin(tournamentId, matchId, score1, score2, adminUid, setScores = null) {
  try {
    const matchRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}/${matchId}`);
    const matchSnapshot = await get(matchRef);

    if (!matchSnapshot.exists()) {
      throw new Error('Match not found');
    }

    const match = matchSnapshot.val();
    const winner = determineWinner(score1, score2, match.team1, match.team2);

    // Update match with scores
    const matchUpdates = {
      score1,
      score2,
      winner,
      status: MATCH_STATUS.COMPLETED,
      approvedAt: Date.now(),
      approvedBy: adminUid,
    };

    // Include setScores if provided
    if (setScores && Array.isArray(setScores)) {
      matchUpdates.setScores = setScores;
    }

    await update(matchRef, matchUpdates);

    // Reject all pending submissions for this match (since admin submitted directly)
    const allSubmissionsRef = ref(database, `${DB_PATHS.SUBMISSIONS}/${matchId}`);
    const allSubmissionsSnapshot = await get(allSubmissionsRef);

    if (allSubmissionsSnapshot.exists()) {
      const updatePromises = [];
      allSubmissionsSnapshot.forEach((child) => {
        const submission = child.val();
        // Reject all pending submissions
        if (submission.status === SUBMISSION_STATUS.PENDING) {
          const submissionRef = ref(database, `${DB_PATHS.SUBMISSIONS}/${matchId}/${submission.id}`);
          updatePromises.push(
            update(submissionRef, {
              status: SUBMISSION_STATUS.REJECTED,
            })
          );
        }
      });

      // Wait for all rejections to complete
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        console.log(`Rejected ${updatePromises.length} pending submissions for match ${matchId} (admin direct submission)`);
      }
    }

    // Advance winner to next match if exists
    if (winner && match.nextMatchId) {
      console.log('Advancing winner:', winner, 'to match:', match.nextMatchId);
      const allMatches = await getMatchesByTournament(tournamentId);
      const updatedMatch = {
        ...match,
        score1,
        score2,
        winner,
        status: MATCH_STATUS.COMPLETED,
      };

      console.log('Updated match data:', updatedMatch);
      const nextMatch = advanceWinner(updatedMatch, allMatches);
      console.log('Next match after advancement:', nextMatch);

      if (nextMatch) {
        const nextMatchRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}/${nextMatch.id}`);

        // Only update the field that changed (team1 or team2)
        const updates = {};
        if (updatedMatch.isTeam1Winner === true) {
          updates.team1 = nextMatch.team1;
        } else if (updatedMatch.isTeam1Winner === false) {
          updates.team2 = nextMatch.team2;
        }

        console.log('Updating next match with:', updates);
        await update(nextMatchRef, updates);
        console.log('Successfully advanced winner to next match');
      } else {
        console.log('No next match found');
      }
    }

    // Update tournament status based on match completion
    await updateTournamentStatus(tournamentId);
  } catch (error) {
    console.error('Error submitting score as admin:', error);
    throw error;
  }
}

/**
 * Update match directly (admin only)
 * @param {string} tournamentId - Tournament ID
 * @param {string} matchId - Match ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateMatch(tournamentId, matchId, updates) {
  try {
    const matchRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}/${matchId}`);
    await update(matchRef, updates);

    // If scores were updated, check if we need to advance winner
    if (updates.score1 !== undefined && updates.score2 !== undefined) {
      const matchSnapshot = await get(matchRef);
      const match = matchSnapshot.val();

      const winner = determineWinner(updates.score1, updates.score2, match.team1, match.team2);

      if (winner) {
        await update(matchRef, {
          winner,
          status: MATCH_STATUS.COMPLETED,
        });

        if (match.nextMatchId) {
          const allMatches = await getMatchesByTournament(tournamentId);
          const updatedMatch = {
            ...match,
            ...updates,
            winner,
          };

          const nextMatch = advanceWinner(updatedMatch, allMatches);
          if (nextMatch) {
            const nextMatchRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}/${nextMatch.id}`);
            await update(nextMatchRef, {
              team1: nextMatch.team1,
              team2: nextMatch.team2,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error updating match:', error);
    throw error;
  }
}

/**
 * Subscribe to matches for a tournament
 * @param {string} tournamentId - Tournament ID
 * @param {Function} callback - Callback function with matches array
 * @returns {Function} Unsubscribe function
 */
export function subscribeMatches(tournamentId, callback) {
  const matchesRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}`);
  return onValue(matchesRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const matches = [];
    snapshot.forEach((child) => {
      matches.push(child.val());
    });

    callback(matches.sort((a, b) => a.matchNumber - b.matchNumber));
  });
}

/**
 * Subscribe to match updates
 * @param {string} tournamentId - Tournament ID
 * @param {string} matchId - Match ID
 * @param {Function} callback - Callback function with match data
 * @returns {Function} Unsubscribe function
 */
export function subscribeMatch(tournamentId, matchId, callback) {
  const matchRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}/${matchId}`);
  return onValue(matchRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
}

/**
 * Subscribe to submissions for a match
 * @param {string} matchId - Match ID
 * @param {Function} callback - Callback function with submissions array
 * @returns {Function} Unsubscribe function
 */
export function subscribeSubmissions(matchId, callback) {
  const submissionsRef = ref(database, `${DB_PATHS.SUBMISSIONS}/${matchId}`);
  return onValue(submissionsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const submissions = [];
    snapshot.forEach((child) => {
      const submission = child.val();
      if (submission.status === SUBMISSION_STATUS.PENDING) {
        submissions.push({
          ...submission,
          id: child.key, // Add Firebase key as id
        });
      }
    });

    callback(submissions.sort((a, b) => b.submittedAt - a.submittedAt));
  });
}

/**
 * Subscribe to all submissions for a match (including pending, approved, rejected)
 * @param {string} matchId - Match ID
 * @param {Function} callback - Callback function with submissions array
 * @returns {Function} Unsubscribe function
 */
export function subscribeAllSubmissions(matchId, callback) {
  const submissionsRef = ref(database, `${DB_PATHS.SUBMISSIONS}/${matchId}`);
  return onValue(submissionsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const submissions = [];
    snapshot.forEach((child) => {
      submissions.push({
        ...child.val(),
        id: child.key, // Add Firebase key as id
      });
    });

    callback(submissions.sort((a, b) => b.submittedAt - a.submittedAt));
  });
}

/**
 * Update match rules (admin only)
 * @param {string} tournamentId - Tournament ID
 * @param {string} matchId - Match ID
 * @param {Object} rules - New match rules
 * @returns {Promise<void>}
 */
export async function updateMatchRules(tournamentId, matchId, rules) {
  try {
    const matchRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}/${matchId}`);
    await update(matchRef, {
      rules: {
        firstTo: rules.firstTo,
        winBy: rules.winBy,
        cap: rules.cap,
        bestOf: rules.bestOf,
      },
    });
  } catch (error) {
    console.error('Error updating match rules:', error);
    throw error;
  }
}

/**
 * Edit the final score of a completed match (admin only)
 * This function handles re-calculating winners and updating subsequent matches
 * @param {string} tournamentId - Tournament ID
 * @param {string} matchId - Match ID
 * @param {number} newScore1 - New score for team 1
 * @param {number} newScore2 - New score for team 2
 * @param {string} adminUid - Admin user ID
 * @returns {Promise<void>}
 */
export async function editMatchScore(tournamentId, matchId, newScore1, newScore2, adminUid) {
  try {
    // Get the current match
    const matchRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}/${matchId}`);
    const matchSnapshot = await get(matchRef);

    if (!matchSnapshot.exists()) {
      throw new Error('Match not found');
    }

    const match = matchSnapshot.val();
    const oldWinner = match.winner;

    // Determine new winner
    const newWinner = determineWinner(newScore1, newScore2, match.team1, match.team2);

    // Update the match with new scores
    await update(matchRef, {
      score1: newScore1,
      score2: newScore2,
      winner: newWinner,
      status: MATCH_STATUS.COMPLETED,
      approvedAt: Date.now(),
      approvedBy: adminUid,
    });

    // If winner changed and there's a next match, we need to update the bracket
    if (oldWinner !== newWinner && match.nextMatchId) {
      console.log('Winner changed from', oldWinner, 'to', newWinner);

      // Get all matches to handle advancement
      const allMatches = await getMatchesByTournament(tournamentId);
      const nextMatch = allMatches.find(m => m.id === match.nextMatchId);

      if (nextMatch) {
        // Determine which slot in the next match needs to be updated
        const updates = {};
        if (match.isTeam1Winner === true) {
          // This match's winner goes to team1 slot of next match
          updates.team1 = newWinner || null;
        } else if (match.isTeam1Winner === false) {
          // This match's winner goes to team2 slot of next match
          updates.team2 = newWinner || null;
        }

        // If the next match was already completed, we need to clear it
        // and cascade the changes down the bracket
        if (nextMatch.status === MATCH_STATUS.COMPLETED) {
          console.log('Next match was completed - clearing it and cascading changes');
          await clearMatchAndDescendants(tournamentId, nextMatch, allMatches);
        }

        // Update the next match with new winner
        const nextMatchRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}/${nextMatch.id}`);
        console.log('Updating next match with:', updates);
        await update(nextMatchRef, updates);
      }
    }

    // Update tournament status based on match completion
    await updateTournamentStatus(tournamentId);
  } catch (error) {
    console.error('Error editing match score:', error);
    throw error;
  }
}

/**
 * Clear a match and all its descendant matches in the bracket
 * Used when editing a score that affects subsequent matches
 * @param {string} tournamentId - Tournament ID
 * @param {Object} match - The match to clear
 * @param {Object[]} allMatches - All matches in the tournament
 * @returns {Promise<void>}
 */
async function clearMatchAndDescendants(tournamentId, match, allMatches) {
  // Clear this match
  const matchRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}/${match.id}`);
  await update(matchRef, {
    score1: null,
    score2: null,
    winner: null,
    status: MATCH_STATUS.UPCOMING,
    approvedAt: null,
    approvedBy: null,
  });

  // If this match feeds into another match, recursively clear descendants
  if (match.nextMatchId) {
    const nextMatch = allMatches.find(m => m.id === match.nextMatchId);
    if (nextMatch && nextMatch.status === MATCH_STATUS.COMPLETED) {
      await clearMatchAndDescendants(tournamentId, nextMatch, allMatches);
    } else if (nextMatch) {
      // Just clear the team slot in the next match
      const nextMatchRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}/${nextMatch.id}`);
      const updates = {};

      if (match.isTeam1Winner === true && nextMatch.team1 === match.winner) {
        updates.team1 = null;
      } else if (match.isTeam1Winner === false && nextMatch.team2 === match.winner) {
        updates.team2 = null;
      }

      if (Object.keys(updates).length > 0) {
        await update(nextMatchRef, updates);
      }
    }
  }
}

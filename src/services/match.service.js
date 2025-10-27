import { ref, push, set, get, update, onValue } from 'firebase/database';
import { database } from './firebase';
import { DB_PATHS, MATCH_STATUS, SUBMISSION_STATUS } from '../utils/constants';
import { determineWinner, advanceWinner } from '../utils/bracketGenerator';
import { updateTournament } from './tournament.service';

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
    const { tournamentId, score1, score2, team1, team2 } = submission;

    // Determine winner
    const winner = determineWinner(score1, score2, team1, team2);

    // Update match with scores
    const matchRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}/${matchId}`);
    const matchSnapshot = await get(matchRef);

    if (!matchSnapshot.exists()) {
      throw new Error('Match not found');
    }

    const match = matchSnapshot.val();

    await update(matchRef, {
      score1,
      score2,
      winner,
      status: MATCH_STATUS.COMPLETED,
      approvedAt: Date.now(),
      approvedBy: adminUid,
    });

    // Update submission status
    await update(submissionRef, {
      status: SUBMISSION_STATUS.APPROVED,
    });

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
    const allMatches = await getMatchesByTournament(tournamentId);
    const allCompleted = allMatches.every(m => m.status === MATCH_STATUS.COMPLETED);
    const anyCompleted = allMatches.some(m => m.status === MATCH_STATUS.COMPLETED);

    if (allCompleted) {
      console.log('All matches completed - updating tournament to completed');
      await updateTournament(tournamentId, { status: 'completed' });
    } else if (anyCompleted) {
      console.log('Tournament has active matches - updating to live');
      await updateTournament(tournamentId, { status: 'live' });
    }
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
    await update(submissionRef, {
      status: SUBMISSION_STATUS.REJECTED,
    });
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
 * @returns {Promise<void>}
 */
export async function submitScoreAsAdmin(tournamentId, matchId, score1, score2, adminUid) {
  try {
    const matchRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}/${matchId}`);
    const matchSnapshot = await get(matchRef);

    if (!matchSnapshot.exists()) {
      throw new Error('Match not found');
    }

    const match = matchSnapshot.val();
    const winner = determineWinner(score1, score2, match.team1, match.team2);

    // Update match with scores
    await update(matchRef, {
      score1,
      score2,
      winner,
      status: MATCH_STATUS.COMPLETED,
      approvedAt: Date.now(),
      approvedBy: adminUid,
    });

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
    const allMatches = await getMatchesByTournament(tournamentId);
    const allCompleted = allMatches.every(m => m.status === MATCH_STATUS.COMPLETED);
    const anyCompleted = allMatches.some(m => m.status === MATCH_STATUS.COMPLETED);

    if (allCompleted) {
      console.log('All matches completed - updating tournament to completed');
      await updateTournament(tournamentId, { status: 'completed' });
    } else if (anyCompleted) {
      console.log('Tournament has active matches - updating to live');
      await updateTournament(tournamentId, { status: 'live' });
    }
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
        submissions.push(submission);
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
      submissions.push(child.val());
    });

    callback(submissions.sort((a, b) => b.submittedAt - a.submittedAt));
  });
}

/**
 * bracket.service.js
 *
 * Extended bracket generation service with Firebase integration.
 * Handles byes, play-ins, and standard brackets.
 */

import { ref, set, get, update } from 'firebase/database';
import { database } from './firebase';
import { DB_PATHS } from '../utils/constants';
import { generatePlayoffBracket, pairSeedsForRound } from './advance.service';

/**
 * Generates and saves playoff bracket to Firebase
 * @param {Object} params
 * @param {string} params.tournamentId - Tournament ID
 * @param {Array<Object>} params.seeds - Ordered seeds
 * @param {string} params.format - "byes" or "play-in"
 * @param {Object} params.math - Math details
 * @param {Object} params.rules - Match rules by round
 * @returns {Promise<Object>} Generated bracket data
 */
export async function generateAndSavePlayoffs({ tournamentId, seeds, format, math, rules }) {
  try {
    // Generate bracket structure
    const bracket = generatePlayoffBracket({ tournamentId, seeds, format, math, rules });

    // Save playoff metadata to tournament
    const playoffData = {
      seeds: seeds.map(s => ({ teamId: s.teamId, teamName: s.teamName, seed: s.seed })),
      rounds: bracket.rounds,
      format,
      math,
      generatedAt: Date.now(),
    };

    await update(ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}`), {
      playoffs: playoffData,
      phase: 'playoffs',
    });

    // Save all matches
    const matchesRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}`);
    const matchesData = {};
    bracket.matches.forEach(match => {
      matchesData[match.id] = match;
    });

    await set(matchesRef, matchesData);

    return { playoff: playoffData, matches: bracket.matches };
  } catch (error) {
    console.error('Error generating and saving playoffs:', error);
    throw error;
  }
}

/**
 * Gets playoff data from tournament
 * @param {string} tournamentId - Tournament ID
 * @returns {Promise<Object|null>} Playoff data or null
 */
export async function getPlayoffData(tournamentId) {
  try {
    const playoffRef = ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}/playoffs`);
    const snapshot = await get(playoffRef);
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error getting playoff data:', error);
    throw error;
  }
}

/**
 * Creates matches for given pairs in a round
 * @param {Object} params
 * @returns {Array<Object>} Match objects
 */
export function createMatchesForPairs({ tournamentId, roundName, pairs, rules }) {
  return pairs.map((pair, idx) => ({
    id: `${tournamentId}_${roundName}_m${idx + 1}`,
    tournamentId,
    roundName,
    matchNumber: idx + 1,
    matchType: 'playoff',
    team1: pair[0]?.teamName || null,
    team2: pair[1]?.teamName || null,
    seed1: pair[0]?.seed || null,
    seed2: pair[1]?.seed || null,
    score1: null,
    score2: null,
    winner: null,
    status: 'upcoming',
    rules: rules || {},
    setScores: [],
  }));
}

/**
 * Links winners from one round to the next
 * @param {Object} params
 */
export function linkWinnersToNextRound({ matches, roundGraph }) {
  matches.forEach(match => {
    const nextRoundInfo = roundGraph[match.roundName];
    if (nextRoundInfo && nextRoundInfo.nextRound) {
      // Find appropriate next match based on seeding/position
      const nextRoundMatches = matches.filter(m => m.roundName === nextRoundInfo.nextRound);
      if (nextRoundMatches.length > 0) {
        const nextMatchIndex = Math.floor((match.matchNumber - 1) / 2);
        const nextMatch = nextRoundMatches[nextMatchIndex];
        if (nextMatch) {
          match.nextMatchId = nextMatch.id;
          match.isTeam1Winner = (match.matchNumber - 1) % 2 === 0;
        }
      }
    }
  });
}

/**
 * Generates a simple bracket for power-of-2 teams (wrapper)
 * @param {Object} params
 * @returns {Promise<Object>} Bracket data
 */
export async function generateStandardBracket({ tournamentId, seeds, rules }) {
  const format = 'none';
  const math = {
    lower: seeds.length,
    higher: seeds.length,
    byes: 0,
    playIns: 0,
  };

  return generateAndSavePlayoffs({ tournamentId, seeds, format, math, rules });
}

/**
 * Regenerates playoff bracket for an existing tournament
 * Deletes all playoff matches and recreates them with current rules
 * @param {string} tournamentId - Tournament ID
 * @returns {Promise<void>}
 */
export async function regeneratePlayoffBracket(tournamentId) {
  try {
    // Get tournament data
    const tournamentRef = ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}`);
    const snapshot = await get(tournamentRef);

    if (!snapshot.exists()) {
      throw new Error('Tournament not found');
    }

    const tournament = snapshot.val();

    // Get playoff seeding data
    if (!tournament.playoffs || !tournament.playoffs.seeds) {
      throw new Error('No playoff seeding data found');
    }

    const { seeds, format, math } = tournament.playoffs;
    const rules = tournament.playoffConfig?.matchRules || tournament.matchRules || {};

    console.log('[regeneratePlayoffBracket] Regenerating with:', { seeds: seeds.length, format, math, rules });

    // Delete all existing playoff matches
    const matchesRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}`);
    const matchesSnapshot = await get(matchesRef);
    console.log('[regeneratePlayoffBracket] Got matches snapshot');

    if (matchesSnapshot.exists()) {
      const updates = {};
      matchesSnapshot.forEach((child) => {
        const match = child.val();
        // Only delete playoff matches (not pool play matches)
        if (!match.poolId) {
          updates[child.key] = null;
        }
      });
      await update(matchesRef, updates);
      console.log('[regeneratePlayoffBracket] Deleted existing playoff matches');
    }

    // Generate new bracket
    console.log('[regeneratePlayoffBracket] Calling generateAndSavePlayoffs...');
    const result = await generateAndSavePlayoffs({
      tournamentId,
      seeds,
      format,
      math,
      rules,
    });

    console.log('[regeneratePlayoffBracket] Playoff bracket regenerated successfully', result);
  } catch (error) {
    console.error('Error regenerating playoff bracket:', error);
    throw error;
  }
}

/**
 * Re-exports for convenience
 */
export { pairSeedsForRound };

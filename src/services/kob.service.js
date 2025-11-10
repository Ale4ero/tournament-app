import { ref, push, set, get, update, remove, onValue, runTransaction } from 'firebase/database';
import { database } from './firebase';
import { DB_PATHS, MATCH_STATUS, TOURNAMENT_STATUS, DEFAULT_KOB_CONFIG } from '../utils/constants';

/**
 * Generate all unique partner combinations for KOB matches
 * For 4 players A, B, C, D:
 * Match 1: A+B vs C+D
 * Match 2: A+C vs B+D
 * Match 3: A+D vs B+C
 *
 * @param {Array<string>} playerIds - Array of player IDs (4-6 players)
 * @returns {Array<Object>} Array of match pairings
 */
function generateKOBMatchPairings(playerIds) {
  const matches = [];
  const n = playerIds.length;
  const partnersPlayed = {}; // Track who has partnered with whom

  // Initialize partner tracking
  playerIds.forEach(id => {
    partnersPlayed[id] = new Set();
  });

  // Generate all possible 2-player teams
  const teams = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      teams.push([playerIds[i], playerIds[j]]);
    }
  }

  // For each player, ensure they partner with every other player exactly once
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const p1 = playerIds[i];
      const p2 = playerIds[j];

      // Skip if these players have already partnered
      if (partnersPlayed[p1].has(p2)) continue;

      // Mark them as partners
      partnersPlayed[p1].add(p2);
      partnersPlayed[p2].add(p1);

      // Find opponents - two players who haven't partnered yet
      const remaining = playerIds.filter(id => id !== p1 && id !== p2);

      for (let k = 0; k < remaining.length; k++) {
        for (let l = k + 1; l < remaining.length; l++) {
          const p3 = remaining[k];
          const p4 = remaining[l];

          if (!partnersPlayed[p3].has(p4)) {
            matches.push({
              team1: [p1, p2],
              team2: [p3, p4],
              playerIds: [p1, p2, p3, p4],
            });

            partnersPlayed[p3].add(p4);
            partnersPlayed[p4].add(p3);
            break;
          }
        }
      }
    }
  }

  return matches;
}

/**
 * Create a new KOB tournament
 * @param {Object} tournamentData - Basic tournament data
 * @param {Array<string>} players - Array of player names
 * @param {Object} kobConfig - KOB configuration
 * @param {string} adminUid - Admin user ID
 * @param {string} organizationId - Organization ID
 * @returns {Promise<string>} Tournament ID
 */
export async function createKOBTournament(tournamentData, players, kobConfig, adminUid, organizationId) {
  try {
    const tournamentRef = push(ref(database, DB_PATHS.TOURNAMENTS));
    const tournamentId = tournamentRef.key;

    // Validate player count (4-6 players per pool recommended)
    if (players.length < 4) {
      throw new Error('KOB tournaments require at least 4 players');
    }

    const tournament = {
      id: tournamentId,
      name: tournamentData.name,
      description: tournamentData.description,
      type: 'kob',
      startDate: tournamentData.startDate || Date.now(),
      organizationId,
      status: TOURNAMENT_STATUS.UPCOMING,
      createdAt: Date.now(),
      createdBy: adminUid,
      kobConfig: {
        ...DEFAULT_KOB_CONFIG,
        ...kobConfig,
        currentRound: 0,
        totalRounds: null, // Will be determined dynamically
      },
    };

    // Only include endDate if provided
    if (tournamentData.endDate) {
      tournament.endDate = tournamentData.endDate;
    }

    await set(tournamentRef, tournament);

    // Create players
    await createPlayers(tournamentId, players);

    return tournamentId;
  } catch (error) {
    console.error('Error creating KOB tournament:', error);
    throw error;
  }
}

/**
 * Create players for a KOB tournament
 * @param {string} tournamentId - Tournament ID
 * @param {Array<string>} playerNames - Array of player names
 * @returns {Promise<Object>} Map of playerId -> player data
 */
export async function createPlayers(tournamentId, playerNames) {
  try {
    const playersRef = ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}/players`);
    const playersData = {};

    playerNames.forEach((name, index) => {
      const playerId = `player_${index + 1}`;
      playersData[playerId] = {
        id: playerId,
        name: name.trim(),
        tournamentSeed: index + 1, // Store original seed number (1-based)
        totalWins: 0,
        totalPointsFor: 0,
        totalPointsAgainst: 0,
        totalPointDiff: 0,
        eliminated: false,
        finalRank: null,
        createdAt: Date.now(),
      };
    });

    await set(playersRef, playersData);
    return playersData;
  } catch (error) {
    console.error('Error creating players:', error);
    throw error;
  }
}

/**
 * Generate pools for a round
 * @param {string} tournamentId - Tournament ID
 * @param {number} roundNumber - Round number (1, 2, 3, etc.)
 * @param {Array<string>} playerIds - Array of player IDs to distribute
 * @param {number} poolSize - Desired pool size (4-6)
 * @returns {Promise<Object>} Round data with pool assignments
 */
export async function generateRoundPools(tournamentId, roundNumber, playerIds, poolSize = 4) {
  try {
    // Calculate number of pools
    const numPools = Math.ceil(playerIds.length / poolSize);

    // Distribute players across pools
    const pools = Array.from({ length: numPools }, () => []);
    playerIds.forEach((playerId, index) => {
      pools[index % numPools].push(playerId);
    });

    // Create round
    const roundRef = push(ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}/rounds`));
    const roundId = roundRef.key;

    const roundData = {
      id: roundId,
      tournamentId,
      roundNumber,
      status: 'upcoming',
      poolIds: [],
      createdAt: Date.now(),
      completedAt: null,
    };

    // Set the round data FIRST (before creating pools)
    await set(roundRef, roundData);
    console.log('Round data saved:', roundId);

    // Create pools (they will be added as child nodes)
    for (let i = 0; i < pools.length; i++) {
      const poolId = `${roundId}_pool_${String.fromCharCode(65 + i)}`;
      const poolName = `Pool ${String.fromCharCode(65 + i)}`;

      await createKOBPool(tournamentId, roundId, poolId, poolName, pools[i]);
      roundData.poolIds.push(poolId);
    }

    // Update the round with poolIds using update() to avoid overwriting pools
    await update(roundRef, { poolIds: roundData.poolIds });
    console.log('Round poolIds updated:', roundData.poolIds);

    // Update tournament current round
    await update(ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}`), {
      'kobConfig/currentRound': roundNumber,
      status: TOURNAMENT_STATUS.LIVE,
    });

    return roundData;
  } catch (error) {
    console.error('Error generating round pools:', error);
    throw error;
  }
}

/**
 * Create a single pool and generate its matches
 * @param {string} tournamentId - Tournament ID
 * @param {string} roundId - Round ID
 * @param {string} poolId - Pool ID
 * @param {string} poolName - Pool name
 * @param {Array<string>} playerIds - Player IDs in this pool
 * @returns {Promise<void>}
 */
async function createKOBPool(tournamentId, roundId, poolId, poolName, playerIds) {
  try {
    const poolPath = `${DB_PATHS.TOURNAMENTS}/${tournamentId}/rounds/${roundId}/pools/${poolId}`;
    console.log('Creating KOB pool at path:', poolPath, 'with players:', playerIds);
    const poolRef = ref(database, poolPath);

    const poolData = {
      id: poolId,
      roundId,
      tournamentId,
      name: poolName,
      playerIds,
      matchIds: [],
      status: 'upcoming',
      standings: {},
      createdAt: Date.now(),
    };

    // Initialize standings for each player
    playerIds.forEach(playerId => {
      poolData.standings[playerId] = {
        wins: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        diff: 0,
        rank: null,
      };
    });

    console.log('Pool data to save:', poolData);

    // Test: Try writing to a simpler path first
    const testRef = ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}/rounds/${roundId}/testPool`);
    try {
      await set(testRef, { test: 'data' });
      console.log('Test write successful');
      const testVerify = await get(testRef);
      console.log('Test verification:', testVerify.exists());
    } catch (testError) {
      console.error('Test write failed:', testError);
    }

    try {
      await set(poolRef, poolData);
      console.log('Pool saved successfully:', poolId);

      // Immediately verify it was saved
      const verifySnapshot = await get(poolRef);
      console.log('Immediate verification:', poolId, verifySnapshot.exists(), verifySnapshot.val());
    } catch (setError) {
      console.error('Error in set() call for pool:', poolId, setError);
      throw setError;
    }

    // Generate matches for this pool
    console.log('Generating matches for pool:', poolId);
    await generateKOBMatches(tournamentId, roundId, poolId, playerIds);
    console.log('Matches generated for pool:', poolId);
  } catch (error) {
    console.error('Error creating KOB pool:', poolId, error);
    throw error;
  }
}

/**
 * Generate KOB matches for a pool
 * @param {string} tournamentId - Tournament ID
 * @param {string} roundId - Round ID
 * @param {string} poolId - Pool ID
 * @param {Array<string>} playerIds - Player IDs in this pool
 * @returns {Promise<Array>} Array of created matches
 */
export async function generateKOBMatches(tournamentId, roundId, poolId, playerIds) {
  try {
    const pairings = generateKOBMatchPairings(playerIds);
    const matches = [];
    const matchIds = [];

    // Get match rules from tournament config
    const tournamentSnapshot = await get(ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}`));
    const tournament = tournamentSnapshot.val();
    const matchRules = tournament?.kobConfig?.matchRules || DEFAULT_KOB_CONFIG.matchRules;

    for (let i = 0; i < pairings.length; i++) {
      const pairing = pairings[i];
      const matchId = `${tournamentId}_${poolId}_m${i + 1}`;

      const match = {
        id: matchId,
        tournamentId,
        roundId,
        poolId,
        matchType: 'kob',
        matchNumber: i + 1,
        playerIds: pairing.playerIds,
        team1: {
          players: pairing.team1,
          score: null,
        },
        team2: {
          players: pairing.team2,
          score: null,
        },
        winner: null,
        status: MATCH_STATUS.UPCOMING,
        rules: matchRules,
        createdAt: Date.now(),
        approvedAt: null,
        approvedBy: null,
      };

      const matchRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}/${matchId}`);
      await set(matchRef, match);

      matches.push(match);
      matchIds.push(matchId);
    }

    // Update pool with match IDs
    await update(
      ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}/rounds/${roundId}/pools/${poolId}`),
      { matchIds }
    );

    return matches;
  } catch (error) {
    console.error('Error generating KOB matches:', error);
    throw error;
  }
}

/**
 * Update player stats after a match is completed
 * @param {string} tournamentId - Tournament ID
 * @param {string} roundId - Round ID
 * @param {string} poolId - Pool ID
 * @param {Object} matchResult - Match result with scores
 * @returns {Promise<void>}
 */
export async function updatePlayerStats(tournamentId, roundId, poolId, matchResult) {
  try {
    const { playerIds, team1, team2, winner } = matchResult;

    // Determine winning and losing teams
    const winningTeam = winner === 'team1' ? team1 : team2;
    const losingTeam = winner === 'team1' ? team2 : team1;

    // Update pool standings
    const poolStandingsRef = ref(
      database,
      `${DB_PATHS.TOURNAMENTS}/${tournamentId}/rounds/${roundId}/pools/${poolId}/standings`
    );

    await runTransaction(poolStandingsRef, (standings) => {
      if (!standings) return {};

      // Update winners
      winningTeam.players.forEach(playerId => {
        if (standings[playerId]) {
          standings[playerId].wins = (standings[playerId].wins || 0) + 1;
          standings[playerId].losses = standings[playerId].losses || 0; // Ensure losses exists
          standings[playerId].pointsFor = (standings[playerId].pointsFor || 0) + winningTeam.score;
          standings[playerId].pointsAgainst = (standings[playerId].pointsAgainst || 0) + losingTeam.score;
          standings[playerId].diff = standings[playerId].pointsFor - standings[playerId].pointsAgainst;
        }
      });

      // Update losers
      losingTeam.players.forEach(playerId => {
        if (standings[playerId]) {
          standings[playerId].wins = standings[playerId].wins || 0; // Ensure wins exists
          standings[playerId].losses = (standings[playerId].losses || 0) + 1;
          standings[playerId].pointsFor = (standings[playerId].pointsFor || 0) + losingTeam.score;
          standings[playerId].pointsAgainst = (standings[playerId].pointsAgainst || 0) + winningTeam.score;
          standings[playerId].diff = standings[playerId].pointsFor - standings[playerId].pointsAgainst;
        }
      });

      return standings;
    });

    // Update global player stats
    const playersRef = ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}/players`);

    await runTransaction(playersRef, (players) => {
      if (!players) return {};

      // Update winners
      winningTeam.players.forEach(playerId => {
        if (players[playerId]) {
          players[playerId].totalWins += 1;
          players[playerId].totalPointsFor += winningTeam.score;
          players[playerId].totalPointsAgainst += losingTeam.score;
          players[playerId].totalPointDiff = players[playerId].totalPointsFor - players[playerId].totalPointsAgainst;
        }
      });

      // Update losers
      losingTeam.players.forEach(playerId => {
        if (players[playerId]) {
          players[playerId].totalPointsFor += losingTeam.score;
          players[playerId].totalPointsAgainst += winningTeam.score;
          players[playerId].totalPointDiff = players[playerId].totalPointsFor - players[playerId].totalPointsAgainst;
        }
      });

      return players;
    });

    // Recalculate pool rankings
    await recalculatePoolRankings(tournamentId, roundId, poolId);
  } catch (error) {
    console.error('Error updating player stats:', error);
    throw error;
  }
}

/**
 * Recalculate pool rankings based on wins and point differential
 * @param {string} tournamentId - Tournament ID
 * @param {string} roundId - Round ID
 * @param {string} poolId - Pool ID
 * @returns {Promise<void>}
 */
export async function recalculatePoolRankings(tournamentId, roundId, poolId) {
  try {
    const standingsRef = ref(
      database,
      `${DB_PATHS.TOURNAMENTS}/${tournamentId}/rounds/${roundId}/pools/${poolId}/standings`
    );

    const snapshot = await get(standingsRef);
    if (!snapshot.exists()) return;

    const standings = snapshot.val();

    // Convert to array and sort
    const sorted = Object.entries(standings)
      .map(([playerId, stats]) => ({ playerId, ...stats }))
      .sort((a, b) => {
        // Sort by wins first
        if (b.wins !== a.wins) return b.wins - a.wins;
        // Then by point differential
        if (b.diff !== a.diff) return b.diff - a.diff;
        // Then by total points scored
        return b.pointsFor - a.pointsFor;
      });

    // Assign ranks
    const updates = {};
    sorted.forEach((player, index) => {
      updates[`${player.playerId}/rank`] = index + 1;
    });

    await update(standingsRef, updates);
  } catch (error) {
    console.error('Error recalculating pool rankings:', error);
    throw error;
  }
}

/**
 * Get top players from each pool to advance to next round
 * @param {string} tournamentId - Tournament ID
 * @param {string} roundId - Round ID
 * @param {number} advancePerPool - Number of players to advance per pool
 * @returns {Promise<Array<string>>} Array of advancing player IDs
 */
export async function getAdvancingPlayers(tournamentId, roundId, advancePerPool) {
  try {
    const roundRef = ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}/rounds/${roundId}`);
    const roundSnapshot = await get(roundRef);

    if (!roundSnapshot.exists()) {
      throw new Error('Round not found');
    }

    const round = roundSnapshot.val();
    const advancingPlayers = [];

    // Get top players from each pool
    for (const poolId of round.poolIds) {
      const poolRef = ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}/rounds/${roundId}/pools/${poolId}`);
      const poolSnapshot = await get(poolRef);

      if (poolSnapshot.exists()) {
        const pool = poolSnapshot.val();
        const standings = pool.standings;

        // Sort and get top N
        const sorted = Object.entries(standings)
          .map(([playerId, stats]) => ({ playerId, ...stats }))
          .sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            if (b.diff !== a.diff) return b.diff - a.diff;
            return b.pointsFor - a.pointsFor;
          })
          .slice(0, advancePerPool)
          .map(p => p.playerId);

        advancingPlayers.push(...sorted);
      }
    }

    return advancingPlayers;
  } catch (error) {
    console.error('Error getting advancing players:', error);
    throw error;
  }
}

/**
 * Advance to next round
 * @param {string} tournamentId - Tournament ID
 * @param {string} currentRoundId - Current round ID
 * @param {number} currentRoundNumber - Current round number
 * @param {number} advancePerPool - Number of players advancing per pool
 * @param {number} poolSize - Pool size for next round
 * @returns {Promise<Object>} New round data
 */
export async function advanceToNextRound(tournamentId, currentRoundId, currentRoundNumber, advancePerPool, poolSize = 4) {
  try {
    // Get advancing players BEFORE marking round complete
    const advancingPlayers = await getAdvancingPlayers(tournamentId, currentRoundId, advancePerPool);

    // Get the current round to check how many players were in it
    const currentRoundRef = ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}/rounds/${currentRoundId}`);
    const currentRoundSnapshot = await get(currentRoundRef);
    const currentRound = currentRoundSnapshot.val();

    // Count players in current round
    let currentRoundPlayerCount = 0;
    if (currentRound && currentRound.poolIds) {
      for (const poolId of currentRound.poolIds) {
        const poolRef = ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}/rounds/${currentRoundId}/pools/${poolId}`);
        const poolSnapshot = await get(poolRef);
        if (poolSnapshot.exists()) {
          const pool = poolSnapshot.val();
          currentRoundPlayerCount += pool.playerIds?.length || 0;
        }
      }
    }

    // Mark current round as completed
    await update(
      ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}/rounds/${currentRoundId}`),
      {
        status: 'completed',
        completedAt: Date.now(),
      }
    );

    // Check if this was the final round (4 or fewer players competed in THIS round)
    if (currentRoundPlayerCount <= 4) {
      // This was the final round - compute final standings
      await computeFinalStandings(tournamentId, currentRoundId, advancingPlayers);

      await update(ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}`), {
        status: TOURNAMENT_STATUS.COMPLETED,
      });

      return null;
    }

    // Generate next round with advancing players
    const nextRoundNumber = currentRoundNumber + 1;
    return await generateRoundPools(tournamentId, nextRoundNumber, advancingPlayers, poolSize);
  } catch (error) {
    console.error('Error advancing to next round:', error);
    throw error;
  }
}

/**
 * Compute final standings for tournament
 * @param {string} tournamentId - Tournament ID
 * @param {string} finalRoundId - Final round ID
 * @param {Array<string>} finalistIds - Player IDs in final round
 * @returns {Promise<void>}
 */
export async function computeFinalStandings(tournamentId, finalRoundId, finalistIds) {
  try {
    // Get all players
    const playersRef = ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}/players`);
    const playersSnapshot = await get(playersRef);

    if (!playersSnapshot.exists()) return;

    const players = playersSnapshot.val();

    // Sort all players by total stats
    const allPlayers = Object.values(players).sort((a, b) => {
      if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
      if (b.totalPointDiff !== a.totalPointDiff) return b.totalPointDiff - a.totalPointDiff;
      return b.totalPointsFor - a.totalPointsFor;
    });

    // Assign final ranks
    const updates = {};
    allPlayers.forEach((player, index) => {
      updates[`${player.id}/finalRank`] = index + 1;

      // Mark eliminated players
      if (!finalistIds.includes(player.id)) {
        updates[`${player.id}/eliminated`] = true;
      }
    });

    await update(playersRef, updates);
  } catch (error) {
    console.error('Error computing final standings:', error);
    throw error;
  }
}

/**
 * Subscribe to tournament players
 * @param {string} tournamentId - Tournament ID
 * @param {Function} callback - Callback with players data
 * @returns {Function} Unsubscribe function
 */
export function subscribePlayers(tournamentId, callback) {
  const playersRef = ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}/players`);
  return onValue(playersRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : {});
  });
}

/**
 * Subscribe to tournament rounds
 * @param {string} tournamentId - Tournament ID
 * @param {Function} callback - Callback with rounds data
 * @returns {Function} Unsubscribe function
 */
export function subscribeRounds(tournamentId, callback) {
  const roundsRef = ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}/rounds`);
  return onValue(roundsRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : {});
  });
}

/**
 * Subscribe to a specific round
 * @param {string} tournamentId - Tournament ID
 * @param {string} roundId - Round ID
 * @param {Function} callback - Callback with round data
 * @returns {Function} Unsubscribe function
 */
export function subscribeRound(tournamentId, roundId, callback) {
  const roundRef = ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}/rounds/${roundId}`);
  return onValue(roundRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
}

/**
 * Subscribe to pool standings
 * @param {string} tournamentId - Tournament ID
 * @param {string} roundId - Round ID
 * @param {string} poolId - Pool ID
 * @param {Function} callback - Callback with standings data
 * @returns {Function} Unsubscribe function
 */
export function subscribePoolStandings(tournamentId, roundId, poolId, callback) {
  const standingsRef = ref(
    database,
    `${DB_PATHS.TOURNAMENTS}/${tournamentId}/rounds/${roundId}/pools/${poolId}/standings`
  );
  return onValue(standingsRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : {});
  });
}

/**
 * Check if all matches in a pool are completed
 * @param {string} tournamentId - Tournament ID
 * @param {string} poolId - Pool ID
 * @returns {Promise<boolean>} True if all matches are completed
 */
export async function isPoolCompleted(tournamentId, poolId) {
  try {
    const matchesRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}`);
    const snapshot = await get(matchesRef);

    if (!snapshot.exists()) return false;

    const matches = snapshot.val();
    const poolMatches = Object.values(matches).filter(m => m.poolId === poolId);

    return poolMatches.every(m => m.status === MATCH_STATUS.COMPLETED);
  } catch (error) {
    console.error('Error checking pool completion:', error);
    return false;
  }
}

/**
 * Check if all pools in a round are completed
 * @param {string} tournamentId - Tournament ID
 * @param {string} roundId - Round ID
 * @returns {Promise<boolean>} True if all pools are completed
 */
export async function isRoundCompleted(tournamentId, roundId) {
  try {
    const roundRef = ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}/rounds/${roundId}`);
    const roundSnapshot = await get(roundRef);

    if (!roundSnapshot.exists()) return false;

    const round = roundSnapshot.val();

    for (const poolId of round.poolIds) {
      const completed = await isPoolCompleted(tournamentId, poolId);
      if (!completed) return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking round completion:', error);
    return false;
  }
}

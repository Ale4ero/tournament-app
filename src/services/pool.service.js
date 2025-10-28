import { ref, set, get, update, onValue } from 'firebase/database';
import { database } from './firebase';
import { DB_PATHS, MATCH_STATUS } from '../utils/constants';
import { generateSingleEliminationBracket } from '../utils/bracketGenerator';

/**
 * Apply snake seeding to distribute teams across pools
 * @param {Array<string>} teams - Seeded array of team names
 * @param {number} numPools - Number of pools
 * @returns {Array<Array<string>>} Array of pools with teams
 */
function applySnakeSeeding(teams, numPools) {
  const pools = Array.from({ length: numPools }, () => []);
  let currentPool = 0;
  let direction = 1; // 1 for forward, -1 for backward

  for (let i = 0; i < teams.length; i++) {
    pools[currentPool].push(teams[i]);

    // Move to next pool
    if (direction === 1) {
      if (currentPool === numPools - 1) {
        direction = -1;
      } else {
        currentPool++;
      }
    } else {
      if (currentPool === 0) {
        direction = 1;
      } else {
        currentPool--;
      }
    }
  }

  return pools;
}

/**
 * Create pools and distribute teams
 * @param {string} tournamentId - Tournament ID
 * @param {Array<string>} teams - Array of team names
 * @param {number} numPools - Number of pools to create
 * @param {Array<string>} seedOrder - Optional seed order for snake seeding
 * @returns {Promise<Object>} Pool assignments { poolId: [teams] }
 */
export async function createPools(tournamentId, teams, numPools, seedOrder = null) {
  try {
    if (teams.length < numPools) {
      throw new Error('Number of pools cannot exceed number of teams');
    }

    let poolTeamsArray;

    // Use snake seeding if seed order is provided
    if (seedOrder && seedOrder.length === teams.length) {
      poolTeamsArray = applySnakeSeeding(seedOrder, numPools);
    } else {
      // Fallback to random distribution (legacy behavior)
      const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
      poolTeamsArray = applySnakeSeeding(shuffledTeams, numPools);
    }

    const poolAssignments = {};

    for (let i = 0; i < numPools; i++) {
      const poolId = `pool_${String.fromCharCode(65 + i)}`;
      const poolName = `Pool ${String.fromCharCode(65 + i)}`;
      const poolTeams = poolTeamsArray[i];

      // Calculate total matches for round robin: n*(n-1)/2
      const totalMatches = (poolTeams.length * (poolTeams.length - 1)) / 2;

      const poolData = {
        id: poolId,
        name: poolName,
        tournamentId,
        teams: poolTeams,
        matchesCompleted: 0,
        totalMatches,
        status: 'upcoming',
        createdAt: Date.now(),
      };

      const poolRef = ref(database, `pools/${tournamentId}/${poolId}`);
      await set(poolRef, poolData);

      poolAssignments[poolId] = poolTeams;
    }

    return poolAssignments;
  } catch (error) {
    console.error('Error creating pools:', error);
    throw error;
  }
}

/**
 * Generate round-robin matches for a pool
 * @param {string} tournamentId - Tournament ID
 * @param {string} poolId - Pool ID
 * @param {Array<string>} teams - Teams in the pool
 * @param {Object} matchRules - Match rules configuration
 * @returns {Promise<Array>} Array of created matches
 */
export async function generatePoolMatches(tournamentId, poolId, teams, matchRules) {
  try {
    const matches = [];
    let matchNumber = 1;

    // Round robin: each team plays every other team once
    // Each match consists of multiple sets (numSets)
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const matchId = `${tournamentId}_${poolId}_m${matchNumber}`;

        const match = {
          id: matchId,
          tournamentId,
          matchType: 'pool',
          poolId,
          round: null, // null for pool matches
          matchNumber,
          team1: teams[i],
          team2: teams[j],
          score1: null,
          score2: null,
          winner: null,
          status: MATCH_STATUS.UPCOMING,
          setScores: [],
          rules: { ...matchRules },
          approvedAt: null,
          approvedBy: null,
          nextMatchId: null,
          isTeam1Winner: null,
        };

        const matchRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}/${matchId}`);
        await set(matchRef, match);

        matches.push(match);
        matchNumber++;
      }
    }

    return matches;
  } catch (error) {
    console.error('Error generating pool matches:', error);
    throw error;
  }
}

/**
 * Initialize standings for all teams in a pool
 * @param {string} tournamentId - Tournament ID
 * @param {string} poolId - Pool ID
 * @param {Array<string>} teams - Teams in the pool
 * @returns {Promise<void>}
 */
export async function initializePoolStandings(tournamentId, poolId, teams) {
  try {
    for (const team of teams) {
      const standingData = {
        team,
        poolId,
        tournamentId,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        points: 0,
        setsWon: 0,
        setsLost: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointDifferential: 0,
        setDifferential: 0,
        rank: 0,
        advancesToPlayoffs: false,
        playoffSeed: null,
        lastUpdated: Date.now(),
      };

      const standingRef = ref(database, `pools/${tournamentId}/${poolId}/standings/${encodeTeamName(team)}`);
      await set(standingRef, standingData);
    }
  } catch (error) {
    console.error('Error initializing pool standings:', error);
    throw error;
  }
}

/**
 * Update pool standings after a match is completed
 * @param {string} tournamentId - Tournament ID
 * @param {string} poolId - Pool ID
 * @param {Object} match - Completed match data
 * @param {Object} poolConfig - Pool configuration (pointsPerWin, etc.)
 * @returns {Promise<void>}
 */
export async function updatePoolStandings(tournamentId, poolId, match, poolConfig) {
  try {
    const { team1, team2, score1, score2, winner, setScores } = match;
    const { pointsPerWin = 3, pointsPerLoss = 0, pointsPerTie = 1 } = poolConfig;

    // Calculate set wins and point totals from setScores
    let team1SetsWon = score1;
    let team2SetsWon = score2;
    let team1PointsFor = 0;
    let team2PointsFor = 0;

    if (setScores && setScores.length > 0) {
      setScores.forEach((set) => {
        if (set.winner) {
          team1PointsFor += set.team1Score;
          team2PointsFor += set.team2Score;
        }
      });
    }

    // Update team1 standings (wins/losses based on sets won/lost, not match result)
    const team1StandingRef = ref(database, `pools/${tournamentId}/${poolId}/standings/${encodeTeamName(team1)}`);
    const team1StandingSnapshot = await get(team1StandingRef);

    if (team1StandingSnapshot.exists()) {
      const team1Standing = team1StandingSnapshot.val();
      const team1Updates = {
        matchesPlayed: team1Standing.matchesPlayed + 1,
        wins: team1Standing.wins + team1SetsWon, // Each set won counts as a win
        losses: team1Standing.losses + team2SetsWon, // Each set lost counts as a loss
        ties: team1Standing.ties, // No ties at set level
        points: team1Standing.points + (team1SetsWon * pointsPerWin) + (team2SetsWon * pointsPerLoss),
        setsWon: team1Standing.setsWon + team1SetsWon,
        setsLost: team1Standing.setsLost + team2SetsWon,
        pointsFor: team1Standing.pointsFor + team1PointsFor,
        pointsAgainst: team1Standing.pointsAgainst + team2PointsFor,
        pointDifferential: (team1Standing.pointsFor + team1PointsFor) - (team1Standing.pointsAgainst + team2PointsFor),
        setDifferential: (team1Standing.setsWon + team1SetsWon) - (team1Standing.setsLost + team2SetsWon),
        lastUpdated: Date.now(),
      };
      await update(team1StandingRef, team1Updates);
    }

    // Update team2 standings
    const team2StandingRef = ref(database, `pools/${tournamentId}/${poolId}/standings/${encodeTeamName(team2)}`);
    const team2StandingSnapshot = await get(team2StandingRef);

    if (team2StandingSnapshot.exists()) {
      const team2Standing = team2StandingSnapshot.val();
      const team2Updates = {
        matchesPlayed: team2Standing.matchesPlayed + 1,
        wins: team2Standing.wins + team2SetsWon, // Each set won counts as a win
        losses: team2Standing.losses + team1SetsWon, // Each set lost counts as a loss
        ties: team2Standing.ties, // No ties at set level
        points: team2Standing.points + (team2SetsWon * pointsPerWin) + (team1SetsWon * pointsPerLoss),
        setsWon: team2Standing.setsWon + team2SetsWon,
        setsLost: team2Standing.setsLost + team1SetsWon,
        pointsFor: team2Standing.pointsFor + team2PointsFor,
        pointsAgainst: team2Standing.pointsAgainst + team1PointsFor,
        pointDifferential: (team2Standing.pointsFor + team2PointsFor) - (team2Standing.pointsAgainst + team1PointsFor),
        setDifferential: (team2Standing.setsWon + team2SetsWon) - (team2Standing.setsLost + team1SetsWon),
        lastUpdated: Date.now(),
      };
      await update(team2StandingRef, team2Updates);
    }

    // Recalculate ranks for the entire pool
    await recalculatePoolRanks(tournamentId, poolId);

    // Update pool's matchesCompleted count
    const poolRef = ref(database, `pools/${tournamentId}/${poolId}`);
    const poolSnapshot = await get(poolRef);

    if (poolSnapshot.exists()) {
      const pool = poolSnapshot.val();
      const matchesCompleted = pool.matchesCompleted + 1;
      const status = matchesCompleted >= pool.totalMatches ? 'completed' : 'in_progress';

      await update(poolRef, {
        matchesCompleted,
        status,
      });
    }
  } catch (error) {
    console.error('Error updating pool standings:', error);
    throw error;
  }
}

/**
 * Recalculate and update ranks for all teams in a pool
 * @param {string} tournamentId - Tournament ID
 * @param {string} poolId - Pool ID
 * @returns {Promise<void>}
 */
async function recalculatePoolRanks(tournamentId, poolId) {
  try {
    const standingsRef = ref(database, `pools/${tournamentId}/${poolId}/standings`);
    const standingsSnapshot = await get(standingsRef);

    if (!standingsSnapshot.exists()) return;

    const standings = [];
    standingsSnapshot.forEach((child) => {
      standings.push({ key: child.key, ...child.val() });
    });

    // Sort by: points (desc), set differential (desc), point differential (desc)
    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.setDifferential !== a.setDifferential) return b.setDifferential - a.setDifferential;
      return b.pointDifferential - a.pointDifferential;
    });

    // Update ranks
    const updates = {};
    standings.forEach((standing, index) => {
      updates[`${standing.key}/rank`] = index + 1;
    });

    await update(standingsRef, updates);
  } catch (error) {
    console.error('Error recalculating pool ranks:', error);
    throw error;
  }
}

/**
 * Get all pools for a tournament
 * @param {string} tournamentId - Tournament ID
 * @returns {Promise<Array>} Array of pools
 */
export async function getPools(tournamentId) {
  try {
    const poolsRef = ref(database, `pools/${tournamentId}`);
    const snapshot = await get(poolsRef);

    if (!snapshot.exists()) return [];

    const pools = [];
    snapshot.forEach((child) => {
      pools.push(child.val());
    });

    return pools;
  } catch (error) {
    console.error('Error getting pools:', error);
    throw error;
  }
}

/**
 * Subscribe to pools for a tournament
 * @param {string} tournamentId - Tournament ID
 * @param {Function} callback - Callback function with pools array
 * @returns {Function} Unsubscribe function
 */
export function subscribePools(tournamentId, callback) {
  const poolsRef = ref(database, `pools/${tournamentId}`);
  return onValue(poolsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const pools = [];
    snapshot.forEach((child) => {
      pools.push(child.val());
    });

    callback(pools);
  });
}

/**
 * Get standings for a specific pool
 * @param {string} tournamentId - Tournament ID
 * @param {string} poolId - Pool ID
 * @returns {Promise<Array>} Array of standings sorted by rank
 */
export async function getPoolStandings(tournamentId, poolId) {
  try {
    const standingsRef = ref(database, `pools/${tournamentId}/${poolId}/standings`);
    const snapshot = await get(standingsRef);

    if (!snapshot.exists()) return [];

    const standings = [];
    snapshot.forEach((child) => {
      standings.push(child.val());
    });

    // Sort by rank
    standings.sort((a, b) => a.rank - b.rank);

    return standings;
  } catch (error) {
    console.error('Error getting pool standings:', error);
    throw error;
  }
}

/**
 * Subscribe to standings for a specific pool
 * @param {string} tournamentId - Tournament ID
 * @param {string} poolId - Pool ID
 * @param {Function} callback - Callback function with standings array
 * @returns {Function} Unsubscribe function
 */
export function subscribePoolStandings(tournamentId, poolId, callback) {
  const standingsRef = ref(database, `pools/${tournamentId}/${poolId}/standings`);
  return onValue(standingsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const standings = [];
    snapshot.forEach((child) => {
      standings.push(child.val());
    });

    // Sort by rank
    standings.sort((a, b) => a.rank - b.rank);

    callback(standings);
  });
}

/**
 * Advance top teams from pools to playoffs
 * @param {string} tournamentId - Tournament ID
 * @param {number} advancePerPool - Number of teams to advance from each pool
 * @param {Object} playoffConfig - Playoff bracket configuration
 * @param {string} adminUid - Admin user ID
 * @returns {Promise<Array>} Generated playoff matches
 */
export async function advanceToPlayoffs(tournamentId, advancePerPool, playoffConfig, adminUid) {
  try {
    // Get all pools
    const pools = await getPools(tournamentId);

    // Verify all pools are completed
    const allPoolsComplete = pools.every((pool) => pool.status === 'completed');
    if (!allPoolsComplete) {
      throw new Error('Cannot advance to playoffs until all pool matches are completed');
    }

    // Get top teams from each pool
    const advancingTeams = [];
    const seedingData = [];

    for (const pool of pools) {
      const standings = await getPoolStandings(tournamentId, pool.id);
      const topTeams = standings.slice(0, advancePerPool);

      topTeams.forEach((standing, index) => {
        advancingTeams.push(standing.team);
        seedingData.push({
          team: standing.team,
          poolId: pool.id,
          poolRank: standing.rank,
          poolPoints: standing.points,
          poolRecord: `${standing.wins}-${standing.losses}${standing.ties > 0 ? `-${standing.ties}` : ''}`,
          setDifferential: standing.setDifferential,
          pointDifferential: standing.pointDifferential,
        });
      });
    }

    // Sort all advancing teams by their performance (cross-pool seeding)
    seedingData.sort((a, b) => {
      // First by pool rank (1st place teams first)
      if (a.poolRank !== b.poolRank) return a.poolRank - b.poolRank;
      // Then by points
      if (b.poolPoints !== a.poolPoints) return b.poolPoints - a.poolPoints;
      // Then by set differential
      if (b.setDifferential !== a.setDifferential) return b.setDifferential - a.setDifferential;
      // Finally by point differential
      return b.pointDifferential - a.pointDifferential;
    });

    // Assign playoff seeds
    const seededTeams = seedingData.map((data, index) => ({
      ...data,
      seed: index + 1,
    }));

    // Save playoff seeding
    const seedingRef = ref(database, `tournaments/${tournamentId}/playoffSeeding`);
    await set(seedingRef, {
      seeds: seededTeams,
      generatedAt: Date.now(),
      generatedBy: adminUid,
    });

    // Update standings to mark which teams advance
    for (const pool of pools) {
      const standingsRef = ref(database, `pools/${tournamentId}/${pool.id}/standings`);
      const standings = await getPoolStandings(tournamentId, pool.id);

      const updates = {};
      standings.forEach((standing) => {
        const seedInfo = seededTeams.find((s) => s.team === standing.team);
        if (seedInfo) {
          updates[`${encodeTeamName(standing.team)}/advancesToPlayoffs`] = true;
          updates[`${encodeTeamName(standing.team)}/playoffSeed`] = seedInfo.seed;
        }
      });

      await update(standingsRef, updates);
    }

    // Generate playoff bracket with seeded teams
    const orderedTeams = seededTeams.map((s) => s.team);
    const playoffMatches = generateSingleEliminationBracket(
      orderedTeams,
      tournamentId,
      'seeded', // Use seeded order, not random
      playoffConfig.matchRules || {}
    );

    // Save playoff matches (mark them as playoff type)
    for (const match of playoffMatches) {
      const matchRef = ref(database, `${DB_PATHS.MATCHES}/${tournamentId}/${match.id}`);
      await set(matchRef, {
        ...match,
        matchType: 'playoff',
        poolId: null,
      });
    }

    // Update tournament status to playoffs
    const tournamentRef = ref(database, `${DB_PATHS.TOURNAMENTS}/${tournamentId}`);
    await update(tournamentRef, {
      status: 'playoffs',
      poolPlayCompletedAt: Date.now(),
      playoffsStartedAt: Date.now(),
    });

    return playoffMatches;
  } catch (error) {
    console.error('Error advancing to playoffs:', error);
    throw error;
  }
}

/**
 * Check if all pools are completed
 * @param {string} tournamentId - Tournament ID
 * @returns {Promise<boolean>} True if all pools are completed
 */
export async function areAllPoolsCompleted(tournamentId) {
  try {
    const pools = await getPools(tournamentId);
    return pools.every((pool) => pool.status === 'completed');
  } catch (error) {
    console.error('Error checking pool completion:', error);
    return false;
  }
}

/**
 * Encode team name for use as Firebase key (replace special characters)
 * @param {string} teamName - Team name
 * @returns {string} Encoded team name
 */
function encodeTeamName(teamName) {
  return teamName.replace(/[.#$[\]]/g, '_');
}

/**
 * Decode team name from Firebase key
 * @param {string} encodedName - Encoded team name
 * @returns {string} Decoded team name
 */
export function decodeTeamName(encodedName) {
  // This is a simple implementation - you may need to store original names
  // in the standing object if encoding is lossy
  return encodedName;
}

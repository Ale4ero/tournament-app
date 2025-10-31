/**
 * advance.service.js
 *
 * Service for handling flexible playoff advancement with auto-byes and play-in rounds.
 * Supports any number of teams advancing to playoffs (not just powers of 2).
 */

/**
 * Gets the largest power of 2 less than or equal to n
 * @param {number} n - Number of teams
 * @returns {number} Largest power of 2 <= n
 */
export function lowerPowerOfTwo(n) {
  if (n <= 0) return 0;
  return 2 ** Math.floor(Math.log2(n));
}

/**
 * Gets the smallest power of 2 greater than or equal to n
 * @param {number} n - Number of teams
 * @returns {number} Smallest power of 2 >= n
 */
export function higherPowerOfTwo(n) {
  if (n <= 0) return 0;
  return 2 ** Math.ceil(Math.log2(n));
}

/**
 * Suggests the optimal playoff format (byes vs play-in) for given number of teams
 * @param {number} numTeams - Number of teams advancing to playoffs
 * @returns {Object} Suggestion with format and math details
 * @property {string} suggestion - "byes" or "play-in"
 * @property {number} byes - Number of teams that would skip Round 1
 * @property {number} playIns - Number of teams participating in play-in matches
 * @property {number} lower - Lower power of 2
 * @property {number} higher - Higher power of 2
 *
 * @example
 * suggestPlayoffFormat(10)
 * // Returns: { suggestion: "play-in", byes: 6, playIns: 4, lower: 8, higher: 16 }
 */
export function suggestPlayoffFormat(numTeams) {
  if (numTeams <= 0) {
    return { suggestion: 'byes', byes: 0, playIns: 0, lower: 0, higher: 0 };
  }

  const lower = lowerPowerOfTwo(numTeams);
  const higher = higherPowerOfTwo(numTeams);

  // If already a power of 2, no byes or play-ins needed
  if (lower === higher) {
    return { suggestion: 'none', byes: 0, playIns: 0, lower, higher };
  }

  const byes = higher - numTeams;            // teams that would skip Round 1
  const playInMatches = numTeams - lower;     // extra matches needed
  const playIns = playInMatches * 2;          // teams participating in play-ins

  // Suggest play-in if it impacts fewer teams than byes
  const suggestion = playIns < byes ? 'play-in' : 'byes';

  return { suggestion, byes, playIns, lower, higher };
}

/**
 * Computes advancement math for any number of teams
 * @param {number} numTeams - Number of teams advancing
 * @returns {Object} Math details
 */
export function computeAdvancementMath(numTeams) {
  return suggestPlayoffFormat(numTeams);
}

/**
 * Builds seed array from teams with ranks
 * @param {Array<Object>} teamsWithRank - Array of { teamId, teamName, rank } objects
 * @returns {Array<Object>} Array of { teamId, teamName, seed } objects sorted by seed
 *
 * @example
 * buildSeeds([
 *   { teamId: 'team1', teamName: 'Team A', rank: 1 },
 *   { teamId: 'team2', teamName: 'Team B', rank: 2 }
 * ])
 * // Returns: [{ teamId: 'team1', teamName: 'Team A', seed: 1 }, ...]
 */
export function buildSeeds(teamsWithRank) {
  if (!Array.isArray(teamsWithRank) || teamsWithRank.length === 0) {
    return [];
  }

  // Sort by rank (ascending) and map to seed
  return teamsWithRank
    .sort((a, b) => a.rank - b.rank)
    .map((team, index) => ({
      teamId: team.teamId || team.id,
      teamName: team.teamName || team.name || team.team,
      seed: index + 1,
    }));
}

/**
 * Pairs seeds for a bracket round (1 vs last, 2 vs second-to-last, etc.)
 * @param {Array<Object>} seeds - Array of seed objects with { teamId, teamName, seed }
 * @returns {Array<Array<Object>>} Array of pairs [[seed1, seed2], ...]
 *
 * @example
 * pairSeedsForRound([{seed:1}, {seed:2}, {seed:3}, {seed:4}])
 * // Returns: [[{seed:1}, {seed:4}], [{seed:2}, {seed:3}]]
 */
export function pairSeedsForRound(seeds) {
  if (!Array.isArray(seeds) || seeds.length === 0) {
    return [];
  }

  const pairs = [];
  let i = 0;
  let j = seeds.length - 1;

  while (i < j) {
    pairs.push([seeds[i], seeds[j]]);
    i++;
    j--;
  }

  return pairs;
}

/**
 * Generates playoff bracket structure based on format (byes or play-in)
 * This function coordinates the bracket generation but doesn't write to Firebase.
 *
 * @param {Object} params - Parameters
 * @param {string} params.tournamentId - Tournament ID
 * @param {Array<Object>} params.seeds - Ordered seeds with { teamId, teamName, seed }
 * @param {string} params.format - "byes" or "play-in"
 * @param {Object} params.math - Math details from suggestPlayoffFormat
 * @param {Object} params.rules - Match rules object (by round)
 * @returns {Object} Bracket structure with matches organized by round
 */
export function generatePlayoffBracket({ tournamentId, seeds, format, math, rules = {} }) {
  if (!seeds || seeds.length === 0) {
    throw new Error('No seeds provided for playoff generation');
  }

  const numTeams = seeds.length;

  // If already power of 2, use standard bracket
  if (math.lower === math.higher) {
    return generateStandardBracket({ tournamentId, seeds, rules });
  }

  // Generate based on format
  if (format === 'byes') {
    return generateByesBracket({ tournamentId, seeds, byes: math.byes, higher: math.higher, rules });
  } else if (format === 'play-in') {
    return generatePlayInBracket({ tournamentId, seeds, playInMatches: (numTeams - math.lower), lower: math.lower, rules });
  } else {
    throw new Error(`Unknown playoff format: ${format}`);
  }
}

/**
 * Generates a standard bracket (power of 2 teams)
 * @param {Object} params
 * @returns {Object} Bracket structure
 */
function generateStandardBracket({ tournamentId, seeds, rules }) {
  const numTeams = seeds.length;
  const numRounds = Math.log2(numTeams);
  const rounds = {};
  const allMatches = [];

  // Generate matches for each round
  let currentSeeds = [...seeds];

  for (let roundNum = numRounds; roundNum >= 1; roundNum--) {
    const roundKey = getRoundKey(roundNum, numRounds);
    const roundMatches = [];

    if (roundNum === numRounds) {
      // First round: pair all seeds
      const pairs = pairSeedsForRound(currentSeeds);
      pairs.forEach((pair, idx) => {
        const match = createMatchObject({
          tournamentId,
          roundNum,
          roundKey,
          matchIndex: idx,
          team1: pair[0].teamName,
          team2: pair[1].teamName,
          seed1: pair[0].seed,
          seed2: pair[1].seed,
          rules: rules[roundKey],
        });
        roundMatches.push(match);
        allMatches.push(match);
      });
    } else {
      // Later rounds: create empty matches
      const matchesInRound = Math.pow(2, roundNum - 1);
      for (let idx = 0; idx < matchesInRound; idx++) {
        const match = createMatchObject({
          tournamentId,
          roundNum,
          roundKey,
          matchIndex: idx,
          rules: rules[roundKey],
        });
        roundMatches.push(match);
        allMatches.push(match);
      }
    }

    rounds[roundKey] = { matchIds: roundMatches.map(m => m.id) };
  }

  // Link matches to next round
  linkMatchesToNextRound(allMatches, numRounds);

  return { rounds, matches: allMatches };
}

/**
 * Generates a bracket with byes (top seeds skip Round 1)
 * @param {Object} params
 * @returns {Object} Bracket structure
 */
function generateByesBracket({ tournamentId, seeds, byes, higher, rules }) {
  const numRounds = Math.log2(higher);
  const rounds = {};
  const allMatches = [];

  // Top seeds get byes, rest play in Round 1
  const byeSeeds = seeds.slice(0, byes);
  const round1Seeds = seeds.slice(byes);

  // Round 1: pair remaining seeds
  const round1Key = getRoundKey(numRounds, numRounds);
  const round1Pairs = pairSeedsForRound(round1Seeds);
  const round1Matches = [];

  round1Pairs.forEach((pair, idx) => {
    const match = createMatchObject({
      tournamentId,
      roundNum: numRounds,
      roundKey: round1Key,
      matchIndex: idx,
      team1: pair[0].teamName,
      team2: pair[1].teamName,
      seed1: pair[0].seed,
      seed2: pair[1].seed,
      rules: rules[round1Key],
    });
    round1Matches.push(match);
    allMatches.push(match);
  });

  rounds[round1Key] = { matchIds: round1Matches.map(m => m.id) };

  // Round 2: bye seeds + winners from Round 1
  const round2Key = getRoundKey(numRounds - 1, numRounds);
  const round2Matches = [];
  const matchesInRound2 = higher / 2;

  for (let idx = 0; idx < matchesInRound2; idx++) {
    const match = createMatchObject({
      tournamentId,
      roundNum: numRounds - 1,
      roundKey: round2Key,
      matchIndex: idx,
      rules: rules[round2Key],
    });

    // Assign bye seeds to Round 2 matches
    if (idx < byeSeeds.length) {
      match.team1 = byeSeeds[idx].teamName;
      match.seed1 = byeSeeds[idx].seed;
    }

    round2Matches.push(match);
    allMatches.push(match);
  }

  rounds[round2Key] = { matchIds: round2Matches.map(m => m.id) };

  // Generate remaining rounds (empty)
  for (let roundNum = numRounds - 2; roundNum >= 1; roundNum--) {
    const roundKey = getRoundKey(roundNum, numRounds);
    const roundMatches = [];
    const matchesInRound = Math.pow(2, roundNum - 1);

    for (let idx = 0; idx < matchesInRound; idx++) {
      const match = createMatchObject({
        tournamentId,
        roundNum,
        roundKey,
        matchIndex: idx,
        rules: rules[roundKey],
      });
      roundMatches.push(match);
      allMatches.push(match);
    }

    rounds[roundKey] = { matchIds: roundMatches.map(m => m.id) };
  }

  // Link matches
  linkMatchesToNextRound(allMatches, numRounds);

  return { rounds, matches: allMatches };
}

/**
 * Generates a bracket with play-in rounds (lowest seeds play extra matches)
 * @param {Object} params
 * @returns {Object} Bracket structure
 */
function generatePlayInBracket({ tournamentId, seeds, playInMatches, lower, rules }) {
  const numTeams = seeds.length;
  const numRounds = Math.log2(lower) + 1; // +1 for play-in round
  const rounds = {};
  const allMatches = [];

  // Split: top seeds auto-advance, bottom seeds play play-in
  const autoAdvanceCount = numTeams - (playInMatches * 2);
  const topSeeds = seeds.slice(0, playInMatches); // Top seeds that will face play-in winners
  const middleSeeds = seeds.slice(playInMatches, autoAdvanceCount); // Middle seeds that pair with each other
  const playInSeeds = seeds.slice(autoAdvanceCount); // Bottom seeds that play in play-in round

  console.log('[generatePlayInBracket] Top seeds (face play-in winners):', topSeeds.map(s => s.seed));
  console.log('[generatePlayInBracket] Middle seeds (pair with each other):', middleSeeds.map(s => s.seed));
  console.log('[generatePlayInBracket] Play-in seeds:', playInSeeds.map(s => s.seed));

  // Play-in round: lowest seeds play each other (7v10, 8v9)
  const playInKey = 'play-in';
  const playInPairs = pairSeedsForRound(playInSeeds);
  const playInRoundMatches = [];

  playInPairs.forEach((pair, idx) => {
    const match = createMatchObject({
      tournamentId,
      roundNum: numRounds,
      roundKey: playInKey,
      matchIndex: idx,
      team1: pair[0].teamName,
      team2: pair[1].teamName,
      seed1: pair[0].seed,
      seed2: pair[1].seed,
      rules: rules[playInKey] || rules['round1'],
    });
    playInRoundMatches.push(match);
    allMatches.push(match);
  });

  rounds[playInKey] = { matchIds: playInRoundMatches.map(m => m.id) };

  // Round 1: Build matches in specific order
  const round1Key = getRoundKey(numRounds - 1, numRounds - 1);
  const round1Matches = [];
  const matchesInRound1 = lower / 2;

  // First set of matches: Top seeds vs play-in winners
  for (let idx = 0; idx < playInMatches; idx++) {
    const match = createMatchObject({
      tournamentId,
      roundNum: numRounds - 1,
      roundKey: round1Key,
      matchIndex: idx,
      team1: topSeeds[idx].teamName,
      seed1: topSeeds[idx].seed,
      rules: rules[round1Key],
    });
    // team2 will be filled by play-in winner
    round1Matches.push(match);
    allMatches.push(match);
  }

  // Second set of matches: Middle seeds paired with each other (3v6, 4v5)
  const middlePairs = pairSeedsForRound(middleSeeds);
  middlePairs.forEach((pair, idx) => {
    const match = createMatchObject({
      tournamentId,
      roundNum: numRounds - 1,
      roundKey: round1Key,
      matchIndex: playInMatches + idx,
      team1: pair[0].teamName,
      team2: pair[1].teamName,
      seed1: pair[0].seed,
      seed2: pair[1].seed,
      rules: rules[round1Key],
    });
    round1Matches.push(match);
    allMatches.push(match);
  });

  rounds[round1Key] = { matchIds: round1Matches.map(m => m.id) };

  // Generate remaining rounds (empty)
  for (let roundNum = numRounds - 2; roundNum >= 1; roundNum--) {
    const roundKey = getRoundKey(roundNum, numRounds - 1);
    const roundMatches = [];
    const matchesInRound = Math.pow(2, roundNum - 1);

    for (let idx = 0; idx < matchesInRound; idx++) {
      const match = createMatchObject({
        tournamentId,
        roundNum,
        roundKey,
        matchIndex: idx,
        rules: rules[roundKey],
      });
      roundMatches.push(match);
      allMatches.push(match);
    }

    rounds[roundKey] = { matchIds: roundMatches.map(m => m.id) };
  }

  // Link matches
  linkMatchesToNextRoundWithPlayIn(allMatches, numRounds, playInMatches);

  return { rounds, matches: allMatches };
}

/**
 * Creates a match object with standard structure
 */
function createMatchObject({ tournamentId, roundNum, roundKey, matchIndex, team1, team2, seed1, seed2, rules }) {
  const matchId = `${tournamentId}_${roundKey}_m${matchIndex + 1}`;

  return {
    id: matchId,
    tournamentId,
    round: roundNum,
    roundName: roundKey,
    matchNumber: matchIndex + 1,
    matchType: 'playoff',
    team1: team1 || null,
    team2: team2 || null,
    seed1: seed1 || null,
    seed2: seed2 || null,
    score1: null,
    score2: null,
    winner: null,
    status: 'upcoming',
    nextMatchId: null,
    isTeam1Winner: null,
    rules: rules || {},
    setScores: [],
  };
}

/**
 * Links matches to their next round matches
 */
function linkMatchesToNextRound(matches, totalRounds) {
  matches.forEach(match => {
    if (match.round > 1) {
      // Find the next round
      const nextRoundNum = match.round - 1;
      const nextMatchIndex = Math.floor((match.matchNumber - 1) / 2);

      const nextMatch = matches.find(
        m => m.round === nextRoundNum && m.matchNumber === nextMatchIndex + 1
      );

      if (nextMatch) {
        match.nextMatchId = nextMatch.id;
        match.isTeam1Winner = (match.matchNumber - 1) % 2 === 0;
      }
    }
  });
}

/**
 * Links matches including play-in round
 * @param {Array} matches - All matches
 * @param {number} totalRounds - Total number of rounds
 * @param {number} numPlayInMatches - Number of play-in matches
 */
function linkMatchesToNextRoundWithPlayIn(matches, totalRounds, numPlayInMatches) {
  const playInMatches = matches.filter(m => m.roundName === 'play-in');
  const mainMatches = matches.filter(m => m.roundName !== 'play-in');
  const round1Matches = mainMatches.filter(m => m.round === totalRounds - 1);

  // Link each play-in match to corresponding Round 1 match
  // Play-in match 0 winner → Round 1 match 0 (vs top seed #1)
  // Play-in match 1 winner → Round 1 match 1 (vs top seed #2)
  playInMatches.forEach((playInMatch, idx) => {
    if (idx < round1Matches.length) {
      const targetRound1Match = round1Matches[idx];
      playInMatch.nextMatchId = targetRound1Match.id;
      playInMatch.isTeam1Winner = false; // Winner goes to team2 slot (top seed is team1)
      console.log(`[linkPlayIn] Play-in match ${idx} → Round 1 match ${idx} (${targetRound1Match.id})`);
    }
  });

  // Link main bracket matches normally
  linkMatchesToNextRound(mainMatches, totalRounds - 1);
}

/**
 * Gets round key from round number
 */
function getRoundKey(round, totalRounds) {
  if (round === 1) return 'finals';
  if (round === 2) return 'semifinals';
  if (round === 3) return 'quarterfinals';
  return `round${totalRounds - round + 1}`;
}

/**
 * Example test cases
 */
export const TEST_CASES = {
  '10_teams': {
    input: 10,
    expected: { suggestion: 'play-in', byes: 6, playIns: 4, lower: 8, higher: 16 },
  },
  '12_teams': {
    input: 12,
    expected: { suggestion: 'byes', byes: 4, playIns: 8, lower: 8, higher: 16 },
  },
  '9_teams': {
    input: 9,
    expected: { suggestion: 'play-in', byes: 7, playIns: 2, lower: 8, higher: 16 },
  },
};

import { MATCH_STATUS } from './constants';

/**
 * Generates a single elimination bracket structure
 * @param {string[]} teams - Array of team names
 * @param {string} tournamentId - Tournament ID
 * @param {string} seedingType - 'manual' or 'random'
 * @returns {Object[]} Array of match objects
 */
export function generateSingleEliminationBracket(teams, tournamentId, seedingType = 'random') {
  // Shuffle teams if random seeding
  const seededTeams = seedingType === 'random' ? shuffleArray([...teams]) : [...teams];

  // Calculate number of rounds needed
  const numTeams = seededTeams.length;
  const numRounds = Math.ceil(Math.log2(numTeams));
  const totalMatches = Math.pow(2, numRounds) - 1;

  const matches = [];
  let matchCounter = 1;

  // Start from the final round and work backwards
  for (let round = 1; round <= numRounds; round++) {
    const matchesInRound = Math.pow(2, round - 1);

    for (let i = 0; i < matchesInRound; i++) {
      const matchId = `${tournamentId}_r${round}_m${i + 1}`;
      const match = {
        id: matchId,
        tournamentId,
        round,
        matchNumber: matchCounter++,
        team1: null,
        team2: null,
        score1: null,
        score2: null,
        winner: null,
        status: MATCH_STATUS.UPCOMING,
        nextMatchId: null,
        isTeam1Winner: null,
        submittedAt: null,
        approvedAt: null,
        approvedBy: null,
      };

      // Link to next round match
      if (round > 1) {
        const nextMatchIndex = Math.floor(i / 2);
        match.nextMatchId = `${tournamentId}_r${round - 1}_m${nextMatchIndex + 1}`;
        match.isTeam1Winner = i % 2 === 0;
      }

      matches.push(match);
    }
  }

  // Assign teams to first round matches
  const firstRoundMatches = matches.filter(m => m.round === numRounds);
  for (let i = 0; i < seededTeams.length; i++) {
    const matchIndex = Math.floor(i / 2);
    if (matchIndex < firstRoundMatches.length) {
      if (i % 2 === 0) {
        firstRoundMatches[matchIndex].team1 = seededTeams[i];
      } else {
        firstRoundMatches[matchIndex].team2 = seededTeams[i];
      }
    }
  }

  return matches;
}

/**
 * Advances the winner to the next match
 * @param {Object} completedMatch - The completed match
 * @param {Object[]} allMatches - All matches in the tournament
 * @returns {Object|null} The updated next match or null
 */
export function advanceWinner(completedMatch, allMatches) {
  if (!completedMatch.winner || !completedMatch.nextMatchId) {
    return null;
  }

  const nextMatch = allMatches.find(m => m.id === completedMatch.nextMatchId);
  if (!nextMatch) {
    return null;
  }

  // Update next match with winner
  // isTeam1Winner indicates which SLOT in the next match this winner goes to
  // NOT whether team1 won this match
  const updatedMatch = { ...nextMatch };
  if (completedMatch.isTeam1Winner === true) {
    updatedMatch.team1 = completedMatch.winner;
  } else if (completedMatch.isTeam1Winner === false) {
    updatedMatch.team2 = completedMatch.winner;
  }

  return updatedMatch;
}

/**
 * Determines the winner based on scores
 * @param {number} score1 - Team 1 score
 * @param {number} score2 - Team 2 score
 * @param {string} team1 - Team 1 name
 * @param {string} team2 - Team 2 name
 * @returns {string|null} Winner team name or null if tie
 */
export function determineWinner(score1, score2, team1, team2) {
  if (score1 === null || score2 === null) return null;
  if (score1 > score2) return team1;
  if (score2 > score1) return team2;
  return null; // Tie - would need tiebreaker rules
}

/**
 * Shuffles an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Gets matches for a specific round
 * @param {Object[]} matches - All matches
 * @param {number} round - Round number
 * @returns {Object[]} Matches in that round
 */
export function getMatchesByRound(matches, round) {
  return matches.filter(m => m.round === round).sort((a, b) => a.matchNumber - b.matchNumber);
}

/**
 * Gets the round name (Finals, Semi-finals, etc.)
 * @param {number} round - Round number (1 = finals)
 * @returns {string} Round name
 */
export function getRoundName(round) {
  const names = {
    1: 'Finals',
    2: 'Semi-Finals',
    3: 'Quarter-Finals',
    4: 'Round of 16',
    5: 'Round of 32',
  };
  return names[round] || `Round ${round}`;
}

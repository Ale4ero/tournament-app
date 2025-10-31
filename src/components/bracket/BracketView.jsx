import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../../services/firebase';
import { useMatches } from '../../hooks/useMatches';
import { getMatchesByRound, getRoundName } from '../../utils/bracketGenerator';
import MatchCard from './MatchCard';

export default function BracketView({ tournamentId }) {
  const { matches, loading } = useMatches(tournamentId);
  const [playoffSeeding, setPlayoffSeeding] = useState(null);

  // Fetch playoff seeding data
  useEffect(() => {
    if (!tournamentId) return;

    const seedingRef = ref(database, `tournaments/${tournamentId}/playoffSeeding`);
    const unsubscribe = onValue(seedingRef, (snapshot) => {
      if (snapshot.exists()) {
        setPlayoffSeeding(snapshot.val());
      }
    });

    return () => unsubscribe();
  }, [tournamentId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading bracket...</div>
      </div>
    );
  }

  // Filter to only show playoff matches (exclude pool matches)
  const playoffMatches = matches.filter(
    (match) => match.matchType !== 'pool' && match.round !== null
  );

  if (playoffMatches.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm">
        <p className="text-gray-600 text-lg">No playoff matches scheduled yet</p>
      </div>
    );
  }

  // Separate play-in matches from regular rounds
  const playInMatches = playoffMatches.filter((m) => m.roundName === 'play-in');
  const regularMatches = playoffMatches.filter((m) => m.roundName !== 'play-in');

  // Get all regular rounds (sort descending so earlier rounds appear first, finals on right)
  const rounds = [...new Set(regularMatches.map((m) => m.round))].sort((a, b) => b - a);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold mb-6">Tournament Bracket</h2>

      {/* Mobile: Stack rounds vertically */}
      <div className="lg:hidden space-y-8">
        {/* Play-in Round (if exists) */}
        {playInMatches.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-4 text-purple-700">
              Play-In Round
            </h3>
            <div className="space-y-4">
              {playInMatches.map((match) => (
                <MatchCard key={match.id} match={match} playoffSeeding={playoffSeeding} />
              ))}
            </div>
          </div>
        )}

        {/* Regular Rounds */}
        {rounds.map((round) => {
          const roundMatches = getMatchesByRound(regularMatches, round);
          return (
            <div key={round}>
              <h3 className="text-lg font-bold mb-4 text-gray-700">
                {getRoundName(round)}
              </h3>
              <div className="space-y-4">
                {roundMatches.map((match) => (
                  <MatchCard key={match.id} match={match} playoffSeeding={playoffSeeding} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: Bracket tree layout */}
      <div className="hidden lg:block overflow-x-auto pb-8">
        {/* Round Headers - Fixed at top */}
        <div className="flex min-w-max mb-6">
          {playInMatches.length > 0 && (
            <div className="flex-1 px-5">
              <h3 className="text-base font-bold text-purple-700 text-center bg-purple-50 py-2 rounded">
                Play-In Round
              </h3>
            </div>
          )}
          {rounds.map((round) => (
            <div key={`${round}-header`} className="flex-1 px-5">
              <h3 className="text-base font-bold text-gray-700 text-center bg-gray-50 py-2 rounded">
                {getRoundName(round)}
              </h3>
            </div>
          ))}
        </div>

        {/* Bracket Matches */}
        <div className="flex items-start min-w-max" style={{ minHeight: '500px' }}>
          {/* Play-in Round (if exists) */}
          {playInMatches.length > 0 && (
            <div className="flex-1 px-5 pb-2.5 pl-5 flex flex-col">
              {playInMatches.map((match, idx) => {
                // Calculate spacing to align with corresponding quarter-final match
                // Quarter-finals render with marginTop = matchGap between each match
                // So if QF uses matchGap between matches, play-ins should use the same
                const baseGap = 12;
                const quarterFinalMultiplier = 2;
                const matchGap = baseGap * quarterFinalMultiplier; // 24px

                // Simple approach: use the same marginTop logic as quarter-finals
                // First match: no margin, subsequent matches: matchGap
                const topMargin = idx === 0 ? 0 : matchGap;

                const bracketNumber = idx + 1; // Play-in matches are #1, #2, etc.

                return (
                  <div
                    key={match.id}
                    className="relative text-sm flex items-center w-full"
                    style={{ marginTop: `${topMargin}px` }}
                  >
                    <div className="w-full">
                      <MatchCard
                        match={match}
                        compact
                        playoffSeeding={playoffSeeding}
                        bracketMatchNumber={bracketNumber}
                        isPlayIn={true}
                      />
                    </div>

                    {/* Simple horizontal line connector */}
                    <div
                      className="absolute bg-gray-300"
                      style={{
                        top: '50%',
                        left: '100%',
                        width: '20px',
                        height: '2px',
                        marginLeft: '8px',
                        transform: 'translateY(-50%)'
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Regular Rounds */}
          {rounds.map((round, roundIndex) => {
            const roundMatches = getMatchesByRound(regularMatches, round);
            const isLastRound = roundIndex === rounds.length - 1;

            // Calculate spacing - each round doubles the gap
            const matchHeight = 80;
            const baseGap = 12; // Gap between matches in play-in round

            // For first round after play-in, spacing should position matches at bracket midpoints
            const prevRoundMultiplier = Math.pow(2, roundIndex + (playInMatches.length > 0 ? 0 : -1));
            const currentRoundMultiplier = Math.pow(2, roundIndex + (playInMatches.length > 0 ? 1 : 0));

            // Space between matches in this round
            const matchGap = baseGap * currentRoundMultiplier;

            // Calculate base match number for this round
            let baseMatchNumber = playInMatches.length;
            for (let i = 0; i < roundIndex; i++) {
              const prevRoundMatches = getMatchesByRound(regularMatches, rounds[i]);
              baseMatchNumber += prevRoundMatches.length;
            }

            // Pre-calculate all match positions for the previous round (if exists)
            // We need to recursively calculate positions based on midpoints
            const prevRoundPositions = [];

            if (roundIndex === 0) {
              // For first round, calculate positions based on their actual layout
              // Gap multiplier depends on whether there are play-ins
              const firstRoundMultiplier = playInMatches.length > 0 ? 2 : 1;
              const firstRoundGap = baseGap * firstRoundMultiplier;
              let cumulativePos = 0;
              for (let i = 0; i < roundMatches.length; i++) {
                if (i > 0) cumulativePos += matchHeight + firstRoundGap;
                prevRoundPositions.push(cumulativePos + (matchHeight / 2));
              }
            } else {
              // For subsequent rounds, we need to calculate based on their predecessors
              // Start with first round positions
              const firstRoundPositions = [];
              const firstRoundMultiplier = playInMatches.length > 0 ? 2 : 1;
              const firstRoundGap = baseGap * firstRoundMultiplier;
              let cumulativePos = 0;
              const firstRoundCount = getMatchesByRound(regularMatches, rounds[0]).length;
              for (let i = 0; i < firstRoundCount; i++) {
                if (i > 0) cumulativePos += matchHeight + firstRoundGap;
                firstRoundPositions.push(cumulativePos + (matchHeight / 2));
              }

              // Now calculate positions for each round leading up to previous round
              let currentRoundPositions = firstRoundPositions;
              for (let r = 1; r < roundIndex; r++) {
                const nextRoundCount = Math.ceil(currentRoundPositions.length / 2);
                const nextRoundPositions = [];
                for (let i = 0; i < nextRoundCount; i++) {
                  const pred1 = currentRoundPositions[i * 2];
                  const pred2 = currentRoundPositions[i * 2 + 1];
                  nextRoundPositions.push((pred1 + pred2) / 2);
                }
                currentRoundPositions = nextRoundPositions;
              }

              prevRoundPositions.push(...currentRoundPositions);
            }

            return (
              <div key={round} className="flex-1 px-5 pb-2.5 pl-7 flex flex-col">
                {roundMatches.map((match, idx) => {
                  const isTopOfPair = idx % 2 === 0;
                  const hasPartner = idx + 1 < roundMatches.length;
                  const showBracket = isTopOfPair && hasPartner && !isLastRound;

                  // Calculate this match's bracket number
                  const bracketNumber = baseMatchNumber + idx + 1;

                  // Calculate position for this match based on midpoint of predecessors
                  let targetCenterPosition;
                  if (roundIndex === 0) {
                    // Quarter-finals align from top with their own spacing
                    targetCenterPosition = prevRoundPositions[idx];
                  } else {
                    // This match should be at midpoint between two predecessor matches
                    const pred1Index = idx * 2;
                    const pred2Index = idx * 2 + 1;
                    const pred1Center = prevRoundPositions[pred1Index];
                    const pred2Center = prevRoundPositions[pred2Index];
                    targetCenterPosition = (pred1Center + pred2Center) / 2;
                  }

                  // Calculate bracket height dynamically based on distance to partner match
                  let bracketHeight = matchHeight + matchGap; // default
                  if (showBracket) {
                    // Get partner match's center position
                    const partnerIdx = idx + 1;
                    let partnerCenterPosition;
                    if (roundIndex === 0) {
                      partnerCenterPosition = prevRoundPositions[partnerIdx];
                    } else {
                      const pred1Index = partnerIdx * 2;
                      const pred2Index = partnerIdx * 2 + 1;
                      const pred1Center = prevRoundPositions[pred1Index];
                      const pred2Center = prevRoundPositions[pred2Index];
                      partnerCenterPosition = (pred1Center + pred2Center) / 2;
                    }
                    // Distance between centers
                    bracketHeight = partnerCenterPosition - targetCenterPosition;
                  }

                  // Calculate marginTop based on previous match's position
                  let topMargin;
                  if (idx === 0) {
                    // First match: offset from top = targetCenter - (matchHeight / 2)
                    topMargin = targetCenterPosition - (matchHeight / 2);
                  } else {
                    // Subsequent matches: calculate relative to previous match
                    const prevTargetCenter = roundIndex === 0
                      ? prevRoundPositions[idx - 1]
                      : ((prevRoundPositions[(idx - 1) * 2] + prevRoundPositions[(idx - 1) * 2 + 1]) / 2);
                    const prevMatchTop = prevTargetCenter - (matchHeight / 2);
                    const thisMatchTop = targetCenterPosition - (matchHeight / 2);
                    topMargin = thisMatchTop - prevMatchTop - matchHeight;
                  }

                  // Determine source match numbers for TBD teams
                  let team1SourceMatch = null;
                  let team2SourceMatch = null;

                  if (roundIndex === 0 && playInMatches.length > 0) {
                    // First round after play-in: top slots get play-in winners
                    if (idx < playInMatches.length) {
                      team2SourceMatch = idx + 1; // Play-in match number
                    }
                  } else if (roundIndex > 0) {
                    // Subsequent rounds: winners from previous round
                    const prevRoundBaseNumber = baseMatchNumber - getMatchesByRound(regularMatches, rounds[roundIndex - 1]).length;
                    team1SourceMatch = prevRoundBaseNumber + (idx * 2) + 1;
                    team2SourceMatch = prevRoundBaseNumber + (idx * 2) + 2;
                  }

                  return (
                    <div
                      key={match.id}
                      className="relative text-sm flex items-center w-full"
                      style={{ marginTop: `${topMargin}px` }}
                    >
                      <div className="w-full">
                        <MatchCard
                          match={match}
                          compact
                          playoffSeeding={playoffSeeding}
                          bracketMatchNumber={bracketNumber}
                          team1SourceMatch={team1SourceMatch}
                          team2SourceMatch={team2SourceMatch}
                        />
                      </div>

                      {/* Bracket connector - only on top match of pair */}
                      {showBracket && (
                        <div
                          className="absolute flex items-center"
                          style={{
                            margin: '-1px 8px',
                            top: '50%',
                            left: '100%',
                            width: '10px',
                            height: `${bracketHeight}px`,
                            borderRadius: '0 4px 4px 0',
                            border: '2px solid #d1d5db',
                            borderLeft: '0',
                            zIndex: 1
                          }}
                        >
                          <span
                            className="block bg-gray-300"
                            style={{
                              width: '10px',
                              height: '2px',
                              transform: 'translate3d(100%, 0, 0)'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-blue-300 bg-blue-50"></div>
            <span className="text-gray-700">Upcoming</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-green-400 bg-green-50"></div>
            <span className="text-gray-700">Live</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-gray-300 bg-gray-50"></div>
            <span className="text-gray-700">Completed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

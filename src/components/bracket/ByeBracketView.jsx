import { getMatchesByRound, getRoundName } from '../../utils/bracketGenerator';
import MatchCard from './MatchCard';

/**
 * ByeBracketView - Renders brackets for "bye" style tournaments
 * where top-seeded teams skip the first round.
 * Uses relationship-based positioning where matches align with their actual feeders.
 */
export default function ByeBracketView({ playoffMatches, playoffSeeding }) {
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
                const baseGap = 12;
                const quarterFinalMultiplier = 2;
                const matchGap = baseGap * quarterFinalMultiplier;
                const topMargin = idx === 0 ? 0 : matchGap;
                const bracketNumber = idx + 1;

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

          {/* Regular Rounds - BYE STYLE POSITIONING */}
          {rounds.map((round, roundIndex) => {
            const roundMatches = getMatchesByRound(regularMatches, round);
            const isLastRound = roundIndex === rounds.length - 1;

            // Get previous round matches for calculating feeder positions
            const prevRound = roundIndex > 0 ? rounds[roundIndex - 1] : null;
            const prevRoundMatches = prevRound ? getMatchesByRound(regularMatches, prevRound) : [];

            // Calculate spacing
            const matchHeight = 80;
            const baseGap = 12;

            // Calculate base match number for this round
            let baseMatchNumber = playInMatches.length;
            for (let i = 0; i < roundIndex; i++) {
              const prevRoundMatches = getMatchesByRound(regularMatches, rounds[i]);
              baseMatchNumber += prevRoundMatches.length;
            }

            // Calculate positions for the previous round using actual feeding relationships
            // Build a map of match positions for ALL previous rounds
            const allRoundPositions = new Map(); // matchId -> centerPosition

            // Start with first round: calculate absolute positions
            const firstRoundMultiplier = playInMatches.length > 0 ? 2 : 3;
            const firstRoundGap = baseGap * firstRoundMultiplier;
            const firstRoundMatches = getMatchesByRound(regularMatches, rounds[0]);
            let cumulativePos = 0;

            firstRoundMatches.forEach((match, i) => {
              if (i > 0) cumulativePos += matchHeight + firstRoundGap;
              const centerPosition = cumulativePos + (matchHeight / 2);
              allRoundPositions.set(match.id, centerPosition);
            });

            // For subsequent rounds, calculate based on actual feeding relationships
            for (let r = 1; r < roundIndex; r++) {
              const currentRoundMatches = getMatchesByRound(regularMatches, rounds[r]);

              currentRoundMatches.forEach(match => {
                // Find all matches that feed into this match
                const feeders = playoffMatches.filter(m => m.nextMatchId === match.id);

                if (feeders.length === 0) {
                  // No feeders (shouldn't happen) - use default
                  allRoundPositions.set(match.id, 0);
                } else if (feeders.length === 1) {
                  // One feeder (bye scenario) - align with feeder's center
                  const feederPos = allRoundPositions.get(feeders[0].id) || 0;
                  allRoundPositions.set(match.id, feederPos);
                } else {
                  // Multiple feeders - align with midpoint
                  const feederPositions = feeders
                    .map(f => allRoundPositions.get(f.id))
                    .filter(pos => pos !== undefined);

                  if (feederPositions.length > 0) {
                    const avgPos = feederPositions.reduce((sum, pos) => sum + pos, 0) / feederPositions.length;
                    allRoundPositions.set(match.id, avgPos);
                  } else {
                    allRoundPositions.set(match.id, 0);
                  }
                }
              });
            }

            // Extract positions for the previous round matches in order
            let prevRoundPositions = prevRoundMatches.map(m => allRoundPositions.get(m.id) || 0);

            // For first round (roundIndex === 0), prevRoundPositions will be empty
            // We need to use THIS round's positions from allRoundPositions
            if (roundIndex === 0) {
              prevRoundPositions = roundMatches.map(m => allRoundPositions.get(m.id) || 0);
            }

            // Track calculated center positions for THIS round's matches
            const currentRoundCenterPositions = [];

            return (
              <div key={round} className="flex-1 px-5 pb-2.5 pl-7 flex flex-col" style={{ overflow: 'visible' }}>
                {roundMatches.map((match, idx) => {
                  // Calculate this match's bracket number
                  const bracketNumber = baseMatchNumber + idx + 1;

                  // Find all matches from PREVIOUS round that feed into THIS match
                  const feedingMatches = playoffMatches.filter(m => m.nextMatchId === match.id);

                  // Determine source match numbers for TBD display
                  let team1SourceMatch = null;
                  let team2SourceMatch = null;

                  feedingMatches.forEach(feedingMatch => {
                    if (feedingMatch.isTeam1Winner) {
                      team1SourceMatch = feedingMatch.matchNumber;
                    } else {
                      team2SourceMatch = feedingMatch.matchNumber;
                    }
                  });

                  // Calculate position: align with center of predecessor(s)
                  let targetCenterPosition;

                  if (roundIndex === 0) {
                    // First round: use pre-calculated positions
                    targetCenterPosition = prevRoundPositions[idx];
                  } else {
                    // Subsequent rounds: align with center of feeding matches from PREVIOUS round
                    if (feedingMatches.length === 0) {
                      // No feeders (shouldn't happen in normal brackets) - use fallback
                      targetCenterPosition = prevRoundPositions[idx] || 0;
                    } else if (feedingMatches.length === 1) {
                      // ONE predecessor (bye scenario): align with that match's center
                      const feederIdx = prevRoundMatches.findIndex(m => m.id === feedingMatches[0].id);
                      targetCenterPosition = feederIdx >= 0 ? prevRoundPositions[feederIdx] : prevRoundPositions[idx] || 0;
                    } else {
                      // TWO or more predecessors: align with midpoint between their centers
                      const feederIndices = feedingMatches
                        .map(f => prevRoundMatches.findIndex(m => m.id === f.id))
                        .filter(idx => idx >= 0);

                      if (feederIndices.length > 0) {
                        const sum = feederIndices.reduce((acc, idx) => acc + prevRoundPositions[idx], 0);
                        targetCenterPosition = sum / feederIndices.length;
                      } else {
                        targetCenterPosition = prevRoundPositions[idx] || 0;
                      }
                    }
                  }

                  // Store this match's center position for calculating margins of subsequent matches
                  currentRoundCenterPositions.push(targetCenterPosition);

                  // Determine connector line type based on number of predecessors
                  const hasTwoPredecessors = feedingMatches.length === 2;
                  const showBracketConnector = !isLastRound && hasTwoPredecessors;

                  // Calculate marginTop based on previous match's position
                  let topMargin;
                  if (idx === 0) {
                    // First match: offset from top = targetCenter - (matchHeight / 2)
                    topMargin = targetCenterPosition - (matchHeight / 2);
                  } else {
                    // Subsequent matches: calculate relative to previous match in THIS round
                    // Use the actual calculated center position from the previous match
                    const prevMatchCenter = currentRoundCenterPositions[idx - 1];
                    const prevMatchTop = prevMatchCenter - (matchHeight / 2);
                    const thisMatchTop = targetCenterPosition - (matchHeight / 2);
                    topMargin = thisMatchTop - prevMatchTop - matchHeight;
                  }

                  return (
                    <div
                      key={match.id}
                      className="relative text-sm flex items-center w-full"
                      style={{ marginTop: `${topMargin}px`, overflow: 'visible' }}
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

                      {/* Bye-Style Connector Logic */}
                      {(() => {
                        // No connectors for pure bye matches (no feeding matches)
                        if (feedingMatches.length === 0) {
                          return null;
                        }

                        // TWO predecessors: Fork connector
                        if (feedingMatches.length === 2) {
                          const feeder1 = feedingMatches[0];
                          const feeder2 = feedingMatches[1];

                          const feeder1Idx = prevRoundMatches.findIndex(m => m.id === feeder1.id);
                          const feeder2Idx = prevRoundMatches.findIndex(m => m.id === feeder2.id);

                          if (feeder1Idx < 0 || feeder2Idx < 0) return null;

                          const feeder1CenterY = prevRoundPositions[feeder1Idx];
                          const feeder2CenterY = prevRoundPositions[feeder2Idx];
                          const thisCenterY = targetCenterPosition;

                          const topFeederY = Math.min(feeder1CenterY, feeder2CenterY);
                          const bottomFeederY = Math.max(feeder1CenterY, feeder2CenterY);
                          const bracketHeight = bottomFeederY - topFeederY;

                          // Offset from this match's center to the top of the vertical line
                          const offsetToTop = topFeederY - thisCenterY;

                          return (
                            <div
                              key={`bracket-connector`}
                              className="absolute"
                              style={{
                                top: '50%',
                                right: '100%',
                                width: '20px',
                                height: `${bracketHeight}px`,
                                marginTop: `${offsetToTop}px`,
                                marginRight: '30px',
                                borderRadius: '0 4px 4px 0',
                                borderTop: '2px solid #d1d5db',
                                borderRight: '2px solid #d1d5db',
                                borderBottom: '2px solid #d1d5db',
                                borderLeft: '0',
                                zIndex: 1
                              }}
                            >
                              {/* Horizontal line from vertical bracket to this match */}
                              <span
                                className="absolute bg-gray-300"
                                style={{
                                  left: '100%',
                                  top: `${-offsetToTop}px`,
                                  width: '10px',
                                  height: '2px'
                                }}
                              />
                            </div>
                          );
                        }

                        // ONE predecessor: Single line connector (bye scenario)
                        if (feedingMatches.length === 1) {
                          const feeder = feedingMatches[0];
                          const feederMatchIdx = prevRoundMatches.findIndex(m => m.id === feeder.id);
                          if (feederMatchIdx < 0) return null;

                          const feederCenterY = prevRoundPositions[feederMatchIdx];

                          // Calculate vertical offset from feeder center to THIS MATCH'S CENTER
                          const verticalOffset = feederCenterY - targetCenterPosition;

                          return (
                            <div
                              key={`line-${feeder.id}`}
                              className="absolute bg-gray-300"
                              style={{
                                top: '50%',
                                right: '100%',
                                width: '20px',
                                height: '2px',
                                marginTop: `${verticalOffset}px`,
                                marginRight: '25px',
                                transform: 'translateY(-50%)',
                                zIndex: 1
                              }}
                            />
                          );
                        }

                        return null;
                      })()}
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

import { useMatches } from '../../hooks/useMatches';
import { getMatchesByRound, getRoundName } from '../../utils/bracketGenerator';
import MatchCard from './MatchCard';

export default function BracketView({ tournamentId }) {
  const { matches, loading } = useMatches(tournamentId);

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

  // Get all rounds
  const rounds = [...new Set(playoffMatches.map((m) => m.round))].sort((a, b) => a - b);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold mb-6">Tournament Bracket</h2>

      {/* Mobile: Stack rounds vertically */}
      <div className="lg:hidden space-y-8">
        {rounds.map((round) => {
          const roundMatches = getMatchesByRound(playoffMatches, round);
          return (
            <div key={round}>
              <h3 className="text-lg font-bold mb-4 text-gray-700">
                {getRoundName(round)}
              </h3>
              <div className="space-y-4">
                {roundMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: Bracket tree layout */}
      <div className="hidden lg:block overflow-x-auto">
        <div className="flex gap-8 min-w-max">
          {rounds.map((round) => {
            const roundMatches = getMatchesByRound(playoffMatches, round);
            return (
              <div key={round} className="flex-shrink-0" style={{ width: '240px' }}>
                <h3 className="text-sm font-bold mb-4 text-gray-700 text-center">
                  {getRoundName(round)}
                </h3>
                <div className="space-y-8">
                  {roundMatches.map((match) => (
                    <MatchCard key={match.id} match={match} compact />
                  ))}
                </div>
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

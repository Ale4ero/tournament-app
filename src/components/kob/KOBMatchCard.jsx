import { Link } from 'react-router-dom';

/**
 * KOBMatchCard - Display a KOB match with rotating partners
 */
export default function KOBMatchCard({ match, players, tournamentId }) {
  if (!match) return null;

  const getPlayerName = (playerId) => {
    return players?.[playerId]?.name || playerId;
  };

  const isCompleted = match.status === 'completed';
  const isLive = match.status === 'live';

  return (
    <Link
      to={`/tournaments/${tournamentId}/matches/${match.id}`}
      className="block hover:shadow-md transition-shadow"
    >
      <div
        className={`border rounded-lg p-4 ${
          isCompleted
            ? 'bg-gray-50 border-gray-300'
            : isLive
            ? 'bg-blue-50 border-blue-300'
            : 'bg-white border-gray-200'
        }`}
      >
        <div className="flex items-center justify-between">
          {/* Match Number */}
          <div className="flex-shrink-0">
            <span className="text-sm font-medium text-gray-500">
              Match {match.matchNumber}
            </span>
          </div>

          {/* Status Badge */}
          <div>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                isCompleted
                  ? 'bg-green-100 text-green-800'
                  : isLive
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {isCompleted ? 'Completed' : isLive ? 'Live' : 'Upcoming'}
            </span>
          </div>
        </div>

        {/* Teams */}
        <div className="mt-3 space-y-2">
          {/* Team 1 */}
          <div
            className={`flex items-center justify-between p-2 rounded ${
              isCompleted && match.winner === 'team1'
                ? 'bg-green-100 border border-green-300'
                : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {match.winner === 'team1' && (
                <span className="text-green-600 font-bold">✓</span>
              )}
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {getPlayerName(match.team1.players[0])} +{' '}
                  {getPlayerName(match.team1.players[1])}
                </div>
              </div>
            </div>
            <div>
              {match.team1.score !== null && (
                <span
                  className={`text-lg font-bold ${
                    match.winner === 'team1' ? 'text-green-700' : 'text-gray-700'
                  }`}
                >
                  {match.team1.score}
                </span>
              )}
            </div>
          </div>

          {/* Team 2 */}
          <div
            className={`flex items-center justify-between p-2 rounded ${
              isCompleted && match.winner === 'team2'
                ? 'bg-green-100 border border-green-300'
                : 'bg-white border border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {match.winner === 'team2' && (
                <span className="text-green-600 font-bold">✓</span>
              )}
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {getPlayerName(match.team2.players[0])} +{' '}
                  {getPlayerName(match.team2.players[1])}
                </div>
              </div>
            </div>
            <div>
              {match.team2.score !== null && (
                <span
                  className={`text-lg font-bold ${
                    match.winner === 'team2' ? 'text-green-700' : 'text-gray-700'
                  }`}
                >
                  {match.team2.score}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Match Rules (shown for upcoming matches) */}
        {!isCompleted && match.rules && (
          <div className="mt-2 text-xs text-gray-500">
            Game to {match.rules.firstTo}, win by {match.rules.winBy}, cap at{' '}
            {match.rules.cap}
          </div>
        )}
      </div>
    </Link>
  );
}

import { Link } from 'react-router-dom';
import usePoolMatches from './usePoolMatches';
import { MATCH_STATUS } from '../../utils/constants';

/**
 * PoolMatchList - Displays list of matches for a pool
 * @param {string} tournamentId - Tournament ID
 * @param {string} poolId - Pool ID
 */
export default function PoolMatchList({ tournamentId, poolId }) {
  const { matches, loading } = usePoolMatches(tournamentId, poolId);

  if (loading) {
    return <div className="text-gray-600 text-sm">Loading matches...</div>;
  }

  if (matches.length === 0) {
    return <div className="text-gray-600 text-sm">No matches available</div>;
  }

  const getStatusBadge = (status) => {
    const badges = {
      [MATCH_STATUS.UPCOMING]: 'bg-blue-100 text-blue-800',
      [MATCH_STATUS.LIVE]: 'bg-green-100 text-green-800',
      [MATCH_STATUS.COMPLETED]: 'bg-gray-100 text-gray-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    const text = {
      [MATCH_STATUS.UPCOMING]: 'Upcoming',
      [MATCH_STATUS.LIVE]: 'Live',
      [MATCH_STATUS.COMPLETED]: 'Completed',
    };
    return text[status] || status;
  };

  return (
    <div className="space-y-2">
      {matches.map((match) => (
        <Link
          key={match.id}
          to={`/match/${match.id}`}
          className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600">
              Match #{match.matchNumber}
            </span>
            <span
              className={`text-xs font-medium px-2 py-1 rounded ${getStatusBadge(
                match.status
              )}`}
            >
              {getStatusText(match.status)}
            </span>
          </div>

          <div className="space-y-1">
            <div
              className={`flex items-center justify-between ${
                match.winner === match.team1 ? 'font-bold text-green-700' : 'text-gray-700'
              }`}
            >
              <span className="truncate">{match.team1 || 'TBD'}</span>
              {match.score1 !== null && (
                <span className="ml-2 font-semibold">{match.score1}</span>
              )}
            </div>

            <div className="border-t border-gray-200"></div>

            <div
              className={`flex items-center justify-between ${
                match.winner === match.team2 ? 'font-bold text-green-700' : 'text-gray-700'
              }`}
            >
              <span className="truncate">{match.team2 || 'TBD'}</span>
              {match.score2 !== null && (
                <span className="ml-2 font-semibold">{match.score2}</span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

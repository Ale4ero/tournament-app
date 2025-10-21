import { Link } from 'react-router-dom';
import { MATCH_STATUS } from '../../utils/constants';

export default function MatchCard({ match, compact = false }) {
  const getStatusColor = (status) => {
    const colors = {
      [MATCH_STATUS.UPCOMING]: 'border-blue-300 bg-blue-50',
      [MATCH_STATUS.LIVE]: 'border-green-400 bg-green-50',
      [MATCH_STATUS.COMPLETED]: 'border-gray-300 bg-gray-50',
    };
    return colors[status] || 'border-gray-300 bg-white';
  };

  const isWinner = (team) => {
    return match.winner === team;
  };

  return (
    <Link to={`/match/${match.id}`}>
      <div
        className={`border-2 rounded-lg p-3 ${getStatusColor(
          match.status
        )} hover:shadow-md transition-shadow cursor-pointer ${compact ? 'text-sm' : ''}`}
      >
        {!compact && (
          <div className="text-xs text-gray-600 mb-2">
            Match #{match.matchNumber}
          </div>
        )}

        <div className="space-y-2">
          <div
            className={`flex justify-between items-center ${
              isWinner(match.team1) ? 'font-bold text-green-700' : ''
            }`}
          >
            <span className="truncate">{match.team1 || 'TBD'}</span>
            {match.score1 !== null && (
              <span className="ml-2 font-semibold">{match.score1}</span>
            )}
          </div>

          <div className="border-t border-gray-300"></div>

          <div
            className={`flex justify-between items-center ${
              isWinner(match.team2) ? 'font-bold text-green-700' : ''
            }`}
          >
            <span className="truncate">{match.team2 || 'TBD'}</span>
            {match.score2 !== null && (
              <span className="ml-2 font-semibold">{match.score2}</span>
            )}
          </div>
        </div>

        {match.status === MATCH_STATUS.LIVE && !compact && (
          <div className="mt-2 text-xs text-green-600 font-medium">● LIVE</div>
        )}
      </div>
    </Link>
  );
}

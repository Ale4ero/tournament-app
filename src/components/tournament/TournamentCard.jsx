import { Link } from 'react-router-dom';
import { formatDate } from '../../utils/tournamentStatus';
import { TOURNAMENT_STATUS } from '../../utils/constants';

export default function TournamentCard({ tournament }) {
  const getStatusBadge = (status) => {
    const badges = {
      [TOURNAMENT_STATUS.UPCOMING]: 'badge-upcoming',
      [TOURNAMENT_STATUS.LIVE]: 'badge-live',
      [TOURNAMENT_STATUS.COMPLETED]: 'badge-completed',
    };
    return badges[status] || 'badge-upcoming';
  };

  const getStatusText = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Link to={`/tournament/${tournament.id}`}>
      <div className="card hover:shadow-lg transition-shadow cursor-pointer h-full">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-bold text-gray-900">{tournament.name}</h3>
          <span className={getStatusBadge(tournament.status)}>
            {getStatusText(tournament.status)}
          </span>
        </div>

        {tournament.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{tournament.description}</p>
        )}

        <div className="space-y-2 text-sm text-gray-700">
          <div className="flex items-center">
            <span className="font-medium w-24">Start Date:</span>
            <span>{formatDate(tournament.startDate)}</span>
          </div>

          {tournament.teams && (
            <div className="flex items-center">
              <span className="font-medium w-24">Teams:</span>
              <span>{tournament.teams.length}</span>
            </div>
          )}

          <div className="flex items-center">
            <span className="font-medium w-24">Type:</span>
            <span className="capitalize">{tournament.type.replace('-', ' ')}</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-primary-600 font-medium text-sm">
            View Details →
          </div>
        </div>
      </div>
    </Link>
  );
}

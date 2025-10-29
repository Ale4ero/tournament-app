import { Link } from 'react-router-dom';
import { formatDate } from '../../utils/tournamentStatus';
import { TOURNAMENT_STATUS, TOURNAMENT_TYPE } from '../../utils/constants';
import { useOrganization } from '../../hooks/useOrganization';

export default function TournamentCard({ tournament }) {
  const { organization } = useOrganization(tournament.organizationId);

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

  const formatTournamentType = (type) => {
    const typeMap = {
      [TOURNAMENT_TYPE.SINGLE_ELIMINATION]: 'Single Elimination',
      [TOURNAMENT_TYPE.POOL_PLAY_BRACKET]: 'Pool Play + Single Elimination',
    };
    return typeMap[type] || type.replace('-', ' ');
  };

  return (
    <Link to={`/tournament/${tournament.id}`}>
      <div className="card hover:shadow-lg transition-shadow cursor-pointer h-full">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">{tournament.name}</h3>
            {organization && (
              <p className="text-sm text-gray-500 mt-1">
                {organization.name}
              </p>
            )}
          </div>
          <span className={getStatusBadge(tournament.status)}>
            {getStatusText(tournament.status)}
          </span>
        </div>

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
            <span>{formatTournamentType(tournament.type)}</span>
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

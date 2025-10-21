import { useParams, Link } from 'react-router-dom';
import { useTournament } from '../hooks/useTournament';
import Layout from '../components/layout/Layout';
import BracketView from '../components/bracket/BracketView';
import { formatDate } from '../utils/tournamentStatus';
import { TOURNAMENT_STATUS } from '../utils/constants';

export default function TournamentView() {
  const { id } = useParams();
  const { tournament, loading } = useTournament(id);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">Loading tournament...</div>
        </div>
      </Layout>
    );
  }

  if (!tournament) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">Tournament not found</p>
            <Link to="/" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
              ← Back to Tournaments
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

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
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tournament Header */}
        <div className="mb-8">
          <Link to="/" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
            ← Back to Tournaments
          </Link>

          <div className="flex flex-wrap justify-between items-start gap-4 mt-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{tournament.name}</h1>
              {tournament.description && (
                <p className="text-gray-600 mb-4">{tournament.description}</p>
              )}
            </div>
            <span className={getStatusBadge(tournament.status)}>
              {getStatusText(tournament.status)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600 mb-1">Start Date</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatDate(tournament.startDate)}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600 mb-1">Teams</p>
              <p className="text-lg font-semibold text-gray-900">
                {tournament.teams?.length || 0}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600 mb-1">Format</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {tournament.type.replace('-', ' ')}
              </p>
            </div>
          </div>
        </div>

        {/* Bracket */}
        <BracketView tournamentId={tournament.id} />

        {/* Teams List */}
        {tournament.teams && tournament.teams.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold mb-4">Participating Teams</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tournament.teams.map((team, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200"
                >
                  <span className="text-gray-700 font-medium">{team}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

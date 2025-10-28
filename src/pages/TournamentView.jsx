import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTournament } from '../hooks/useTournament';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import BracketView from '../components/bracket/BracketView';
import PoolList from '../components/pools/PoolList';
import AdvanceToPlayoffsButton from '../components/pools/AdvanceToPlayoffsButton';
import { formatDate } from '../utils/tournamentStatus';
import { TOURNAMENT_STATUS, TOURNAMENT_TYPE } from '../utils/constants';

export default function TournamentView() {
  const { id } = useParams();
  const { tournament, loading } = useTournament(id);
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('pools'); // 'pools' | 'playoffs'

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
      [TOURNAMENT_STATUS.POOL_PLAY]: 'badge-live',
      [TOURNAMENT_STATUS.PLAYOFFS]: 'badge-live',
      [TOURNAMENT_STATUS.COMPLETED]: 'badge-completed',
    };
    return badges[status] || 'badge-upcoming';
  };

  const getStatusText = (status) => {
    const statusTexts = {
      [TOURNAMENT_STATUS.POOL_PLAY]: 'Pool Play',
      [TOURNAMENT_STATUS.PLAYOFFS]: 'Playoffs',
    };
    return statusTexts[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Check if this is a pool play tournament
  const isPoolPlayTournament = tournament?.type === TOURNAMENT_TYPE.POOL_PLAY_BRACKET;

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

        {/* Content - Tabbed for Pool Play, Standard for Single Elimination */}
        {isPoolPlayTournament ? (
          <>
            {/* Tabs */}
            <div className="mb-6 border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('pools')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'pools'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Pool Play
                </button>
                <button
                  onClick={() => setActiveTab('playoffs')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'playoffs'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Playoffs
                  {tournament.status === TOURNAMENT_STATUS.POOL_PLAY && (
                    <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                      Locked
                    </span>
                  )}
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'pools' && (
              <div className="space-y-6">
                <PoolList tournamentId={tournament.id} />

                {/* Advance to Playoffs Button (Admin Only, Pool Play Phase) */}
                {isAdmin && tournament.status === TOURNAMENT_STATUS.POOL_PLAY && (
                  <div className="mt-8">
                    <AdvanceToPlayoffsButton
                      tournamentId={tournament.id}
                      poolConfig={tournament.poolConfig}
                      playoffConfig={tournament.playoffConfig}
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'playoffs' && (
              <div>
                {tournament.status === TOURNAMENT_STATUS.PLAYOFFS ||
                tournament.status === TOURNAMENT_STATUS.COMPLETED ? (
                  <BracketView tournamentId={tournament.id} />
                ) : (
                  <div className="bg-gray-50 rounded-lg p-12 text-center">
                    <div className="text-6xl mb-4">🔒</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Playoffs Not Started</h3>
                    <p className="text-gray-600">
                      The playoff bracket will be generated once all pool matches are complete
                      and an admin advances the tournament to playoffs.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* Standard Single Elimination View */
          <BracketView tournamentId={tournament.id} />
        )}

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

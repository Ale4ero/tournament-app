import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTournament } from '../hooks/useTournament';
import { useMatches } from '../hooks/useMatches';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import BracketView from '../components/bracket/BracketView';
import PoolList from '../components/pools/PoolList';
import AdvanceToPlayoffsButton from '../components/pools/AdvanceToPlayoffsButton';
import { formatDate } from '../utils/tournamentStatus';
import { TOURNAMENT_STATUS, TOURNAMENT_TYPE, MATCH_STATUS } from '../utils/constants';
import { deleteTournament } from '../services/tournament.service';
import { regeneratePlayoffBracket } from '../services/bracket.service';

// Helper function to format tournament type display names
const formatTournamentType = (type) => {
  const typeMap = {
    [TOURNAMENT_TYPE.SINGLE_ELIMINATION]: 'Single Elimination',
    [TOURNAMENT_TYPE.POOL_PLAY_BRACKET]: 'Pool Play + Single Elimination',
  };
  return typeMap[type] || type.replace('-', ' ');
};

export default function TournamentView() {
  const { id } = useParams();
  const { tournament, loading } = useTournament(id);
  const { matches, loading: matchesLoading } = useMatches(id);
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Redirect KOB tournaments to dedicated view
  useEffect(() => {
    if (tournament && tournament.type === 'kob') {
      navigate(`/tournaments/${id}`, { replace: true });
    }
  }, [tournament, id, navigate]);

  // Get tab from URL or default to 'pools'
  const tabFromUrl = searchParams.get('tab') || 'pools';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Update URL when tab changes
  useEffect(() => {
    if (activeTab !== tabFromUrl) {
      setSearchParams({ tab: activeTab });
    }
  }, [activeTab, tabFromUrl, setSearchParams]);

  const handleDeleteTournament = async () => {
    try {
      setDeleting(true);
      await deleteTournament(id);
      navigate('/admin', { state: { message: 'Tournament deleted successfully' } });
    } catch (error) {
      console.error('Error deleting tournament:', error);
      alert('Failed to delete tournament: ' + error.message);
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleRegeneratePlayoffs = async () => {
    if (!window.confirm(
      'Are you sure you want to regenerate the playoff bracket? This will delete all playoff matches and recreate them. Pool play matches will NOT be affected.'
    )) {
      return;
    }

    try {
      setRegenerating(true);
      await regeneratePlayoffBracket(id);
      window.location.reload();
    } catch (error) {
      console.error('Error regenerating playoffs:', error);
      alert('Failed to regenerate playoffs: ' + error.message);
    } finally {
      setRegenerating(false);
    }
  };

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

  // Check if tournament has started (any score has been approved)
  // Tournament is "in progress" if any match has LIVE or COMPLETED status, or has a winner
  const tournamentHasStarted = matches.some(match =>
    match.status === MATCH_STATUS.LIVE ||
    match.status === MATCH_STATUS.COMPLETED ||
    match.winner !== null
  );

  // Check if any playoff matches have been played (for regenerate button)
  const playoffMatchesStarted = matches.some(match =>
    match.matchType === 'playoff' &&
    (match.status === MATCH_STATUS.LIVE ||
     match.status === MATCH_STATUS.COMPLETED ||
     match.winner !== null)
  );

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
            <div className="flex items-center gap-3">
              <span className={getStatusBadge(tournament.status)}>
                {getStatusText(tournament.status)}
              </span>
              {isAdmin && (
                <>
                  <button
                    onClick={() => navigate(`/tournaments/setup/${id}?edit=true`)}
                    disabled={tournamentHasStarted}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
                    title={tournamentHasStarted ? 'Cannot edit tournament after it has started' : 'Edit tournament configuration'}
                  >
                    Edit Config
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium cursor-pointer"
                  >
                    Delete Tournament
                  </button>
                </>
              )}
            </div>
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
              <p className="text-lg font-semibold text-gray-900">
                {formatTournamentType(tournament.type)}
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
                  <>
                    {/* Regenerate Playoffs Button (Admin Only) */}
                    {isAdmin && tournament.playoffs && (
                      <div className="mb-6">
                        <button
                          onClick={handleRegeneratePlayoffs}
                          disabled={regenerating || playoffMatchesStarted}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
                          title={playoffMatchesStarted ? 'Cannot regenerate bracket after playoff matches have started' : 'Regenerate playoff bracket with updated logic'}
                        >
                          {regenerating ? 'Regenerating...' : 'Regenerate Playoff Bracket'}
                        </button>
                        <p className="text-xs text-gray-500 mt-1">
                          Regenerates the playoff bracket structure. Pool play matches are not affected.
                        </p>
                      </div>
                    )}
                    <BracketView tournamentId={tournament.id} />
                  </>
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

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Tournament?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <strong>{tournament.name}</strong>? This will permanently delete the tournament and all associated data including matches, pools, and submissions. This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTournament}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete Tournament'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

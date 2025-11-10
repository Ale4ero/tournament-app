import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { database } from '../services/firebase';
import Layout from '../components/layout/Layout';
import { subscribeTournament, deleteTournament } from '../services/tournament.service';
import { subscribePlayers, subscribeRounds } from '../services/kob.service';
import { useAuth } from '../contexts/AuthContext';
import { getMatchesByTournament } from '../services/match.service';
import { DB_PATHS } from '../utils/constants';
import Leaderboard from '../components/kob/Leaderboard';
import KOBPoolList from '../components/kob/KOBPoolList';
import RoundManagement from '../components/kob/RoundManagement';

/**
 * KOBTournamentView - Main view for King of the Beach tournaments
 */
export default function KOBTournamentView() {
  const { tournamentId} = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [players, setPlayers] = useState({});
  const [rounds, setRounds] = useState({});
  const [pools, setPools] = useState({}); // Separate state for pools
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoundId, setSelectedRoundId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // All useEffect calls at the top level
  useEffect(() => {
    const unsubscribeTournament = subscribeTournament(tournamentId, (data) => {
      setTournament(data);
      setLoading(false);
    });

    const unsubscribePlayers = subscribePlayers(tournamentId, setPlayers);
    const unsubscribeRounds = subscribeRounds(tournamentId, (roundsData) => {
      setRounds(roundsData);

      // Subscribe to pools for each round
      if (roundsData && Object.keys(roundsData).length > 0) {
        Object.values(roundsData).forEach(round => {
          if (round.poolIds && round.poolIds.length > 0) {
            console.log('Subscribing to pools for round:', round.id, 'poolIds:', round.poolIds);
            // Fetch pools for this round
            round.poolIds.forEach(poolId => {
              const poolPath = `${DB_PATHS.TOURNAMENTS}/${tournamentId}/rounds/${round.id}/pools/${poolId}`;
              console.log('Subscribing to pool at path:', poolPath);
              const poolRef = ref(database, poolPath);
              onValue(poolRef, (snapshot) => {
                console.log('Pool snapshot for', poolId, ':', snapshot.exists(), snapshot.val());
                if (snapshot.exists()) {
                  setPools(prev => ({
                    ...prev,
                    [poolId]: snapshot.val()
                  }));
                } else {
                  console.warn('Pool does not exist at path:', poolPath);
                }
              }, (error) => {
                console.error('Error subscribing to pool:', poolPath, error);
              });
            });
          }
        });
      }
    });

    // Load matches
    async function loadMatches() {
      const matchData = await getMatchesByTournament(tournamentId);
      setMatches(matchData);
    }
    loadMatches();

    // Reload matches periodically to catch updates
    const intervalId = setInterval(loadMatches, 5000);

    return () => {
      unsubscribeTournament();
      unsubscribePlayers();
      unsubscribeRounds();
      clearInterval(intervalId);
    };
  }, [tournamentId]);


  const handleRoundAdvanced = () => {
    // Refresh matches after round advancement
    getMatchesByTournament(tournamentId).then(setMatches);
  };

  const handleDeleteTournament = async () => {
    if (!isAdmin) return;

    try {
      setIsDeleting(true);
      await deleteTournament(tournamentId);
      // Navigate back to home after successful deletion
      navigate('/');
    } catch (error) {
      console.error('Error deleting tournament:', error);
      alert('Failed to delete tournament. Please try again.');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading tournament...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!tournament) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            Tournament not found
          </div>
        </div>
      </Layout>
    );
  }

  // Get current round
  const roundsList = rounds ? Object.values(rounds).sort((a, b) => a.roundNumber - b.roundNumber) : [];
  const currentRound = roundsList.find(r => r.status !== 'completed') || roundsList[roundsList.length - 1];

  // Determine which round to display (selected or current)
  const displayRound = selectedRoundId && rounds[selectedRoundId]
    ? rounds[selectedRoundId]
    : currentRound;

  // Calculate overall standings
  const overallStandings = Object.fromEntries(
    Object.entries(players).map(([playerId, player]) => [
      playerId,
      {
        wins: player.totalWins || 0,
        pointsFor: player.totalPointsFor || 0,
        pointsAgainst: player.totalPointsAgainst || 0,
        diff: player.totalPointDiff || 0,
      },
    ])
  );

  // Get pools for display round using the pools state
  const displayPools = displayRound && displayRound.poolIds
    ? displayRound.poolIds
        .map(poolId => pools[poolId])
        .filter(Boolean)
    : [];

  const isCompleted = tournament.status === 'completed';
  const isFinal = currentRound && currentRound.roundNumber > 1 && Object.keys(players).filter(k => !players[k].eliminated).length <= 4;

  // Check if a round is a final round (4 or fewer players)
  const isRoundFinal = (round) => {
    if (!round || !round.poolIds) return false;

    let playerCount = 0;
    round.poolIds.forEach(poolId => {
      const pool = pools[poolId];
      if (pool && pool.playerIds) {
        playerCount += pool.playerIds.length;
      }
    });

    return playerCount <= 4;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="font-medium">Back to Tournaments</span>
          </button>
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{tournament.name}</h1>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isCompleted
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {isCompleted ? 'Completed' : 'In Progress'}
              </span>
              {isAdmin && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-1 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                  title="Delete Tournament"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
          {tournament.description && (
            <p className="text-gray-600">{tournament.description}</p>
          )}
          <div className="mt-2 text-sm text-gray-500">
            King of the Beach Tournament • {Object.keys(players).length} Players
            {currentRound && ` • Round ${currentRound.roundNumber}`}
          </div>
        </div>

        {/* Admin Round Management */}
        {isAdmin && currentRound && !isCompleted && (
          <div className="mb-6">
            <RoundManagement
              tournament={tournament}
              currentRound={currentRound}
              onRoundAdvanced={handleRoundAdvanced}
            />
          </div>
        )}

        {/* Tournament Completed Banner */}
        {isCompleted && (
          <div className="card bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300 mb-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                🏆 Tournament Complete! 🏆
              </h2>
              <p className="text-gray-700">
                Congratulations to all participants! Check the final standings below.
              </p>
            </div>
          </div>
        )}

        {/* Final Round Banner */}
        {isFinal && !isCompleted && (
          <div className="card bg-gradient-to-r from-purple-50 to-purple-100 border-purple-300 mb-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                🎯 Final Round! 🎯
              </h2>
              <p className="text-gray-700 text-sm">
                The top 4 players are competing for the championship!
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Rounds Section */}
            <div className="card">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Rounds</h2>

              {/* No Rounds Message */}
              {roundsList.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No rounds available yet
                </div>
              )}

              {/* Round Tabs */}
              {roundsList.length > 0 && (
                <div className="border-b border-gray-200 mb-6">
                  <div className="flex flex-wrap gap-2">
                    {roundsList.map((round) => {
                      const isSelected = displayRound?.id === round.id;
                      const isCurrent = currentRound?.id === round.id;
                      const playerCount = round.poolIds
                        ? round.poolIds.reduce((count, poolId) => {
                            const pool = pools[poolId];
                            return count + (pool?.playerIds?.length || 0);
                          }, 0)
                        : 0;

                      return (
                        <button
                          key={round.id}
                          onClick={() => setSelectedRoundId(round.id === selectedRoundId ? null : round.id)}
                          className={`px-4 py-2 rounded-t-lg font-medium transition-colors relative ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{isRoundFinal(round) ? 'Final Round' : `Round ${round.roundNumber}`}</span>
                            {isCurrent && !isCompleted && (
                              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                            )}
                          </div>
                          <div className="text-xs opacity-75 mt-1">
                            {playerCount} player{playerCount !== 1 ? 's' : ''}
                            {round.status === 'completed' && ' ✓'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pools Display for Selected Round */}
              {displayRound && (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {isRoundFinal(displayRound) ? 'Final Round' : `Round ${displayRound.roundNumber}`}
                      {displayRound.status === 'completed' && (
                        <span className="ml-2 text-sm text-green-600">(Completed)</span>
                      )}
                      {currentRound?.id === displayRound.id && !isCompleted && (
                        <span className="ml-2 text-sm text-blue-600">(Current)</span>
                      )}
                    </h3>
                  </div>

                  <KOBPoolList
                    pools={displayPools}
                    players={players}
                    matches={matches}
                    tournamentId={tournamentId}
                    roundId={displayRound.id}
                    isFinalRound={isRoundFinal(displayRound)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Overall Leaderboard */}
          <div className="lg:col-span-1">
            <Leaderboard
              players={players}
              standings={overallStandings}
              title={isCompleted ? "Final Standings" : "Overall Leaderboard"}
              showRank={true}
            />

            {/* Tournament Info */}
            <div className="card mt-6">
              <h3 className="text-lg font-semibold mb-3">Tournament Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Format:</span>
                  <span className="font-medium">King of the Beach</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Players:</span>
                  <span className="font-medium">{Object.keys(players).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pool Size:</span>
                  <span className="font-medium">{tournament.kobConfig?.poolSize || 4}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Advance/Pool:</span>
                  <span className="font-medium">{tournament.kobConfig?.advancePerPool || 2}</span>
                </div>
                {currentRound && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Round:</span>
                    <span className="font-medium">{currentRound.roundNumber}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Delete Tournament?
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete "{tournament.name}"? This action cannot be undone.
                All matches, rounds, players, and scores will be permanently deleted.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTournament}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete Tournament'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

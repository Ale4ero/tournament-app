import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { database } from '../services/firebase';
import Layout from '../components/layout/Layout';
import { subscribeTournament } from '../services/tournament.service';
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
  const { tournamentId } = useParams();
  const { isAdmin } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [players, setPlayers] = useState({});
  const [rounds, setRounds] = useState({});
  const [pools, setPools] = useState({}); // Separate state for pools
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

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
  const roundsList = Object.values(rounds).sort((a, b) => b.roundNumber - a.roundNumber);
  const currentRound = roundsList.find(r => r.status !== 'completed') || roundsList[0];

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

  // Get pools for current round using the pools state
  const currentPools = currentRound && currentRound.poolIds
    ? currentRound.poolIds
        .map(poolId => pools[poolId])
        .filter(Boolean)
    : [];

  const isCompleted = tournament.status === 'completed';
  const isFinal = currentRound && currentRound.roundNumber > 1 && Object.keys(players).filter(k => !players[k].eliminated).length <= 4;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{tournament.name}</h1>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                isCompleted
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {isCompleted ? 'Completed' : 'In Progress'}
            </span>
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
            {/* Pools Display */}
            {currentRound && (
              <KOBPoolList
                pools={currentPools}
                players={players}
                matches={matches}
                tournamentId={tournamentId}
                roundId={currentRound.id}
              />
            )}
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
      </div>
    </Layout>
  );
}

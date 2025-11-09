import { useState, useEffect } from 'react';
import { subscribePoolStandings } from '../../services/kob.service';
import Leaderboard from './Leaderboard';
import KOBMatchCard from './KOBMatchCard';

/**
 * KOBPoolCard - Individual pool display with tabbed standings and matches
 * @param {Object} pool - Pool data
 * @param {Object} players - Players data
 * @param {Array} matches - All matches
 * @param {string} tournamentId - Tournament ID
 * @param {string} roundId - Round ID
 */
export default function KOBPoolCard({ pool, players, matches, tournamentId, roundId }) {
  const [activeView, setActiveView] = useState('standings'); // 'standings' | 'matches'
  const [standings, setStandings] = useState(pool?.standings || {});

  useEffect(() => {
    if (!tournamentId || !roundId || !pool?.id) return;

    const unsubscribe = subscribePoolStandings(
      tournamentId,
      roundId,
      pool.id,
      (data) => setStandings(data)
    );

    return () => unsubscribe();
  }, [tournamentId, roundId, pool?.id]);

  if (!pool) {
    return null;
  }

  // Filter matches for this pool
  const poolMatches = matches.filter(m => m.poolId === pool.id);

  // Calculate completion
  const completedMatches = poolMatches.filter(m => m.status === 'completed').length;
  const totalMatches = poolMatches.length;
  const completionPercentage = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

  const getStatusBadge = (status) => {
    const badges = {
      upcoming: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    const text = {
      upcoming: 'Upcoming',
      in_progress: 'In Progress',
      completed: 'Completed',
    };
    return text[status] || status;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Pool Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-2xl font-bold">{pool.name}</h3>
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${getStatusBadge(pool.status)}`}>
            {getStatusText(pool.status)}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-primary-100">Match Progress</span>
            <span className="font-semibold">
              {completedMatches}/{totalMatches}
            </span>
          </div>
          <div className="w-full bg-primary-800 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex">
          <button
            onClick={() => setActiveView('standings')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeView === 'standings'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Standings
          </button>
          <button
            onClick={() => setActiveView('matches')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeView === 'matches'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Matches
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeView === 'standings' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Rank</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Player</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600 uppercase">W-L</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Points</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600 uppercase">Points +/-</th>
                </tr>
              </thead>
              <tbody>
                {pool.playerIds && pool.playerIds.length > 0 ? (
                  pool.playerIds
                    .map(playerId => ({
                      id: playerId,
                      name: players[playerId]?.name || 'Unknown',
                      ...standings[playerId]
                    }))
                    .sort((a, b) => {
                      // Sort by wins (descending), then by point differential (descending)
                      if ((b.wins || 0) !== (a.wins || 0)) {
                        return (b.wins || 0) - (a.wins || 0);
                      }
                      return (b.diff || 0) - (a.diff || 0);
                    })
                    .map((player, index) => {
                      const isAdvancing = index < 2; // Top 2 advance (or based on tournament config)
                      const wins = player.wins || 0;
                      const losses = player.losses || 0;
                      const pointsFor = player.pointsFor || 0;
                      const pointsAgainst = player.pointsAgainst || 0;
                      const diff = player.diff || 0;

                      return (
                        <tr key={player.id} className={`border-b border-gray-100 ${isAdvancing ? 'bg-green-50' : ''}`}>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{index + 1}</span>
                              {isAdvancing && <span className="text-green-600">✓</span>}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-medium text-gray-900">{player.name}</span>
                          </td>
                          <td className="py-3 px-3 text-center text-gray-700">
                            {wins}-{losses}
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-gray-900">
                            {wins * 3}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-600'}>
                              {diff > 0 ? '+' : ''}{diff}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500">
                      No players in this pool
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {pool.playerIds && pool.playerIds.length > 0 && (
              <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <span className="text-green-600">✓</span>
                  Advances to playoffs
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {poolMatches.length > 0 ? (
              poolMatches.map((match) => (
                <KOBMatchCard
                  key={match.id}
                  match={match}
                  players={players}
                  tournamentId={tournamentId}
                />
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No matches scheduled yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

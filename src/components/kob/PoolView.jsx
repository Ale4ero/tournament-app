import { useState, useEffect } from 'react';
import { subscribePoolStandings } from '../../services/kob.service';
import Leaderboard from './Leaderboard';
import KOBMatchCard from './KOBMatchCard';

/**
 * PoolView - Display a single pool with matches and standings
 */
export default function PoolView({ tournamentId, roundId, pool, players, matches }) {
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
    return (
      <div className="card">
        <p className="text-gray-500 text-center py-4">Pool not found</p>
      </div>
    );
  }

  // Filter matches for this pool
  const poolMatches = matches.filter(m => m.poolId === pool.id);

  // Calculate completion
  const completedMatches = poolMatches.filter(m => m.status === 'completed').length;
  const totalMatches = poolMatches.length;
  const progress = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Pool Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900">{pool.name}</h2>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              pool.status === 'completed'
                ? 'bg-green-100 text-green-800'
                : pool.status === 'in_progress'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {pool.status === 'completed'
              ? 'Completed'
              : pool.status === 'in_progress'
              ? 'In Progress'
              : 'Upcoming'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Match Progress</span>
            <span>
              {completedMatches} / {totalMatches} completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Standings */}
      <Leaderboard
        players={players}
        standings={standings}
        title={`${pool.name} Standings`}
      />

      {/* Matches */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Matches</h3>
        {poolMatches.length > 0 ? (
          <div className="space-y-3">
            {poolMatches.map((match) => (
              <KOBMatchCard
                key={match.id}
                match={match}
                players={players}
                tournamentId={tournamentId}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No matches scheduled yet</p>
        )}
      </div>
    </div>
  );
}

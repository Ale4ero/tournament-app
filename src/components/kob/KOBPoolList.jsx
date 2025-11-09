import KOBPoolCard from './KOBPoolCard';

/**
 * KOBPoolList - Displays all KOB pools in a grid layout
 * @param {Array} pools - Array of pool objects
 * @param {Object} players - Players data
 * @param {Array} matches - All matches
 * @param {string} tournamentId - Tournament ID
 * @param {string} roundId - Round ID
 */
export default function KOBPoolList({ pools, players, matches, tournamentId, roundId }) {
  if (!pools || pools.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-600">No pools available for this round</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Pools</h2>
        <div className="text-sm text-gray-600">
          {pools.length} Pool{pools.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pools.map((pool) => (
          <KOBPoolCard
            key={pool.id}
            pool={pool}
            players={players}
            matches={matches}
            tournamentId={tournamentId}
            roundId={roundId}
          />
        ))}
      </div>
    </div>
  );
}

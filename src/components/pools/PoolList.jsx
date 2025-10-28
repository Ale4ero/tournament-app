import usePools from './usePools';
import PoolCard from './PoolCard';

/**
 * PoolList - Displays all pools for a tournament
 * @param {string} tournamentId - Tournament ID
 */
export default function PoolList({ tournamentId }) {
  const { pools, loading } = usePools(tournamentId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pools...</p>
        </div>
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-600">No pools found for this tournament.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Pool Play</h2>
        <div className="text-sm text-gray-600">
          {pools.length} Pool{pools.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pools.map((pool) => (
          <PoolCard key={pool.id} pool={pool} tournamentId={tournamentId} />
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import PoolTable from './PoolTable';
import PoolMatchList from './PoolMatchList';
import { POOL_STATUS } from '../../utils/constants';

/**
 * PoolCard - Individual pool display with standings and matches
 * @param {Object} pool - Pool data
 * @param {string} tournamentId - Tournament ID
 */
export default function PoolCard({ pool, tournamentId }) {
  const [searchParams] = useSearchParams();
  const poolViewParam = searchParams.get('poolView');
  const [activeView, setActiveView] = useState(poolViewParam || 'standings'); // 'standings' | 'matches'

  // Update active view when URL parameter changes
  useEffect(() => {
    if (poolViewParam) {
      setActiveView(poolViewParam);
    }
  }, [poolViewParam]);

  const getStatusBadge = (status) => {
    const badges = {
      [POOL_STATUS.UPCOMING]: 'bg-blue-100 text-blue-800',
      [POOL_STATUS.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800',
      [POOL_STATUS.COMPLETED]: 'bg-green-100 text-green-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    const text = {
      [POOL_STATUS.UPCOMING]: 'Upcoming',
      [POOL_STATUS.IN_PROGRESS]: 'In Progress',
      [POOL_STATUS.COMPLETED]: 'Completed',
    };
    return text[status] || status;
  };

  const completionPercentage = pool.totalMatches > 0
    ? Math.round((pool.matchesCompleted / pool.totalMatches) * 100)
    : 0;

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
              {pool.matchesCompleted}/{pool.totalMatches}
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
          <PoolTable tournamentId={tournamentId} poolId={pool.id} />
        ) : (
          <PoolMatchList tournamentId={tournamentId} poolId={pool.id} />
        )}
      </div>
    </div>
  );
}

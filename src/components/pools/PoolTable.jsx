import usePoolStandings from './usePoolStandings';
import { useTournament } from '../../hooks/useTournament';

/**
 * PoolTable - Displays standings table for a pool
 * @param {string} tournamentId - Tournament ID
 * @param {string} poolId - Pool ID
 */
export default function PoolTable({ tournamentId, poolId }) {
  const { standings, loading } = usePoolStandings(tournamentId, poolId);
  const { tournament } = useTournament(tournamentId);

  if (loading) {
    return <div className="text-gray-600 text-sm">Loading standings...</div>;
  }

  if (standings.length === 0) {
    return <div className="text-gray-600 text-sm">No standings available</div>;
  }

  // Get number of teams that advance from pool config
  const advancePerPool = tournament?.poolConfig?.advancePerPool || 2;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
              Rank
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
              Team
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
              W-L
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
              Points
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
              Sets +/-
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
              Points +/-
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {standings.map((standing) => {
            // Check if this rank position advances to playoffs
            const willAdvance = standing.rank > 0 && standing.rank <= advancePerPool;

            return (
              <tr
                key={standing.team}
                className={`hover:bg-gray-50 transition-colors ${
                  willAdvance ? 'bg-green-50' : ''
                }`}
              >
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {standing.rank}
                  {willAdvance && (
                    <span className="ml-2 text-green-600" title="Advances to playoffs">
                      ✓
                    </span>
                  )}
                </td>
              <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                {standing.team}
                {standing.tournamentSeed && (
                  <span className="ml-2 text-xs text-blue-500 font-medium">(#{standing.tournamentSeed})</span>
                )}
                {standing.playoffSeed && (
                  <span className="ml-2 text-xs text-gray-500">(Playoff Seed #{standing.playoffSeed})</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-center text-gray-900">
                {standing.wins}-{standing.losses}
                {standing.ties > 0 && `-${standing.ties}`}
              </td>
              <td className="px-4 py-3 text-sm text-center font-semibold text-primary-600">
                {standing.points}
              </td>
              <td className="px-4 py-3 text-sm text-center">
                <span
                  className={
                    standing.setDifferential > 0
                      ? 'text-green-600'
                      : standing.setDifferential < 0
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }
                >
                  {standing.setDifferential > 0 ? '+' : ''}
                  {standing.setDifferential}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-center">
                <span
                  className={
                    standing.pointDifferential > 0
                      ? 'text-green-600'
                      : standing.pointDifferential < 0
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }
                >
                  {standing.pointDifferential > 0 ? '+' : ''}
                  {standing.pointDifferential}
                </span>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
          <span>Advances to playoffs</span>
          <span className="ml-2 text-xs text-blue-500 font-medium">(Seed #)</span>
        </div>
      </div>
    </div>
  );
}

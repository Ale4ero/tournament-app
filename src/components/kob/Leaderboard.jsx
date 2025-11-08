import { useMemo } from 'react';

/**
 * Leaderboard - Display player standings with wins, points, and differential
 */
export default function Leaderboard({ players, standings, title = "Leaderboard", showRank = true }) {
  const sortedPlayers = useMemo(() => {
    if (!players || !standings) return [];

    return Object.entries(standings)
      .map(([playerId, stats]) => ({
        playerId,
        playerName: players[playerId]?.name || playerId,
        ...stats,
      }))
      .sort((a, b) => {
        // Sort by wins first
        if (b.wins !== a.wins) return b.wins - a.wins;
        // Then by point differential
        if (b.diff !== a.diff) return b.diff - a.diff;
        // Then by total points scored
        return b.pointsFor - a.pointsFor;
      });
  }, [players, standings]);

  if (!sortedPlayers.length) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-3">{title}</h3>
        <p className="text-gray-500 text-center py-4">No standings available yet</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {showRank && (
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
              )}
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Player
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Wins
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                PF
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                PA
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Diff
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedPlayers.map((player, index) => (
              <tr
                key={player.playerId}
                className={index < 2 ? 'bg-green-50' : ''}
              >
                {showRank && (
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <span
                        className={`text-sm font-semibold ${
                          index === 0
                            ? 'text-yellow-600'
                            : index === 1
                            ? 'text-gray-500'
                            : index === 2
                            ? 'text-orange-600'
                            : 'text-gray-700'
                        }`}
                      >
                        {index + 1}
                        {index === 0 && ' 👑'}
                      </span>
                    </div>
                  </td>
                )}
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {player.playerName}
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-center">
                  <span className="text-sm font-semibold text-gray-900">
                    {player.wins}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-center">
                  <span className="text-sm text-gray-700">{player.pointsFor}</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-center">
                  <span className="text-sm text-gray-700">{player.pointsAgainst}</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-center">
                  <span
                    className={`text-sm font-medium ${
                      player.diff > 0
                        ? 'text-green-600'
                        : player.diff < 0
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {player.diff > 0 ? '+' : ''}
                    {player.diff}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-xs text-gray-500 border-t pt-3">
        <strong>Legend:</strong> PF = Points For, PA = Points Against, Diff = Point Differential
        {showRank && (
          <span className="ml-2">
            | <span className="text-green-600">Green highlight</span> = Advancing players
          </span>
        )}
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useTournaments } from '../../hooks/useTournament';
import { TOURNAMENT_STATUS } from '../../utils/constants';
import TournamentCard from './TournamentCard';

export default function TournamentList() {
  const { tournaments, loading } = useTournaments();
  const [filter, setFilter] = useState('all');

  const filteredTournaments = useMemo(() => {
    if (filter === 'all') return tournaments;
    return tournaments.filter((t) => t.status === filter);
  }, [tournaments, filter]);

  const counts = useMemo(() => {
    return {
      all: tournaments.length,
      upcoming: tournaments.filter((t) => t.status === TOURNAMENT_STATUS.UPCOMING).length,
      live: tournaments.filter((t) => t.status === TOURNAMENT_STATUS.LIVE).length,
      completed: tournaments.filter((t) => t.status === TOURNAMENT_STATUS.COMPLETED).length,
    };
  }, [tournaments]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading tournaments...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All ({counts.all})
        </button>
        <button
          onClick={() => setFilter(TOURNAMENT_STATUS.UPCOMING)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === TOURNAMENT_STATUS.UPCOMING
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Upcoming ({counts.upcoming})
        </button>
        <button
          onClick={() => setFilter(TOURNAMENT_STATUS.LIVE)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === TOURNAMENT_STATUS.LIVE
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Live ({counts.live})
        </button>
        <button
          onClick={() => setFilter(TOURNAMENT_STATUS.COMPLETED)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === TOURNAMENT_STATUS.COMPLETED
              ? 'bg-gray-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Completed ({counts.completed})
        </button>
      </div>

      {filteredTournaments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <p className="text-gray-600 text-lg">No tournaments found</p>
          <p className="text-gray-500 text-sm mt-2">
            {filter === 'all'
              ? 'Create your first tournament to get started!'
              : `No ${filter} tournaments at the moment.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </div>
      )}
    </div>
  );
}

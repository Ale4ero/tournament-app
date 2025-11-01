import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import usePoolMatches from './usePoolMatches';
import usePoolStandings from './usePoolStandings';
import { useAuth } from '../../contexts/AuthContext';
import { updateMatchOrder } from '../../services/match.service';
import { MATCH_STATUS } from '../../utils/constants';

/**
 * Sortable Match Item Component
 */
function SortableMatchItem({ match, teamSeedMap, isAdmin, displayMatchNumber }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: match.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    pointerEvents: isDragging ? 'none' : 'auto',
  };

  // Helper function to display team name with seed
  const displayTeamName = (teamName) => {
    if (!teamName || teamName === 'TBD') return 'TBD';
    const seed = teamSeedMap[teamName];
    return (
      <>
        {teamName}
        {seed && (
          <span className="ml-1 text-xs text-blue-500 font-medium">(#{seed})</span>
        )}
      </>
    );
  };

  const getStatusBadge = (status) => {
    const badges = {
      [MATCH_STATUS.UPCOMING]: 'bg-blue-100 text-blue-800',
      [MATCH_STATUS.LIVE]: 'bg-green-100 text-green-800',
      [MATCH_STATUS.COMPLETED]: 'bg-gray-100 text-gray-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    const text = {
      [MATCH_STATUS.UPCOMING]: 'Upcoming',
      [MATCH_STATUS.LIVE]: 'Live',
      [MATCH_STATUS.COMPLETED]: 'Completed',
    };
    return text[status] || status;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-gray-200 rounded-lg ${
        isDragging ? 'shadow-lg z-10' : ''
      }`}
    >
      <Link
        to={`/match/${match.id}?poolView=matches`}
        className="block p-4 hover:shadow-md transition-shadow"
        onClick={(e) => {
          // Prevent navigation if currently dragging
          if (isDragging) {
            e.preventDefault();
          }
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Drag Handle - Only for admins */}
            {isAdmin && (
              <button
                type="button"
                onClick={(e) => e.preventDefault()}
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 touch-none"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              </button>
            )}
            <span className="text-xs font-semibold text-gray-600">
              Match #{displayMatchNumber}
            </span>
          </div>
          <span
            className={`text-xs font-medium px-2 py-1 rounded ${getStatusBadge(
              match.status
            )}`}
          >
            {getStatusText(match.status)}
          </span>
        </div>

        <div className="space-y-1">
          <div
            className={`flex items-center justify-between ${
              match.winner === match.team1 ? 'font-bold text-green-700' : 'text-gray-700'
            }`}
          >
            <span className="truncate">{displayTeamName(match.team1)}</span>
            {match.score1 !== null && (
              <span className="ml-2 font-semibold">{match.score1}</span>
            )}
          </div>

          <div className="border-t border-gray-200"></div>

          <div
            className={`flex items-center justify-between ${
              match.winner === match.team2 ? 'font-bold text-green-700' : 'text-gray-700'
            }`}
          >
            <span className="truncate">{displayTeamName(match.team2)}</span>
            {match.score2 !== null && (
              <span className="ml-2 font-semibold">{match.score2}</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

/**
 * PoolMatchList - Displays list of matches for a pool
 * @param {string} tournamentId - Tournament ID
 * @param {string} poolId - Pool ID
 */
export default function PoolMatchList({ tournamentId, poolId }) {
  const { isAdmin } = useAuth();
  const { matches, loading: matchesLoading } = usePoolMatches(tournamentId, poolId);
  const { standings, loading: standingsLoading } = usePoolStandings(tournamentId, poolId);
  const [localMatches, setLocalMatches] = useState([]);

  // Initialize local matches state when matches load
  useEffect(() => {
    if (matches.length > 0) {
      setLocalMatches(matches);
    }
  }, [matches]);

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = localMatches.findIndex(m => m.id === active.id);
      const newIndex = localMatches.findIndex(m => m.id === over.id);
      const reordered = arrayMove(localMatches, oldIndex, newIndex);

      // Update local state immediately for responsive UI
      setLocalMatches(reordered);

      // Update match orders in Firebase
      try {
        const updates = reordered.map((match, index) => ({
          matchId: match.id,
          matchOrder: index,
        }));

        await Promise.all(
          updates.map(({ matchId, matchOrder }) =>
            updateMatchOrder(tournamentId, matchId, matchOrder)
          )
        );
      } catch (error) {
        console.error('Error updating match order:', error);
        // Revert to original order on error
        setLocalMatches(matches);
      }
    }
  };

  if (matchesLoading || standingsLoading) {
    return <div className="text-gray-600 text-sm">Loading matches...</div>;
  }

  if (matches.length === 0) {
    return <div className="text-gray-600 text-sm">No matches available</div>;
  }

  // Create a map of team names to their tournament seeds
  const teamSeedMap = {};
  standings.forEach((standing) => {
    if (standing.tournamentSeed) {
      teamSeedMap[standing.team] = standing.tournamentSeed;
    }
  });

  // Use localMatches for rendering to show immediate drag updates
  const displayMatches = localMatches.length > 0 ? localMatches : matches;

  // Non-admin view: Simple list without drag-and-drop
  if (!isAdmin) {
    return (
      <div className="space-y-2">
        {displayMatches.map((match) => {
          const getStatusBadge = (status) => {
            const badges = {
              [MATCH_STATUS.UPCOMING]: 'bg-blue-100 text-blue-800',
              [MATCH_STATUS.LIVE]: 'bg-green-100 text-green-800',
              [MATCH_STATUS.COMPLETED]: 'bg-gray-100 text-gray-800',
            };
            return badges[status] || 'bg-gray-100 text-gray-800';
          };

          const getStatusText = (status) => {
            const text = {
              [MATCH_STATUS.UPCOMING]: 'Upcoming',
              [MATCH_STATUS.LIVE]: 'Live',
              [MATCH_STATUS.COMPLETED]: 'Completed',
            };
            return text[status] || status;
          };

          const displayTeamName = (teamName) => {
            if (!teamName || teamName === 'TBD') return 'TBD';
            const seed = teamSeedMap[teamName];
            return (
              <>
                {teamName}
                {seed && (
                  <span className="ml-1 text-xs text-blue-500 font-medium">(#{seed})</span>
                )}
              </>
            );
          };

          return (
            <Link
              key={match.id}
              to={`/match/${match.id}?poolView=matches`}
              className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600">
                  Match #{displayMatches.findIndex(m => m.id === match.id) + 1}
                </span>
                <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusBadge(match.status)}`}>
                  {getStatusText(match.status)}
                </span>
              </div>

              <div className="space-y-1">
                <div className={`flex items-center justify-between ${
                  match.winner === match.team1 ? 'font-bold text-green-700' : 'text-gray-700'
                }`}>
                  <span className="truncate">{displayTeamName(match.team1)}</span>
                  {match.score1 !== null && (
                    <span className="ml-2 font-semibold">{match.score1}</span>
                  )}
                </div>

                <div className="border-t border-gray-200"></div>

                <div className={`flex items-center justify-between ${
                  match.winner === match.team2 ? 'font-bold text-green-700' : 'text-gray-700'
                }`}>
                  <span className="truncate">{displayTeamName(match.team2)}</span>
                  {match.score2 !== null && (
                    <span className="ml-2 font-semibold">{match.score2}</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  // Admin view: Drag-and-drop enabled
  return (
    <div className="space-y-4">
      {/* Instructions for admins */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          <strong>Drag matches to reorder them.</strong> This changes the order in which matches are played.
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={displayMatches.map(m => m.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {displayMatches.map((match, index) => (
              <SortableMatchItem
                key={match.id}
                match={match}
                teamSeedMap={teamSeedMap}
                isAdmin={true}
                displayMatchNumber={index + 1}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

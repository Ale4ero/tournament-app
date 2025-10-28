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

/**
 * Sortable Team Item Component
 */
function SortableTeamItem({ id, index, teamName }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div className="flex items-center gap-3">
      {/* Seed Number Badge - Fixed position outside drag container */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base">
        {index + 1}
      </div>

      {/* Draggable Container */}
      <div
        ref={setNodeRef}
        style={style}
        className={`flex-1 flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg ${
          isDragging ? 'shadow-lg z-10' : 'hover:border-gray-300'
        }`}
      >
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 touch-none"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>

        {/* Team Name */}
        <div className="flex-1 font-medium text-gray-900">
          {teamName}
        </div>
      </div>
    </div>
  );
}

/**
 * TeamSeedingList Component
 * Displays a sortable list of teams with drag-and-drop functionality
 */
export default function TeamSeedingList({ teams, onReorder, onResetAlphabetically, onRandomize }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = teams.indexOf(active.id);
      const newIndex = teams.indexOf(over.id);
      const reordered = arrayMove(teams, oldIndex, newIndex);
      onReorder(reordered);
    }
  };

  return (
    <div className="space-y-4 pt-4">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          <strong>Drag teams to reorder them.</strong> Higher seeds (lower numbers) are stronger teams.
          Snake seeding will distribute teams across pools to balance competition.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onResetAlphabetically}
          className="btn-secondary text-sm"
        >
          Reset (A-Z)
        </button>
        <button
          onClick={onRandomize}
          className="btn-secondary text-sm"
        >
          Randomize
        </button>
      </div>

      {/* Sortable List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={teams}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {teams.map((team, index) => (
              <SortableTeamItem
                key={team}
                id={team}
                index={index}
                teamName={team}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Pool Preview Hint */}
      <div className="mt-4 text-sm text-gray-500 text-center">
        {teams.length} teams ranked • Pools will be generated using snake seeding when you click "Create Tournament"
      </div>
    </div>
  );
}

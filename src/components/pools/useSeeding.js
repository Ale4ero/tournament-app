import { useState, useEffect, useCallback } from 'react';
import { updateTournamentDraft } from '../../services/tournament.service';

/**
 * Snake Seeding Algorithm
 * Distributes teams across pools in a snake pattern to balance strength
 *
 * Example for 2 pools and 8 teams:
 * Pool A: 1, 4, 5, 8
 * Pool B: 2, 3, 6, 7
 *
 * Example for 3 pools and 9 teams:
 * Pool A: 1, 6, 7
 * Pool B: 2, 5, 8
 * Pool C: 3, 4, 9
 */
export function applySnakeSeeding(teams, numPools) {
  if (!teams || teams.length === 0 || numPools < 1) {
    return [];
  }

  // Initialize pools
  const pools = Array.from({ length: numPools }, () => []);

  // Snake pattern: forward, then backward, then forward, etc.
  let currentPool = 0;
  let direction = 1; // 1 for forward, -1 for backward

  for (let i = 0; i < teams.length; i++) {
    pools[currentPool].push(teams[i]);

    // Move to next pool
    if (direction === 1) {
      // Moving forward
      if (currentPool === numPools - 1) {
        // Reached the end, reverse direction
        direction = -1;
      } else {
        currentPool++;
      }
    } else {
      // Moving backward
      if (currentPool === 0) {
        // Reached the start, reverse direction
        direction = 1;
      } else {
        currentPool--;
      }
    }
  }

  return pools;
}

/**
 * Custom hook for managing team seeding
 */
export default function useSeeding(draftId, initialTeams = []) {
  const [seededTeams, setSeededTeams] = useState(initialTeams);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Initialize seeded teams when initialTeams changes
  useEffect(() => {
    if (initialTeams && initialTeams.length > 0) {
      setSeededTeams(initialTeams);
    }
  }, [initialTeams]);

  /**
   * Update teams directly (used by drag-and-drop from parent)
   */
  const updateTeams = useCallback((newTeams) => {
    setSeededTeams(newTeams);
    return newTeams;
  }, []);

  /**
   * Reorder teams (used by drag-and-drop)
   */
  const reorderTeams = useCallback((startIndex, endIndex) => {
    const result = Array.from(seededTeams);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    setSeededTeams(result);
    return result;
  }, [seededTeams]);

  /**
   * Reset to alphabetical order
   */
  const resetAlphabetically = useCallback(() => {
    const sorted = [...seededTeams].sort((a, b) => a.localeCompare(b));
    setSeededTeams(sorted);
    return sorted;
  }, [seededTeams]);

  /**
   * Randomize team order
   */
  const randomize = useCallback(() => {
    const shuffled = [...seededTeams];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setSeededTeams(shuffled);
    return shuffled;
  }, [seededTeams]);

  /**
   * Save seed order to Firebase
   */
  const saveSeedOrder = useCallback(async (teams = seededTeams) => {
    if (!draftId) return;

    try {
      setIsSaving(true);
      setError(null);
      await updateTournamentDraft(draftId, { seedOrder: teams });
    } catch (err) {
      console.error('Error saving seed order:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [draftId, seededTeams]);

  /**
   * Generate pool assignments using snake seeding
   */
  const generatePoolAssignments = useCallback((numPools) => {
    return applySnakeSeeding(seededTeams, numPools);
  }, [seededTeams]);

  return {
    seededTeams,
    updateTeams,
    reorderTeams,
    resetAlphabetically,
    randomize,
    saveSeedOrder,
    generatePoolAssignments,
    isSaving,
    error,
  };
}

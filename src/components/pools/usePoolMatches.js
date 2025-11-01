import { useState, useEffect } from 'react';
import { subscribeMatches } from '../../services/match.service';

/**
 * Custom hook to get pool matches
 * @param {string} tournamentId - Tournament ID
 * @param {string} poolId - Pool ID
 * @returns {Object} { matches, loading }
 */
export default function usePoolMatches(tournamentId, poolId) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId || !poolId) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeMatches(tournamentId, (allMatches) => {
      // Filter for matches belonging to this pool
      const poolMatches = allMatches.filter((match) => match.poolId === poolId);

      // Sort by matchOrder if it exists, otherwise by matchNumber
      const sortedMatches = poolMatches.sort((a, b) => {
        // If both have matchOrder, sort by that
        if (a.matchOrder !== undefined && b.matchOrder !== undefined) {
          return a.matchOrder - b.matchOrder;
        }
        // Otherwise fallback to matchNumber
        return (a.matchNumber || 0) - (b.matchNumber || 0);
      });

      setMatches(sortedMatches);
      setLoading(false);
    });

    return unsubscribe;
  }, [tournamentId, poolId]);

  return { matches, loading };
}

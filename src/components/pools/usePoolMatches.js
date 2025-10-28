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
      setMatches(poolMatches);
      setLoading(false);
    });

    return unsubscribe;
  }, [tournamentId, poolId]);

  return { matches, loading };
}

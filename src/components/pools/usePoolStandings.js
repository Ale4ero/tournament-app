import { useState, useEffect } from 'react';
import { subscribePoolStandings } from '../../services/pool.service';

/**
 * Custom hook to subscribe to standings for a pool
 * @param {string} tournamentId - Tournament ID
 * @param {string} poolId - Pool ID
 * @returns {Object} { standings, loading }
 */
export default function usePoolStandings(tournamentId, poolId) {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId || !poolId) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribePoolStandings(tournamentId, poolId, (data) => {
      setStandings(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [tournamentId, poolId]);

  return { standings, loading };
}

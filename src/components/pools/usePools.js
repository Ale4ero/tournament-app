import { useState, useEffect } from 'react';
import { subscribePools } from '../../services/pool.service';

/**
 * Custom hook to subscribe to pools for a tournament
 * @param {string} tournamentId - Tournament ID
 * @returns {Object} { pools, loading }
 */
export default function usePools(tournamentId) {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribePools(tournamentId, (data) => {
      setPools(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [tournamentId]);

  return { pools, loading };
}

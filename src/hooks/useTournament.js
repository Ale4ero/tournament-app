import { useState, useEffect } from 'react';
import { subscribeTournament, subscribeTournaments } from '../services/tournament.service';

/**
 * Hook to subscribe to a single tournament
 * @param {string} tournamentId - Tournament ID
 * @returns {Object} { tournament, loading }
 */
export function useTournament(tournamentId) {
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }

    let isSubscribed = true;

    const unsubscribe = subscribeTournament(tournamentId, (data) => {
      if (isSubscribed) {
        setTournament(data);
        setLoading(false);
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [tournamentId]);

  return { tournament, loading };
}

/**
 * Hook to subscribe to all tournaments
 * @returns {Object} { tournaments, loading }
 */
export function useTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isSubscribed = true;

    const unsubscribe = subscribeTournaments((data) => {
      if (isSubscribed) {
        setTournaments(data);
        setLoading(false);
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, []);

  return { tournaments, loading };
}

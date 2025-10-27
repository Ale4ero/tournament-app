import { useState, useEffect } from 'react';
import { subscribeMatches, subscribeMatch, subscribeSubmissions, subscribeAllSubmissions } from '../services/match.service';

/**
 * Hook to subscribe to all matches for a tournament
 * @param {string} tournamentId - Tournament ID
 * @returns {Object} { matches, loading }
 */
export function useMatches(tournamentId) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeMatches(tournamentId, (data) => {
      setMatches(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [tournamentId]);

  return { matches, loading };
}

/**
 * Hook to subscribe to a single match
 * @param {string} tournamentId - Tournament ID
 * @param {string} matchId - Match ID
 * @returns {Object} { match, loading }
 */
export function useMatch(tournamentId, matchId) {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId || !matchId) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeMatch(tournamentId, matchId, (data) => {
      setMatch(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [tournamentId, matchId]);

  return { match, loading };
}

/**
 * Hook to subscribe to submissions for a match
 * @param {string} matchId - Match ID
 * @returns {Object} { submissions, loading }
 */
export function useSubmissions(matchId) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeSubmissions(matchId, (data) => {
      setSubmissions(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [matchId]);

  return { submissions, loading };
}

/**
 * Hook to subscribe to all submissions for a match (pending, approved, rejected)
 * @param {string} matchId - Match ID
 * @returns {Object} { submissions, loading }
 */
export function useAllSubmissions(matchId) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeAllSubmissions(matchId, (data) => {
      setSubmissions(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [matchId]);

  return { submissions, loading };
}

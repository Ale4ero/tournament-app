import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getMatchById } from '../services/match.service';
import { getTournamentById } from '../services/tournament.service';
import { subscribeMatch } from '../services/match.service';
import Layout from '../components/layout/Layout';
import MatchDetail from '../components/match/MatchDetail';

export default function MatchPage() {
  const { matchId } = useParams();
  const [searchParams] = useSearchParams();
  const [match, setMatch] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMatch = async () => {
      try {
        // Extract tournament ID from match ID
        // Formats: tournamentId_r1_m1 (playoff) or tournamentId_pool_A_m1 (pool)
        let tournamentId;

        if (matchId.includes('_r')) {
          // Playoff match: split on _r
          tournamentId = matchId.split('_r')[0];
        } else if (matchId.includes('_pool')) {
          // Pool match: split on _pool
          tournamentId = matchId.split('_pool')[0];
        } else {
          // Fallback
          tournamentId = matchId.split('_')[0];
        }

        const matchData = await getMatchById(tournamentId, matchId);
        setMatch(matchData);

        if (matchData) {
          const tournamentData = await getTournamentById(matchData.tournamentId);
          setTournament(tournamentData);

          // Subscribe to real-time updates
          const unsubscribe = subscribeMatch(tournamentId, matchId, (updatedMatch) => {
            setMatch(updatedMatch);
          });

          return unsubscribe;
        }
      } catch (error) {
        console.error('Error loading match:', error);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = loadMatch();
    return () => {
      if (unsubscribe && typeof unsubscribe.then === 'function') {
        unsubscribe.then((unsub) => unsub && unsub());
      }
    };
  }, [matchId]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">Loading match...</div>
        </div>
      </Layout>
    );
  }

  // Determine which tab to link to based on match type
  const getBackLink = () => {
    if (!tournament) return '/';

    // If it's a pool match, go to pools tab; otherwise go to playoffs tab
    const tab = match?.matchType === 'pool' ? 'pools' : 'playoffs';
    const poolView = searchParams.get('poolView');

    // Include poolView parameter if it exists (to remember Standings vs Matches tab)
    if (poolView) {
      return `/tournament/${tournament.id}?tab=${tab}&poolView=${poolView}`;
    }

    return `/tournament/${tournament.id}?tab=${tab}`;
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to={getBackLink()}
          className="text-primary-600 hover:text-primary-700 mb-6 inline-block"
        >
          ← Back to {tournament ? 'Bracket' : 'Tournaments'}
        </Link>

        <MatchDetail match={match} tournament={tournament} />
      </div>
    </Layout>
  );
}

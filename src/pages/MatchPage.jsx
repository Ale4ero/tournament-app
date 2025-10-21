import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getMatchById } from '../services/match.service';
import { getTournamentById } from '../services/tournament.service';
import { subscribeMatch } from '../services/match.service';
import Layout from '../components/layout/Layout';
import MatchDetail from '../components/match/MatchDetail';

export default function MatchPage() {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMatch = async () => {
      try {
        // Extract tournament ID from match ID (format: tournamentId_r1_m1)
        const tournamentId = matchId.split('_r')[0];

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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to={tournament ? `/tournament/${tournament.id}` : '/'}
          className="text-primary-600 hover:text-primary-700 mb-6 inline-block"
        >
          ← Back to {tournament ? 'Bracket' : 'Tournaments'}
        </Link>

        <MatchDetail match={match} tournament={tournament} />
      </div>
    </Layout>
  );
}

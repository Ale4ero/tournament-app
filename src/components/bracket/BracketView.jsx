import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../../services/firebase';
import { useMatches } from '../../hooks/useMatches';
import PlayInBracketView from './PlayInBracketView';
import ByeBracketView from './ByeBracketView';

/**
 * BracketView - Main bracket component that routes to the appropriate bracket renderer
 * based on the playoff format (play-in vs bye style).
 */
export default function BracketView({ tournamentId }) {
  const { matches, loading } = useMatches(tournamentId);
  const [playoffSeeding, setPlayoffSeeding] = useState(null);
  const [playoffFormat, setPlayoffFormat] = useState(null);

  // Fetch playoff seeding data and format
  useEffect(() => {
    if (!tournamentId) return;

    const seedingRef = ref(database, `tournaments/${tournamentId}/playoffSeeding`);
    const unsubscribe = onValue(seedingRef, (snapshot) => {
      if (snapshot.exists()) {
        setPlayoffSeeding(snapshot.val());
      }
    });

    // Fetch playoff format
    const formatRef = ref(database, `tournaments/${tournamentId}/playoffs/format`);
    const formatUnsubscribe = onValue(formatRef, (snapshot) => {
      if (snapshot.exists()) {
        setPlayoffFormat(snapshot.val());
      }
    });

    return () => {
      unsubscribe();
      formatUnsubscribe();
    };
  }, [tournamentId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading bracket...</div>
      </div>
    );
  }

  // Filter to only show playoff matches (exclude pool matches)
  const playoffMatches = matches.filter(
    (match) => match.matchType !== 'pool' && match.round !== null
  );

  if (playoffMatches.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm">
        <p className="text-gray-600 text-lg">No playoff matches scheduled yet</p>
      </div>
    );
  }

  // Route to appropriate bracket view based on format
  // "play-in" or "none" = PlayInBracketView (mathematical positioning)
  // "byes" = ByeBracketView (relationship-based positioning)
  const isByeFormat = playoffFormat === 'byes';

  if (isByeFormat) {
    return <ByeBracketView playoffMatches={playoffMatches} playoffSeeding={playoffSeeding} />;
  } else {
    return <PlayInBracketView playoffMatches={playoffMatches} playoffSeeding={playoffSeeding} />;
  }
}

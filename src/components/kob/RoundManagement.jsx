import { useState, useEffect } from 'react';
import { advanceToNextRound, isRoundCompleted } from '../../services/kob.service';

/**
 * RoundManagement - Admin controls for managing KOB rounds
 */
export default function RoundManagement({ tournament, currentRound, onRoundAdvanced }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [allMatchesCompleted, setAllMatchesCompleted] = useState(false);

  // Check if all matches in the current round are completed
  useEffect(() => {
    async function checkCompletion() {
      if (!tournament?.id || !currentRound?.id) return;

      const completed = await isRoundCompleted(tournament.id, currentRound.id);
      setAllMatchesCompleted(completed);
    }

    checkCompletion();

    // Re-check every 3 seconds to detect when matches are completed
    const interval = setInterval(checkCompletion, 3000);

    return () => clearInterval(interval);
  }, [tournament?.id, currentRound?.id]);

  const handleAdvanceRound = async () => {
    if (!currentRound) {
      setError('No current round found');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if all pools are completed
      setChecking(true);
      const completed = await isRoundCompleted(tournament.id, currentRound.id);
      setChecking(false);

      if (!completed) {
        setError('Cannot advance: Not all matches in this round are completed');
        setLoading(false);
        return;
      }

      // Confirm with admin
      const advancePerPool = tournament.kobConfig?.advancePerPool || 2;
      if (
        !window.confirm(
          `Advance top ${advancePerPool} player(s) from each pool to the next round?`
        )
      ) {
        setLoading(false);
        return;
      }

      // Advance to next round
      await advanceToNextRound(
        tournament.id,
        currentRound.id,
        currentRound.roundNumber,
        advancePerPool,
        tournament.kobConfig?.poolSize || 4
      );

      // Notify parent
      if (onRoundAdvanced) {
        onRoundAdvanced();
      }
    } catch (err) {
      console.error('Error advancing round:', err);
      setError(err.message || 'Failed to advance to next round');
    } finally {
      setLoading(false);
    }
  };

  if (!currentRound) {
    return null;
  }

  const isRoundActive = currentRound.status !== 'completed';

  return (
    <div className="card bg-yellow-50 border-yellow-200">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Round {currentRound.roundNumber} Management
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {!allMatchesCompleted
              ? 'Complete all matches to advance to the next round'
              : isRoundActive
              ? 'All matches completed - ready to advance'
              : 'Round completed'}
          </p>
        </div>

        {!allMatchesCompleted ? (
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            In Progress
          </span>
        ) : (
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            Ready
          </span>
        )}
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {allMatchesCompleted && (
        <div className="mt-4">
          <button
            onClick={handleAdvanceRound}
            disabled={loading || checking}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checking
              ? 'Checking completion...'
              : loading
              ? 'Advancing to next round...'
              : 'Complete Round & Advance Top Players'}
          </button>

          <p className="text-xs text-gray-500 mt-2">
            This will finalize the current round standings and create pools for the next round
            with the top {tournament.kobConfig?.advancePerPool || 2} player(s) from each pool.
          </p>
        </div>
      )}
    </div>
  );
}

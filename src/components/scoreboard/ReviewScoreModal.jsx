import { useState } from 'react';
import { submitScoreboardResults } from '../../services/scoreboard.service';

/**
 * ReviewScoreModal - Modal for reviewing and submitting final scores
 * @param {Object} scoreboard - Scoreboard data
 * @param {string} userId - Current user ID
 * @param {Function} onClose - Callback to close modal
 * @param {Function} onSuccess - Callback on successful submission
 */
export default function ReviewScoreModal({ scoreboard, userId, onClose, onSuccess }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!scoreboard) return null;

  const winnerName = scoreboard.winner === 'team1' ? scoreboard.team1 : scoreboard.team2;
  const loserName = scoreboard.winner === 'team1' ? scoreboard.team2 : scoreboard.team1;

  // Calculate total scores
  let team1TotalScore = 0;
  let team2TotalScore = 0;

  scoreboard.sets.forEach((set) => {
    if (set.winner) {
      team1TotalScore += set.team1Score;
      team2TotalScore += set.team2Score;
    }
  });

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');
      await submitScoreboardResults(scoreboard.matchId, userId);
      onSuccess();
    } catch (err) {
      console.error('Error submitting score:', err);
      setError(err.message || 'Failed to submit score');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-primary-600 text-white p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold">Review & Submit Score</h2>
          <p className="text-primary-100 mt-1">Confirm the final match results</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
          )}

          {/* Winner Announcement */}
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 text-center">
            <div className="text-6xl mb-3">🏆</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Winner: {winnerName}</h3>
            <p className="text-gray-600">
              {scoreboard.team1SetsWon} - {scoreboard.team2SetsWon} ({winnerName} wins)
            </p>
          </div>

          {/* Set-by-Set Breakdown */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Set Breakdown</h4>
            <div className="space-y-2">
              {scoreboard.sets.map((set, index) => {
                if (!set.winner) return null;
                const setWinnerName = set.winner === 'team1' ? scoreboard.team1 : scoreboard.team2;
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 rounded-lg p-4"
                  >
                    <div>
                      <span className="font-semibold text-gray-900">Set {set.setNumber}</span>
                      <span className="text-sm text-gray-600 ml-2">({setWinnerName} wins)</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {scoreboard.team1}: {set.team1Score} - {scoreboard.team2}: {set.team2Score}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total Score Summary */}
          <div className="bg-gray-100 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-600 mb-2">Total Points</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-gray-700 font-medium mb-1">{scoreboard.team1}</p>
                <p className="text-3xl font-bold text-gray-900">{team1TotalScore}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-700 font-medium mb-1">{scoreboard.team2}</p>
                <p className="text-3xl font-bold text-gray-900">{team2TotalScore}</p>
              </div>
            </div>
          </div>

          {/* Rules Reference */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Match Rules</h4>
            <p className="text-sm text-blue-800">
              Best of {scoreboard.rules.bestOf}. First to {scoreboard.rules.firstTo} points,
              win by {scoreboard.rules.winBy}, capped at {scoreboard.rules.cap}.
            </p>
          </div>

          {/* Important Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <span className="text-yellow-600 text-xl">ℹ️</span>
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Submission for Admin Review</p>
                <p>
                  This score will be submitted for admin approval. An admin must review and approve
                  the score before the match is officially completed and the winner advances.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-gray-50 rounded-b-lg flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Go Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Confirm & Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

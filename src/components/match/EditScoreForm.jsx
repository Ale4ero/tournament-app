import { useState } from 'react';
import { editMatchScore } from '../../services/match.service';
import { useAuth } from '../../contexts/AuthContext';

export default function EditScoreForm({ match, onCancel }) {
  const { user } = useAuth();
  const [score1, setScore1] = useState(match.score1?.toString() || '');
  const [score2, setScore2] = useState(match.score2?.toString() || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      setError('You must be logged in as admin');
      return;
    }

    // Check if scores actually changed
    const newScore1 = parseInt(score1, 10);
    const newScore2 = parseInt(score2, 10);

    if (newScore1 === match.score1 && newScore2 === match.score2) {
      setError('Scores have not changed');
      return;
    }

    // Show confirmation if this might affect subsequent matches
    if (match.nextMatchId && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    setError('');
    setLoading(true);

    try {
      await editMatchScore(
        match.tournamentId,
        match.id,
        newScore1,
        newScore2,
        user.uid
      );

      // Close the edit form on success
      if (onCancel) {
        onCancel();
      }
    } catch (err) {
      setError('Failed to update score. Please try again.');
      console.error('Score edit error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    if (onCancel) {
      onCancel();
    }
  };

  if (showConfirmation) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-yellow-900 mb-2">Confirm Score Edit</h3>
        <p className="text-sm text-yellow-800 mb-4">
          This match feeds into subsequent matches in the bracket. Editing this score may:
        </p>
        <ul className="list-disc list-inside text-sm text-yellow-800 mb-4 space-y-1">
          <li>Change the winner of this match</li>
          <li>Update teams in the next match</li>
          <li>Clear any completed matches that depend on this result</li>
        </ul>
        <p className="text-sm font-medium text-yellow-900 mb-4">
          Are you sure you want to proceed?
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Yes, Update Score'}
          </button>
          <button
            onClick={() => setShowConfirmation(false)}
            disabled={loading}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <h3 className="text-lg font-bold text-blue-900 mb-4">Edit Match Score</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {match.team1}
            </label>
            <input
              type="number"
              min="0"
              value={score1}
              onChange={(e) => setScore1(e.target.value)}
              required
              className="input-field"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {match.team2}
            </label>
            <input
              type="number"
              min="0"
              value={score2}
              onChange={(e) => setScore2(e.target.value)}
              required
              className="input-field"
              placeholder="0"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Score'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>

        {match.nextMatchId && (
          <p className="text-xs text-yellow-700 text-center bg-yellow-50 rounded p-2">
            Warning: Editing this score may affect subsequent matches in the bracket.
          </p>
        )}
      </form>
    </div>
  );
}

import { useState } from 'react';
import { submitScoreAsAdmin } from '../../services/match.service';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminScoreSubmissionForm({ match }) {
  const { user } = useAuth();
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      setError('You must be logged in as admin');
      return;
    }

    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await submitScoreAsAdmin(
        match.tournamentId,
        match.id,
        parseInt(score1, 10),
        parseInt(score2, 10),
        user.uid
      );

      setSuccess(true);
      setScore1('');
      setScore2('');
    } catch (err) {
      setError('Failed to submit score. Please try again.');
      console.error('Admin score submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!match.team1 || !match.team2) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-600">
        Score submission will be available once both teams are determined.
      </div>
    );
  }

  if (match.status === 'completed') {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-600">
        This match has been completed.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-bold mb-4">Submit Score (Admin)</h3>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
          Score submitted successfully! Match completed and winner advanced.
        </div>
      )}

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

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting...' : 'Submit Score & Complete Match'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          As an admin, this will immediately complete the match and advance the winner.
        </p>
      </form>
    </div>
  );
}

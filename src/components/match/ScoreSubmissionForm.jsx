import { useState } from 'react';
import { submitScore } from '../../services/match.service';
import { useAllSubmissions } from '../../hooks/useMatches';
import SubmissionHistory from './SubmissionHistory';

export default function ScoreSubmissionForm({ match, onSuccess }) {
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [submittedBy, setSubmittedBy] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { submissions, loading: loadingSubmissions } = useAllSubmissions(match?.id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await submitScore(match.id, {
        matchId: match.id,
        tournamentId: match.tournamentId,
        team1: match.team1,
        team2: match.team2,
        score1: parseInt(score1, 10),
        score2: parseInt(score2, 10),
        submittedBy: submittedBy || 'Anonymous',
      });

      setSuccess(true);
      setScore1('');
      setScore2('');
      setSubmittedBy('');
      setShowForm(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError('Failed to submit score. Please try again.');
      console.error('Score submission error:', err);
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

  // Determine if we should show form by default (no submissions yet)
  const hasSubmissions = submissions.length > 0;
  const shouldShowForm = showForm || !hasSubmissions;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-bold mb-4">Submit Score</h3>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
          Score submitted successfully! Awaiting admin approval.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Submission History */}
      {hasSubmissions && (
        <div className="mb-4">
          <SubmissionHistory submissions={submissions} />
        </div>
      )}

      {/* Show form or button to show form */}
      {shouldShowForm ? (
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name (Optional)
            </label>
            <input
              type="text"
              value={submittedBy}
              onChange={(e) => setSubmittedBy(e.target.value)}
              className="input-field"
              placeholder="Anonymous"
            />
            <p className="text-xs text-gray-500 mt-1">
              Help admins verify scores by providing your name
            </p>
          </div>

          <div className="flex gap-2">
            {hasSubmissions && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`${hasSubmissions ? 'flex-1' : 'w-full'} btn-primary disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Submitting...' : 'Submit Score'}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Scores must be approved by an admin before being reflected in the bracket
          </p>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full btn-secondary"
        >
          + Add New Score
        </button>
      )}
    </div>
  );
}

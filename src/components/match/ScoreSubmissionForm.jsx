import { useState, useEffect } from 'react';
import { submitScore } from '../../services/match.service';
import { useAllSubmissions } from '../../hooks/useMatches';
import SubmissionHistory from './SubmissionHistory';

export default function ScoreSubmissionForm({ match, onSuccess }) {
  const [submittedBy, setSubmittedBy] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Set-based scoring state
  const [setScores, setSetScores] = useState([]);

  const { submissions, loading: loadingSubmissions } = useAllSubmissions(match?.id);

  // Get match rules (with defaults)
  const matchRules = match?.rules || {
    firstTo: 21,
    winBy: 2,
    cap: 30,
    bestOf: 3,
  };

  // Initialize sets based on bestOf rule
  useEffect(() => {
    if (match && matchRules.bestOf) {
      // Initialize empty sets
      const initialSets = Array(matchRules.bestOf).fill(null).map(() => ({
        score1: '',
        score2: '',
      }));
      setSetScores(initialSets);
    }
  }, [match, matchRules.bestOf]);

  // Validate a single set score
  const validateSetScore = (score1, score2, setNumber) => {
    const s1 = parseInt(score1, 10);
    const s2 = parseInt(score2, 10);

    if (isNaN(s1) || isNaN(s2)) {
      return { valid: false, error: `Set ${setNumber + 1}: Both scores must be numbers` };
    }

    if (s1 < 0 || s2 < 0) {
      return { valid: false, error: `Set ${setNumber + 1}: Scores cannot be negative` };
    }

    // Check if someone reached the "first to" score
    const { firstTo, winBy, cap } = matchRules;
    const reachedFirstTo = s1 >= firstTo || s2 >= firstTo;
    const maxScore = Math.max(s1, s2);
    const minScore = Math.min(s1, s2);
    const diff = Math.abs(s1 - s2);

    // If score is at or above cap, cap rules apply
    if (maxScore >= cap) {
      // Must be at cap or cap+1 only
      if (maxScore > cap + 1) {
        return { valid: false, error: `Set ${setNumber + 1}: Score cannot exceed cap + 1 (${cap + 1})` };
      }
      // Must win by exactly 1 at cap
      if (diff !== 1) {
        return { valid: false, error: `Set ${setNumber + 1}: At cap (${cap}), must win by exactly 1` };
      }
    } else if (reachedFirstTo) {
      // Normal win condition: must reach firstTo and win by winBy
      if (diff < winBy) {
        return { valid: false, error: `Set ${setNumber + 1}: Must win by at least ${winBy} points` };
      }
    } else {
      // Neither team has reached firstTo yet - incomplete set
      return { valid: false, error: `Set ${setNumber + 1}: At least one team must reach ${firstTo} points` };
    }

    // Determine winner
    const winner = s1 > s2 ? 1 : 2;

    return { valid: true, winner };
  };

  // Handle set score updates
  const updateSetScore = (setIndex, team, value) => {
    const newSetScores = [...setScores];
    if (team === 1) {
      newSetScores[setIndex].score1 = value;
    } else {
      newSetScores[setIndex].score2 = value;
    }
    setSetScores(newSetScores);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      // Validate all non-empty sets
      const validatedSets = [];
      let team1Wins = 0;
      let team2Wins = 0;
      const setsNeededToWin = Math.ceil(matchRules.bestOf / 2);

      for (let i = 0; i < setScores.length; i++) {
        const set = setScores[i];
        const score1 = set.score1?.toString().trim();
        const score2 = set.score2?.toString().trim();

        // Skip empty sets
        if (!score1 && !score2) {
          continue;
        }

        // Validate the set
        const validation = validateSetScore(score1, score2, i);
        if (!validation.valid) {
          setError(validation.error);
          setLoading(false);
          return;
        }

        // Track set wins
        if (validation.winner === 1) team1Wins++;
        if (validation.winner === 2) team2Wins++;

        validatedSets.push({
          set: i + 1,
          score1: parseInt(score1, 10),
          score2: parseInt(score2, 10),
          winner: validation.winner === 1 ? match.team1 : match.team2,
        });
      }

      // Must have at least one completed set
      if (validatedSets.length === 0) {
        setError('Please complete at least one set');
        setLoading(false);
        return;
      }

      // Check if match is complete (someone won majority of sets)
      if (team1Wins < setsNeededToWin && team2Wins < setsNeededToWin) {
        setError(`Match incomplete. First to win ${setsNeededToWin} sets wins the match.`);
        setLoading(false);
        return;
      }

      // Calculate total match scores (sets won)
      const matchScore1 = team1Wins;
      const matchScore2 = team2Wins;

      await submitScore(match.id, {
        matchId: match.id,
        tournamentId: match.tournamentId,
        team1: match.team1,
        team2: match.team2,
        score1: matchScore1,
        score2: matchScore2,
        setScores: validatedSets,
        submittedBy: submittedBy || 'Anonymous',
      });

      setSuccess(true);
      // Reset form
      const resetSets = Array(matchRules.bestOf).fill(null).map(() => ({
        score1: '',
        score2: '',
      }));
      setSetScores(resetSets);
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
          {/* Match Rules Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <h4 className="font-semibold text-blue-900 mb-1">Match Rules</h4>
            <div className="text-blue-800 space-y-0.5">
              <p>• Best of {matchRules.bestOf} sets (first to win {Math.ceil(matchRules.bestOf / 2)})</p>
              <p>• First to {matchRules.firstTo} points per set</p>
              <p>• Must win by {matchRules.winBy} points</p>
              <p>• Score cap at {matchRules.cap} points (win by 1)</p>
            </div>
          </div>

          {/* Set Scores */}
          <div className="space-y-3">
            {setScores.map((set, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Set {index + 1}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {match.team1}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={matchRules.cap + 1}
                      value={set.score1}
                      onChange={(e) => updateSetScore(index, 1, e.target.value)}
                      className="input-field text-center"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {match.team2}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={matchRules.cap + 1}
                      value={set.score2}
                      onChange={(e) => updateSetScore(index, 2, e.target.value)}
                      className="input-field text-center"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            ))}
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

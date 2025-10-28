import { useState } from 'react';
import { updateMatchRules } from '../../services/match.service';

export default function EditMatchRulesForm({ match, onCancel, onSuccess }) {
  // Check if this is a pool match
  const isPoolMatch = match.matchType === 'pool' || match.poolId;

  const [rules, setRules] = useState({
    firstTo: match.rules?.firstTo || 21,
    winBy: match.rules?.winBy || 2,
    cap: match.rules?.cap || 30,
    bestOf: match.rules?.bestOf || 3,
    numSets: match.rules?.numSets || match.rules?.bestOf || 2,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setRules((prev) => ({
      ...prev,
      [field]: parseInt(value, 10),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (rules.firstTo <= 0) {
      setError('First To must be greater than 0');
      setLoading(false);
      return;
    }

    if (rules.winBy <= 0) {
      setError('Win By must be greater than 0');
      setLoading(false);
      return;
    }

    if (rules.cap <= rules.firstTo) {
      setError('Score cap must be greater than First To');
      setLoading(false);
      return;
    }

    // Validate bestOf only for non-pool matches
    if (!isPoolMatch) {
      if (rules.bestOf <= 0 || rules.bestOf % 2 === 0) {
        setError('Best Of must be a positive odd number (e.g., 1, 3, 5)');
        setLoading(false);
        return;
      }
    }

    // Validate numSets for pool matches
    if (isPoolMatch && rules.numSets <= 0) {
      setError('Number of Sets must be greater than 0');
      setLoading(false);
      return;
    }

    try {
      await updateMatchRules(match.tournamentId, match.id, rules);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError('Failed to update match rules. Please try again.');
      console.error('Error updating match rules:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-bold mb-4">Edit Match Rules</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First To
            </label>
            <input
              type="number"
              min="1"
              value={rules.firstTo}
              onChange={(e) => handleChange('firstTo', e.target.value)}
              required
              className="input-field"
            />
            <p className="text-xs text-gray-500 mt-1">
              Points needed to win a set
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Win By
            </label>
            <input
              type="number"
              min="1"
              value={rules.winBy}
              onChange={(e) => handleChange('winBy', e.target.value)}
              required
              className="input-field"
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum point difference to win
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Score Cap
            </label>
            <input
              type="number"
              min="1"
              value={rules.cap}
              onChange={(e) => handleChange('cap', e.target.value)}
              required
              className="input-field"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum score (win by 1 at cap)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isPoolMatch ? 'Sets' : 'Best Of'}
            </label>
            <input
              type="number"
              min="1"
              step={isPoolMatch ? "1" : "2"}
              value={isPoolMatch ? rules.numSets : rules.bestOf}
              onChange={(e) => handleChange(isPoolMatch ? 'numSets' : 'bestOf', e.target.value)}
              required
              className="input-field"
            />
            <p className="text-xs text-gray-500 mt-1">
              {isPoolMatch ? 'Number of sets per match' : 'Number of sets (must be odd)'}
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <p className="font-semibold mb-1">Preview:</p>
          <p>
            {isPoolMatch ? (
              <>
                {rules.numSets} sets per match. First to {rules.firstTo} points, must
                win by {rules.winBy}, capped at {rules.cap}.
              </>
            ) : (
              <>
                Best of {rules.bestOf} sets. First to {rules.firstTo} points, must
                win by {rules.winBy}, capped at {rules.cap}.
              </>
            )}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Rules'}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Note: Changing rules will only affect future score submissions for this match.
        </p>
      </form>
    </div>
  );
}

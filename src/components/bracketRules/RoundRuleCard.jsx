import { useState } from 'react';

/**
 * RoundRuleCard - UI for configuring match rules for a single round
 * @param {string} roundName - Display name of the round (e.g., "Finals", "Semifinals")
 * @param {string} roundKey - Internal key for the round (e.g., "finals", "semifinals")
 * @param {Object} rules - Current rules for this round { firstTo, winBy, cap, bestOf }
 * @param {Function} onRulesChange - Callback when rules change (roundKey, newRules)
 * @param {boolean} disabled - Whether the inputs are disabled
 */
export default function RoundRuleCard({ roundName, roundKey, rules, onRulesChange, disabled = false }) {
  const [localRules, setLocalRules] = useState(rules);

  const handleChange = (field, value) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) return;

    const newRules = {
      ...localRules,
      [field]: numValue,
    };

    setLocalRules(newRules);
    onRulesChange(roundKey, newRules);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{roundName}</h3>

      <div className="grid grid-cols-2 gap-4">
        {/* First To */}
        <div>
          <label htmlFor={`${roundKey}-firstTo`} className="block text-sm font-medium text-gray-700 mb-1">
            First To
          </label>
          <input
            id={`${roundKey}-firstTo`}
            type="number"
            min="1"
            value={localRules.firstTo}
            onChange={(e) => handleChange('firstTo', e.target.value)}
            disabled={disabled}
            className="input-field"
          />
          <p className="text-xs text-gray-500 mt-1">Target score to win a set</p>
        </div>

        {/* Win By */}
        <div>
          <label htmlFor={`${roundKey}-winBy`} className="block text-sm font-medium text-gray-700 mb-1">
            Win By
          </label>
          <input
            id={`${roundKey}-winBy`}
            type="number"
            min="1"
            value={localRules.winBy}
            onChange={(e) => handleChange('winBy', e.target.value)}
            disabled={disabled}
            className="input-field"
          />
          <p className="text-xs text-gray-500 mt-1">Points needed to win by</p>
        </div>

        {/* Cap */}
        <div>
          <label htmlFor={`${roundKey}-cap`} className="block text-sm font-medium text-gray-700 mb-1">
            Score Cap
          </label>
          <input
            id={`${roundKey}-cap`}
            type="number"
            min="1"
            value={localRules.cap}
            onChange={(e) => handleChange('cap', e.target.value)}
            disabled={disabled}
            className="input-field"
          />
          <p className="text-xs text-gray-500 mt-1">Maximum score limit</p>
        </div>

        {/* Best Of */}
        <div>
          <label htmlFor={`${roundKey}-bestOf`} className="block text-sm font-medium text-gray-700 mb-1">
            Best Of
          </label>
          <input
            id={`${roundKey}-bestOf`}
            type="number"
            min="1"
            step="2"
            value={localRules.bestOf}
            onChange={(e) => handleChange('bestOf', e.target.value)}
            disabled={disabled}
            className="input-field"
          />
          <p className="text-xs text-gray-500 mt-1">Number of sets (odd number)</p>
        </div>
      </div>

      {/* Rule Summary */}
      <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
        <p className="text-sm text-gray-700">
          <strong>Summary:</strong> Best of {localRules.bestOf} sets. First to {localRules.firstTo} points,
          must win by {localRules.winBy}, capped at {localRules.cap}.
        </p>
      </div>
    </div>
  );
}

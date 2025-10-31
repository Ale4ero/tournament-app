/**
 * AdvanceRulesForm.jsx
 *
 * Admin UI for configuring playoff advancement rules.
 * Displays live suggestions and math for byes vs play-in formats.
 */

import { useState, useEffect } from 'react';
import useAdvanceRules from './useAdvanceRules';
import { suggestPlayoffFormat } from '../../services/advance.service';

export default function AdvanceRulesForm({ draftId, defaultNumTeams = 8, onSave }) {
  const {
    advanceRules,
    loading,
    saving,
    error,
    updateNumTeamsAdvancing,
    updateFormat,
  } = useAdvanceRules(draftId, defaultNumTeams);

  const [localNumTeams, setLocalNumTeams] = useState(defaultNumTeams);
  const [localFormat, setLocalFormat] = useState(null);

  // Sync local state with hook state
  useEffect(() => {
    if (advanceRules) {
      setLocalNumTeams(advanceRules.numTeamsAdvancing);
      setLocalFormat(advanceRules.formatChosen);
    }
  }, [advanceRules]);

  const handleNumTeamsChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 2) {
      setLocalNumTeams(value);
      updateNumTeamsAdvancing(value);
    }
  };

  const handleFormatChange = (e) => {
    const value = e.target.value;
    setLocalFormat(value);
    updateFormat(value);
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <div className="text-gray-600">Loading advance rules...</div>
      </div>
    );
  }

  const math = advanceRules?.math || suggestPlayoffFormat(localNumTeams);
  const suggestion = math.suggestion;

  // Check if it's a power of 2
  const isPowerOfTwo = math.lower === math.higher;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="space-y-6 pt-4">
        <p className="text-sm text-gray-600">
          Configure how teams advance from pool play to playoffs. The system will suggest the
          optimal format based on the number of teams.
        </p>
          {/* Number of Teams Advancing */}
          <div>
            <label htmlFor="numTeamsAdvancing" className="block text-sm font-medium text-gray-700 mb-2">
              Number of Teams Advancing to Playoffs *
            </label>
            <input
              id="numTeamsAdvancing"
              type="number"
              min="2"
              value={localNumTeams}
              onChange={handleNumTeamsChange}
              disabled={saving}
              className="input-field w-full md:w-48"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Specify how many teams will advance to the playoff bracket
            </p>
          </div>

          {/* Live Suggestion */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Suggested Format</h4>
            {isPowerOfTwo ? (
              <p className="text-sm text-blue-800">
                <strong>Standard Bracket:</strong> {localNumTeams} teams is a power of 2. No byes or play-ins needed.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-blue-800">
                  <strong>Recommended: {suggestion === 'byes' ? 'Auto-Byes' : 'Play-In Matches'}</strong>
                </p>
                <div className="text-xs text-blue-700 font-mono">
                  <div>Byes: {math.byes} teams skip Round 1</div>
                  <div>Play-In Teams: {math.playIns} teams play extra matches</div>
                  <div>Lower Bracket: {math.lower} teams</div>
                  <div>Upper Bracket: {math.higher} teams</div>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  {suggestion === 'play-in'
                    ? `Play-in is suggested because it impacts fewer teams (${math.playIns} vs ${math.byes} idle).`
                    : `Byes are suggested because it impacts fewer teams (${math.byes} idle vs ${math.playIns} playing extra).`}
                </p>
              </div>
            )}
          </div>

          {/* Format Selection (only if not power of 2) */}
          {!isPowerOfTwo && (
            <div>
              <label htmlFor="playoffFormat" className="block text-sm font-medium text-gray-700 mb-2">
                Playoff Format
              </label>
              <select
                id="playoffFormat"
                value={localFormat || suggestion}
                onChange={handleFormatChange}
                disabled={saving}
                className="input-field w-full md:w-64"
              >
                <option value="byes">Auto-Byes (Top Seeds Skip Round 1)</option>
                <option value="play-in">Play-In Matches (Lowest Seeds Play Extra)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                You can override the suggested format if needed
              </p>
            </div>
          )}

          {/* Format Explanation */}
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-2">
            <h5 className="font-semibold text-gray-900">Format Explanation:</h5>
            <div>
              <strong>Auto-Byes:</strong> The top {math.byes} seeded teams automatically advance to Round 2.
              The remaining {localNumTeams - math.byes} teams play in Round 1.
            </div>
            <div>
              <strong>Play-In Matches:</strong> The lowest {math.playIns} seeded teams play {math.playIns / 2} play-in
              matches. Winners advance to join the top seeds in the main bracket.
            </div>
          </div>

        {saving && (
          <div className="text-sm text-blue-600">
            Saving changes...
          </div>
        )}
      </div>
    </div>
  );
}

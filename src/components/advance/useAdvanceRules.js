/**
 * useAdvanceRules.js
 *
 * Custom hook for managing advance rules state in tournament drafts
 */

import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '../../services/firebase';
import { DB_PATHS } from '../../utils/constants';
import { suggestPlayoffFormat, computeAdvancementMath } from '../../services/advance.service';

/**
 * Hook for managing advance rules
 * @param {string} draftId - Tournament draft ID
 * @param {number} defaultNumTeams - Default number of teams advancing
 * @returns {Object} Advance rules state and handlers
 */
export default function useAdvanceRules(draftId, defaultNumTeams = 8) {
  const [advanceRules, setAdvanceRules] = useState({
    numTeamsAdvancing: defaultNumTeams,
    formatChosen: null,
    suggestedFormat: null,
    math: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Load existing advance rules from draft
  useEffect(() => {
    if (!draftId) {
      setLoading(false);
      return;
    }

    const rulesRef = ref(database, `${DB_PATHS.TOURNAMENT_DRAFTS}/${draftId}/advanceRules`);
    const unsubscribe = onValue(
      rulesRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const rules = snapshot.val();
          setAdvanceRules({
            numTeamsAdvancing: rules.numTeamsAdvancing || defaultNumTeams,
            formatChosen: rules.formatChosen || rules.suggestedFormat,
            suggestedFormat: rules.suggestedFormat,
            math: rules.math,
          });
        } else {
          // Initialize with suggestion and save to database
          const suggestion = suggestPlayoffFormat(defaultNumTeams);
          const initialRules = {
            numTeamsAdvancing: defaultNumTeams,
            formatChosen: suggestion.suggestion !== 'none' ? suggestion.suggestion : null,
            suggestedFormat: suggestion.suggestion !== 'none' ? suggestion.suggestion : null,
            math: suggestion,
          };

          // Save initial rules to database
          try {
            await update(rulesRef, initialRules);
            console.log('[useAdvanceRules] Initialized and saved advance rules:', initialRules);
          } catch (err) {
            console.error('[useAdvanceRules] Error saving initial rules:', err);
          }

          setAdvanceRules(initialRules);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error loading advance rules:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [draftId, defaultNumTeams]);

  /**
   * Updates the number of teams advancing and recalculates suggestion
   */
  const updateNumTeamsAdvancing = useCallback(
    async (numTeams) => {
      if (!draftId) return;

      try {
        setSaving(true);
        setError(null);

        const suggestion = suggestPlayoffFormat(numTeams);
        const newRules = {
          numTeamsAdvancing: numTeams,
          suggestedFormat: suggestion.suggestion !== 'none' ? suggestion.suggestion : null,
          formatChosen: suggestion.suggestion !== 'none' ? suggestion.suggestion : null,
          math: suggestion,
        };

        const rulesRef = ref(database, `${DB_PATHS.TOURNAMENT_DRAFTS}/${draftId}/advanceRules`);
        await update(rulesRef, newRules);

        setAdvanceRules(newRules);
      } catch (err) {
        console.error('Error updating num teams advancing:', err);
        setError(err.message);
      } finally {
        setSaving(false);
      }
    },
    [draftId]
  );

  // Auto-update advance rules when defaultNumTeams changes (pool config changed)
  useEffect(() => {
    if (!draftId || loading) return;

    // Only update if the number of teams has actually changed
    if (advanceRules.numTeamsAdvancing !== defaultNumTeams) {
      console.log('[useAdvanceRules] defaultNumTeams changed, updating:', defaultNumTeams);
      updateNumTeamsAdvancing(defaultNumTeams);
    }
  }, [defaultNumTeams, draftId, loading, advanceRules.numTeamsAdvancing, updateNumTeamsAdvancing]);

  /**
   * Updates the chosen format (allow manual override)
   */
  const updateFormat = useCallback(
    async (format) => {
      if (!draftId) return;

      try {
        setSaving(true);
        setError(null);

        const rulesRef = ref(database, `${DB_PATHS.TOURNAMENT_DRAFTS}/${draftId}/advanceRules`);
        await update(rulesRef, { formatChosen: format });

        setAdvanceRules(prev => ({ ...prev, formatChosen: format }));
      } catch (err) {
        console.error('Error updating format:', err);
        setError(err.message);
      } finally {
        setSaving(false);
      }
    },
    [draftId]
  );

  /**
   * Recalculates suggestion based on current number of teams
   */
  const recalculateSuggestion = useCallback(() => {
    const suggestion = suggestPlayoffFormat(advanceRules.numTeamsAdvancing);
    return suggestion;
  }, [advanceRules.numTeamsAdvancing]);

  return {
    advanceRules,
    loading,
    saving,
    error,
    updateNumTeamsAdvancing,
    updateFormat,
    recalculateSuggestion,
  };
}

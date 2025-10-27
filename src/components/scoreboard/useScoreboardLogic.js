import { useState, useEffect, useCallback } from 'react';
import { subscribeScoreboard, updateScore, resetCurrentSet } from '../../services/scoreboard.service';
import { SCOREBOARD_STATUS } from '../../utils/constants';

/**
 * Custom hook to manage scoreboard logic
 * @param {string} scoreboardId - Scoreboard ID
 * @param {string} userId - Current user ID
 * @param {boolean} isReadOnly - Whether the scoreboard is read-only
 * @returns {Object} Scoreboard state and methods
 */
export default function useScoreboardLogic(scoreboardId, userId, isReadOnly = false) {
  const [scoreboard, setScoreboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Subscribe to scoreboard updates
  useEffect(() => {
    if (!scoreboardId) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeScoreboard(scoreboardId, (data) => {
      setScoreboard(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [scoreboardId]);

  /**
   * Increment score for a team
   * @param {string} team - 'team1' or 'team2'
   */
  const incrementScore = useCallback(
    async (team) => {
      if (isReadOnly || !scoreboard || scoreboard.locked || updating) return;

      try {
        setUpdating(true);
        const currentSetIndex = scoreboard.currentSet - 1;
        const currentSet = scoreboard.sets[currentSetIndex];
        const currentScore = team === 'team1' ? currentSet.team1Score : currentSet.team2Score;
        const newScore = currentScore + 1;

        await updateScore(scoreboardId, team, newScore, userId);
      } catch (err) {
        console.error('Error incrementing score:', err);
        setError(err.message);
      } finally {
        setUpdating(false);
      }
    },
    [scoreboardId, scoreboard, userId, isReadOnly, updating]
  );

  /**
   * Decrement score for a team
   * @param {string} team - 'team1' or 'team2'
   */
  const decrementScore = useCallback(
    async (team) => {
      if (isReadOnly || !scoreboard || scoreboard.locked || updating) return;

      try {
        setUpdating(true);
        const currentSetIndex = scoreboard.currentSet - 1;
        const currentSet = scoreboard.sets[currentSetIndex];
        const currentScore = team === 'team1' ? currentSet.team1Score : currentSet.team2Score;

        if (currentScore > 0) {
          const newScore = currentScore - 1;
          await updateScore(scoreboardId, team, newScore, userId);
        }
      } catch (err) {
        console.error('Error decrementing score:', err);
        setError(err.message);
      } finally {
        setUpdating(false);
      }
    },
    [scoreboardId, scoreboard, userId, isReadOnly, updating]
  );

  /**
   * Reset current set scores to 0-0
   */
  const resetSet = useCallback(async () => {
    if (isReadOnly || !scoreboard || scoreboard.locked) return;

    try {
      setUpdating(true);
      await resetCurrentSet(scoreboardId, userId);
    } catch (err) {
      console.error('Error resetting set:', err);
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }, [scoreboardId, userId, scoreboard, isReadOnly]);

  /**
   * Get current set data
   */
  const getCurrentSet = useCallback(() => {
    if (!scoreboard) return null;
    return scoreboard.sets[scoreboard.currentSet - 1];
  }, [scoreboard]);

  /**
   * Check if scoreboard is in review status
   */
  const isInReview = scoreboard?.status === SCOREBOARD_STATUS.REVIEW;

  /**
   * Check if scoreboard is completed
   */
  const isCompleted = scoreboard?.status === SCOREBOARD_STATUS.COMPLETED;

  /**
   * Check if scoreboard is active
   */
  const isActive = scoreboard?.status === SCOREBOARD_STATUS.ACTIVE;

  /**
   * Get winner team name
   */
  const getWinnerName = useCallback(() => {
    if (!scoreboard || !scoreboard.winner) return null;
    return scoreboard.winner === 'team1' ? scoreboard.team1 : scoreboard.team2;
  }, [scoreboard]);

  /**
   * Get current scores
   */
  const getCurrentScores = useCallback(() => {
    const currentSet = getCurrentSet();
    return {
      team1Score: currentSet?.team1Score || 0,
      team2Score: currentSet?.team2Score || 0,
    };
  }, [getCurrentSet]);

  /**
   * Get sets won
   */
  const getSetsWon = useCallback(() => {
    return {
      team1: scoreboard?.team1SetsWon || 0,
      team2: scoreboard?.team2SetsWon || 0,
    };
  }, [scoreboard]);

  return {
    scoreboard,
    loading,
    error,
    updating,
    isInReview,
    isCompleted,
    isActive,
    incrementScore,
    decrementScore,
    resetSet,
    getCurrentSet,
    getWinnerName,
    getCurrentScores,
    getSetsWon,
  };
}

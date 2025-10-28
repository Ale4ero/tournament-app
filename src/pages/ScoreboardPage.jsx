import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMatch } from '../services/match.service';
import { createScoreboard, deleteScoreboard, getScoreboard } from '../services/scoreboard.service';
import useScoreboardLogic from '../components/scoreboard/useScoreboardLogic';
import { SCOREBOARD_STATUS } from '../utils/constants';
import ScoreSide from '../components/scoreboard/ScoreSide';
import ReviewScoreModal from '../components/scoreboard/ReviewScoreModal';
import SetCompletedModal from '../components/scoreboard/SetCompletedModal';

/**
 * ScoreboardPage - Full-screen interactive scoreboard
 */
export default function ScoreboardPage() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [match, setMatch] = useState(null);
  const [scoreboardId, setScoreboardId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showSetCompletedModal, setShowSetCompletedModal] = useState(false);
  const [showMatchRulesModal, setShowMatchRulesModal] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [completedSetData, setCompletedSetData] = useState(null);
  const [initializing, setInitializing] = useState(false);
  const previousSetWinnerRef = useRef(null);

  const {
    scoreboard,
    loading: scoreboardLoading,
    error: scoreboardError,
    isInReview,
    isCompleted,
    isActive,
    incrementScore,
    decrementScore,
    resetSet,
    getCurrentSet,
    getCurrentScores,
    getSetsWon,
    getWinnerName,
  } = useScoreboardLogic(scoreboardId, user?.uid || 'anonymous', false); // Allow all users to interact

  // Load match and scoreboard
  useEffect(() => {
    if (!matchId) {
      setError('Invalid match ID');
      setLoading(false);
      return;
    }

    loadMatchAndScoreboard();
  }, [matchId]);

  // Detect when a set is completed
  useEffect(() => {
    if (!scoreboard || !isActive) return;

    const currentSet = scoreboard.sets[scoreboard.currentSet - 1];

    // Check if current set has a winner and we haven't shown the modal yet
    if (currentSet?.winner && currentSet.winner !== previousSetWinnerRef.current) {
      previousSetWinnerRef.current = currentSet.winner;
      setCompletedSetData({
        setNumber: currentSet.setNumber,
        ...currentSet,
      });
      setShowSetCompletedModal(true);
    }

    // Reset the ref when moving to a new set without a winner
    if (!currentSet?.winner) {
      previousSetWinnerRef.current = null;
    }
  }, [scoreboard, isActive]);

  // Show review modal when scoreboard enters review status
  useEffect(() => {
    if (isInReview && !showReviewModal) {
      setShowReviewModal(true);
      setShowSetCompletedModal(false); // Hide set completed modal if review modal is shown
    }
  }, [isInReview]);

  const loadMatchAndScoreboard = async () => {
    try {
      setLoading(true);
      const matchData = await getMatch(matchId);

      if (!matchData) {
        setError('Match not found');
        setLoading(false);
        return;
      }

      setMatch(matchData);

      // Check if match already has a scoreboard
      if (matchData.scoreboardId) {
        // Check if the scoreboard is completed (from a rejected submission)
        const existingScoreboard = await getScoreboard(matchData.scoreboardId);

        if (existingScoreboard && existingScoreboard.status === SCOREBOARD_STATUS.COMPLETED) {
          // Scoreboard is completed but submission was rejected - delete it and create new one
          console.log('Deleting old completed scoreboard and creating new one');
          await deleteScoreboard(matchData.scoreboardId);
          await initializeScoreboard(matchData);
        } else if (existingScoreboard) {
          // Scoreboard exists and is active - use it
          setScoreboardId(matchData.scoreboardId);
        } else {
          // Scoreboard doesn't exist (was deleted) - create new one
          await initializeScoreboard(matchData);
        }
      } else {
        // Create new scoreboard for any user
        await initializeScoreboard(matchData);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading match:', err);
      setError(err.message || 'Failed to load match');
      setLoading(false);
    }
  };

  const initializeScoreboard = async (matchData) => {
    try {
      setInitializing(true);
      const newScoreboardId = await createScoreboard(matchData, user?.uid || 'anonymous');
      setScoreboardId(newScoreboardId);
    } catch (err) {
      console.error('Error initializing scoreboard:', err);
      setError('Failed to create scoreboard');
    } finally {
      setInitializing(false);
    }
  };

  const handleResetSet = async () => {
    if (window.confirm('Are you sure you want to reset the current set to 0-0?')) {
      await resetSet();
    }
  };

  const handleSetCompletedAdvance = () => {
    // Close the modal - the backend will automatically handle advancement or match completion
    setShowSetCompletedModal(false);
    setCompletedSetData(null);
  };

  const handleSetCompletedReset = async () => {
    setShowSetCompletedModal(false);
    setCompletedSetData(null);
    await resetSet();
  };

  const handleExit = () => {
    // If match is already completed, just navigate away
    if (isCompleted) {
      navigate(`/match/${matchId}`);
      return;
    }

    // Check if any changes have been made (any set has scores recorded)
    const hasChanges = scoreboard?.sets?.some(set =>
      (set.team1Score > 0 || set.team2Score > 0)
    );

    // If no changes, just exit without confirmation
    if (!hasChanges) {
      handleExitWithoutSaving();
      return;
    }

    // Otherwise, show confirmation modal
    setShowExitConfirmModal(true);
  };

  const handleExitWithoutSaving = async () => {
    try {
      await deleteScoreboard(scoreboardId);
      navigate(`/match/${matchId}`);
    } catch (err) {
      console.error('Error deleting scoreboard:', err);
      alert('Failed to delete scoreboard');
    }
  };

  const handleExitWithSaving = () => {
    // Just navigate away, scoreboard is automatically saved
    navigate(`/match/${matchId}`);
  };

  const handleSubmitSuccess = () => {
    navigate(`/match/${matchId}`, {
      state: { message: 'Score submitted successfully! Awaiting admin approval.' },
    });
  };

  if (loading || scoreboardLoading || initializing) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl">
            {initializing ? 'Initializing scoreboard...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (error || scoreboardError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-red-600 mb-4 text-center">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Error</h2>
          <p className="text-gray-600 text-center mb-6">{error || scoreboardError}</p>
          <button onClick={() => navigate(`/match/${matchId}`)} className="btn-primary w-full">
            Back to Match
          </button>
        </div>
      </div>
    );
  }

  if (!scoreboard) {
    return null;
  }

  const { team1Score, team2Score } = getCurrentScores();
  const setsWon = getSetsWon();
  const isLocked = scoreboard.locked || !isActive;

  return (
    <div className="fixed inset-0 bg-gray-900 overflow-hidden">
      {/* Header Bar */}
      <div className="absolute top-0 left-0 right-0 bg-gray-800 text-white px-4 py-3 z-10 shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-lg md:text-xl font-bold">{match?.tournamentName || 'Tournament'}</h1>
            <p className="text-sm text-gray-300">
              Set {scoreboard.currentSet} of {scoreboard.rules.bestOf}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMatchRulesModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Rules
            </button>
            {isActive && (
              <button
                onClick={handleResetSet}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
              >
                Reset Set
              </button>
            )}
            <button
              onClick={handleExit}
              className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              {isCompleted ? 'Back to Match' : 'Exit'}
            </button>
          </div>
        </div>
      </div>

      {/* Scoreboard Grid */}
      <div className="h-full pt-16 grid grid-cols-2">
        {/* Team 1 (Red) */}
        <ScoreSide
          teamName={scoreboard.team1}
          color={scoreboard.team1Color}
          score={team1Score}
          setsWon={setsWon.team1}
          onIncrement={() => incrementScore('team1')}
          onDecrement={() => decrementScore('team1')}
          disabled={isLocked}
          isWinner={scoreboard.winner === 'team1' && isInReview}
        />

        {/* Team 2 (Blue) */}
        <ScoreSide
          teamName={scoreboard.team2}
          color={scoreboard.team2Color}
          score={team2Score}
          setsWon={setsWon.team2}
          onIncrement={() => incrementScore('team2')}
          onDecrement={() => decrementScore('team2')}
          disabled={isLocked}
          isWinner={scoreboard.winner === 'team2' && isInReview}
        />
      </div>

      {/* Center Divider */}
      <div className="absolute inset-y-16 left-1/2 w-1 bg-white transform -translate-x-1/2 opacity-30 pointer-events-none" />

      {/* Current Set Indicator (Center) */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-white text-gray-900 px-4 py-2 rounded-full shadow-lg font-bold text-sm z-20">
        Current Set: {scoreboard.currentSet}/{scoreboard.rules.bestOf}
      </div>

      {/* Set Completed Modal */}
      {showSetCompletedModal && completedSetData && (
        <SetCompletedModal
          scoreboard={scoreboard}
          setNumber={completedSetData.setNumber}
          setData={completedSetData}
          onAdvance={handleSetCompletedAdvance}
          onReset={handleSetCompletedReset}
        />
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <ReviewScoreModal
          scoreboard={scoreboard}
          userId={user?.uid || 'anonymous'}
          onClose={() => setShowReviewModal(false)}
          onSuccess={handleSubmitSuccess}
        />
      )}

      {/* Match Rules Modal */}
      {showMatchRulesModal && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Match Rules</h2>
              <button
                onClick={() => setShowMatchRulesModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-blue-600 font-medium mb-1">Best Of</p>
                  <p className="text-3xl font-bold text-blue-900">{scoreboard.rules.bestOf}</p>
                  <p className="text-xs text-blue-700 mt-1">First to {Math.ceil(scoreboard.rules.bestOf / 2)} sets</p>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-green-600 font-medium mb-1">First To</p>
                  <p className="text-3xl font-bold text-green-900">{scoreboard.rules.firstTo}</p>
                  <p className="text-xs text-green-700 mt-1">points per set</p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-sm text-purple-600 font-medium mb-1">Win By</p>
                  <p className="text-3xl font-bold text-purple-900">{scoreboard.rules.winBy}</p>
                  <p className="text-xs text-purple-700 mt-1">minimum point difference</p>
                </div>

                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <p className="text-sm text-orange-600 font-medium mb-1">Score Cap</p>
                  <p className="text-3xl font-bold text-orange-900">{scoreboard.rules.cap}</p>
                  <p className="text-xs text-orange-700 mt-1">win by 1 at cap</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">Summary</p>
                <p className="text-sm text-gray-600">
                  Best of {scoreboard.rules.bestOf} sets. First to {scoreboard.rules.firstTo} points per set.
                  Must win by {scoreboard.rules.winBy} points. Score is capped at {scoreboard.rules.cap}
                  (win by 1 at cap).
                </p>
              </div>

              <button
                onClick={() => setShowMatchRulesModal(false)}
                className="w-full btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirmModal && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Exit Scoreboard?</h2>
            <p className="text-gray-600 mb-6">
              Do you want to save your progress or discard it?
            </p>

            <div className="space-y-3">
              <button
                onClick={handleExitWithSaving}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              >
                Save & Exit
              </button>

              <button
                onClick={handleExitWithoutSaving}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              >
                Discard & Exit
              </button>

              <button
                onClick={() => setShowExitConfirmModal(false)}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-3 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completed Overlay */}
      {isCompleted && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
          <div className="bg-white rounded-lg p-8 max-w-md text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Score Submitted!</h2>
            <p className="text-gray-600 mb-6">
              The score has been submitted for admin review. You can now exit the scoreboard.
            </p>
            <button onClick={() => navigate(`/match/${matchId}`)} className="btn-primary w-full">
              Back to Match
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

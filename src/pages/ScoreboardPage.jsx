import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMatch } from '../services/match.service';
import { createScoreboard, deleteScoreboard } from '../services/scoreboard.service';
import useScoreboardLogic from '../components/scoreboard/useScoreboardLogic';
import ScoreSide from '../components/scoreboard/ScoreSide';
import ReviewScoreModal from '../components/scoreboard/ReviewScoreModal';

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
  const [initializing, setInitializing] = useState(false);

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

  // Show review modal when scoreboard enters review status
  useEffect(() => {
    if (isInReview && !showReviewModal) {
      setShowReviewModal(true);
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
        setScoreboardId(matchData.scoreboardId);
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

  const handleQuit = async () => {
    if (
      window.confirm(
        'Are you sure you want to quit? The scoreboard will be deleted and all progress will be lost.'
      )
    ) {
      try {
        await deleteScoreboard(scoreboardId);
        navigate(`/match/${matchId}`);
      } catch (err) {
        console.error('Error quitting scoreboard:', err);
        alert('Failed to quit scoreboard');
      }
    }
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
            {isActive && (
              <button
                onClick={handleResetSet}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
              >
                Reset Set
              </button>
            )}
            {isActive && (
              <button
                onClick={handleQuit}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
              >
                Quit
              </button>
            )}
            <button
              onClick={() => navigate(`/match/${matchId}`)}
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

      {/* Review Modal */}
      {showReviewModal && (
        <ReviewScoreModal
          scoreboard={scoreboard}
          userId={user?.uid || 'anonymous'}
          onClose={() => setShowReviewModal(false)}
          onSuccess={handleSubmitSuccess}
        />
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

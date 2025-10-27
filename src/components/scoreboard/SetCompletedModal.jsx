/**
 * SetCompletedModal - Modal shown when a set is completed
 * @param {Object} scoreboard - Scoreboard data
 * @param {number} setNumber - Completed set number
 * @param {Object} setData - Set data with scores and winner
 * @param {Function} onAdvance - Callback to advance to next set
 * @param {Function} onReset - Callback to reset the set
 */
export default function SetCompletedModal({ scoreboard, setNumber, setData, onAdvance, onReset }) {
  if (!setData || !setData.winner) return null;

  const winnerName = setData.winner === 'team1' ? scoreboard.team1 : scoreboard.team2;
  const loserName = setData.winner === 'team1' ? scoreboard.team2 : scoreboard.team1;

  // Check if this is the final set (match won)
  const team1SetsWon = scoreboard.sets.filter(s => s.winner === 'team1').length;
  const team2SetsWon = scoreboard.sets.filter(s => s.winner === 'team2').length;
  const setsToWin = Math.ceil(scoreboard.rules.bestOf / 2);
  const isMatchWon = team1SetsWon >= setsToWin || team2SetsWon >= setsToWin;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-green-600 text-white p-6 rounded-t-lg text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-2xl font-bold">Set {setNumber} Complete!</h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Winner Announcement */}
          <div className="text-center">
            <p className="text-gray-600 mb-2">Set Winner</p>
            <p className="text-2xl font-bold text-green-600">{winnerName}</p>
          </div>

          {/* Final Score */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-center text-sm text-gray-600 mb-2">Final Score</p>
            <div className="flex justify-center items-center gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-700 mb-1">{scoreboard.team1}</p>
                <p className={`text-3xl font-bold ${setData.winner === 'team1' ? 'text-green-600' : 'text-gray-400'}`}>
                  {setData.team1Score}
                </p>
              </div>
              <div className="text-2xl text-gray-400">-</div>
              <div className="text-center">
                <p className="text-sm text-gray-700 mb-1">{scoreboard.team2}</p>
                <p className={`text-3xl font-bold ${setData.winner === 'team2' ? 'text-green-600' : 'text-gray-400'}`}>
                  {setData.team2Score}
                </p>
              </div>
            </div>
          </div>

          {/* Current Match Score */}
          {!isMatchWon && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-center text-xs text-blue-900 mb-1">Current Match Score</p>
              <p className="text-center text-lg font-bold text-blue-900">
                {team1SetsWon} - {team2SetsWon}
              </p>
            </div>
          )}

          {/* Match Won Message */}
          {isMatchWon && (
            <div className="bg-yellow-50 border border-yellow-400 rounded-lg p-4 text-center">
              <div className="text-4xl mb-2">🏆</div>
              <p className="text-lg font-bold text-gray-900 mb-1">Match Complete!</p>
              <p className="text-sm text-gray-700">
                {winnerName} wins {team1SetsWon > team2SetsWon ? team1SetsWon : team2SetsWon} - {team1SetsWon > team2SetsWon ? team2SetsWon : team1SetsWon}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 bg-gray-50 rounded-b-lg flex gap-3">
          <button
            onClick={onReset}
            className="flex-1 btn-secondary"
          >
            Reset Set
          </button>
          <button
            onClick={onAdvance}
            className="flex-1 btn-primary"
          >
            {isMatchWon ? 'Review & Submit' : 'Next Set'}
          </button>
        </div>
      </div>
    </div>
  );
}

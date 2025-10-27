import { TEAM_COLORS } from '../../utils/constants';

/**
 * ScoreSide - One side of the scoreboard (Red or Blue)
 * @param {string} teamName - Name of the team
 * @param {string} color - 'red' or 'blue'
 * @param {number} score - Current score
 * @param {number} setsWon - Number of sets won
 * @param {Function} onIncrement - Callback to increment score
 * @param {Function} onDecrement - Callback to decrement score
 * @param {boolean} disabled - Whether controls are disabled
 * @param {boolean} isWinner - Whether this team won the match
 */
export default function ScoreSide({
  teamName,
  color,
  score,
  setsWon,
  onIncrement,
  onDecrement,
  disabled = false,
  isWinner = false,
}) {
  const isRed = color === TEAM_COLORS.RED;

  const bgColor = isRed ? 'bg-red-500' : 'bg-blue-500';
  const bgColorDark = isRed ? 'bg-red-600' : 'bg-blue-600';
  const bgColorLight = isRed ? 'bg-red-400' : 'bg-blue-400';
  const textColor = 'text-white';

  return (
    <div
      className={`${bgColor} ${textColor} h-full flex flex-col items-center justify-between py-8 px-4 relative transition-all ${
        disabled ? 'opacity-75' : 'cursor-pointer active:brightness-95'
      }`}
      onClick={() => !disabled && onIncrement()}
    >
      {/* Winner Badge */}
      {isWinner && (
        <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full font-bold text-lg shadow-lg animate-pulse">
          🏆 WINNER
        </div>
      )}

      {/* Team Name */}
      <div className="text-center mb-4">
        <h2 className="text-2xl md:text-4xl font-bold mb-2 uppercase tracking-wider">{teamName}</h2>
        {/* Sets Won Indicator */}
        <div className="flex gap-2 justify-center">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 md:w-4 md:h-4 rounded-full ${
                i < setsWon ? 'bg-yellow-400' : 'bg-white bg-opacity-30'
              }`}
            />
          ))}
        </div>
        <p className="text-sm md:text-base mt-2 opacity-90">Sets Won: {setsWon}</p>
      </div>

      {/* Score Display */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-9xl md:text-[20rem] font-bold leading-none select-none">{score}</div>
      </div>

      {/* Controls */}
      <div className="mt-4 space-y-3 w-full max-w-xs">
        {/* Decrement Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onDecrement();
          }}
          disabled={disabled || score === 0}
          className={`${bgColorDark} hover:${bgColorLight} disabled:opacity-50 disabled:cursor-not-allowed ${textColor} w-full py-3 px-6 rounded-lg font-bold text-xl transition-all shadow-lg active:scale-95`}
        >
          – Undo Point
        </button>

        {/* Increment Button (Alternative) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onIncrement();
          }}
          disabled={disabled}
          className={`${bgColorDark} hover:${bgColorLight} disabled:opacity-50 disabled:cursor-not-allowed ${textColor} w-full py-3 px-6 rounded-lg font-bold text-xl transition-all shadow-lg active:scale-95`}
        >
          + Add Point
        </button>
      </div>

      {/* Touch Hint */}
      {!disabled && (
        <div className="absolute bottom-4 left-4 text-xs md:text-sm opacity-60">
          Tap anywhere to add point
        </div>
      )}
    </div>
  );
}

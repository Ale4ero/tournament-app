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
      className={`${bgColor} ${textColor} h-full flex flex-col items-center justify-between py-4 md:py-8 px-2 md:px-4 relative transition-all ${
        disabled ? 'opacity-75' : 'cursor-pointer active:brightness-95'
      }`}
      onClick={() => !disabled && onIncrement()}
    >
      {/* Winner Badge */}
      {isWinner && (
        <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-yellow-400 text-yellow-900 px-2 py-1 md:px-4 md:py-2 rounded-full font-bold text-sm md:text-lg shadow-lg animate-pulse">
          🏆 WINNER
        </div>
      )}

      {/* Team Name */}
      <div className="text-center mb-2 md:mb-4">
        <h2 className="text-lg md:text-4xl font-bold mb-1 md:mb-2 uppercase tracking-wide md:tracking-wider break-words max-w-full px-1">{teamName}</h2>
        {/* Sets Won Indicator */}
        <div className="flex gap-1 md:gap-2 justify-center">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 md:w-4 md:h-4 rounded-full ${
                i < setsWon ? 'bg-yellow-400' : 'bg-white bg-opacity-30'
              }`}
            />
          ))}
        </div>
        <p className="text-xs md:text-base mt-1 md:mt-2 opacity-90">Sets Won: {setsWon}</p>
      </div>

      {/* Score Display */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div className="text-6xl sm:text-8xl md:text-[20rem] font-bold leading-none select-none">{score}</div>
      </div>

      {/* Controls */}
      <div className="mt-2 md:mt-4 space-y-2 md:space-y-3 w-full max-w-xs">
        {/* Decrement Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onDecrement();
          }}
          disabled={disabled || score === 0}
          className={`${bgColorDark} hover:${bgColorLight} disabled:opacity-50 disabled:cursor-not-allowed ${textColor} w-full py-2 md:py-3 px-3 md:px-6 rounded-lg font-bold text-sm md:text-xl transition-all shadow-lg active:scale-95`}
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
          className={`${bgColorDark} hover:${bgColorLight} disabled:opacity-50 disabled:cursor-not-allowed ${textColor} w-full py-2 md:py-3 px-3 md:px-6 rounded-lg font-bold text-sm md:text-xl transition-all shadow-lg active:scale-95`}
        >
          + Add Point
        </button>
      </div>

      {/* Touch Hint */}
      {!disabled && (
        <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 text-xs md:text-sm opacity-60">
          Tap anywhere to add point
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { areAllPoolsCompleted, advanceToPlayoffs } from '../../services/pool.service';

/**
 * AdvanceToPlayoffsButton - Admin button to generate playoff bracket from pool results
 * @param {string} tournamentId - Tournament ID
 * @param {Object} poolConfig - Pool configuration
 * @param {Object} playoffConfig - Playoff configuration
 */
export default function AdvanceToPlayoffsButton({ tournamentId, poolConfig, playoffConfig }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allPoolsComplete, setAllPoolsComplete] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkPoolsCompletion();
  }, [tournamentId]);

  const checkPoolsCompletion = async () => {
    try {
      setChecking(true);
      const complete = await areAllPoolsCompleted(tournamentId);
      setAllPoolsComplete(complete);
    } catch (error) {
      console.error('Error checking pool completion:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleAdvance = async () => {
    if (!window.confirm(
      'Are you sure you want to advance to playoffs? This will generate the playoff bracket based on current pool standings.'
    )) {
      return;
    }

    setAdvancing(true);
    try {
      await advanceToPlayoffs(
        tournamentId,
        poolConfig,
        playoffConfig,
        user.uid
      );

      alert('Playoff bracket generated successfully! The tournament has advanced to the playoffs phase.');

      // Reload the page to show the playoffs tab
      window.location.reload();
    } catch (error) {
      console.error('Error advancing to playoffs:', error);
      alert('Failed to advance to playoffs: ' + error.message);
    } finally {
      setAdvancing(false);
    }
  };

  if (checking) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3"></div>
        <p className="text-gray-600 text-sm">Checking pool completion status...</p>
      </div>
    );
  }

  if (!allPoolsComplete) {
    // Calculate total advancing teams
    let totalAdvancing = 0;
    let advancementText = '';

    if (poolConfig.advancePerPoolCustom && Object.keys(poolConfig.advancePerPoolCustom).length > 0) {
      // Custom per-pool advancement
      totalAdvancing = Object.values(poolConfig.advancePerPoolCustom).reduce((sum, val) => sum + parseInt(val || 0), 0);
      advancementText = 'Variable teams per pool will advance';
    } else {
      // Uniform advancement
      totalAdvancing = poolConfig.advancePerPool;
      advancementText = `Top ${poolConfig.advancePerPool} team${poolConfig.advancePerPool !== 1 ? 's' : ''} from each pool will advance`;
    }

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="text-yellow-600 text-xl">⏳</div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-yellow-900 mb-1">Pool Play In Progress</h4>
            <p className="text-sm text-yellow-800">
              All pool matches must be completed before advancing to playoffs. {advancementText}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate advancement info for ready state
  let advancementInfo = [];
  let totalAdvancingReady = 0;

  if (poolConfig.advancePerPoolCustom && Object.keys(poolConfig.advancePerPoolCustom).length > 0) {
    // Custom per-pool advancement - show details
    Object.entries(poolConfig.advancePerPoolCustom).forEach(([poolId, count]) => {
      const poolName = poolId.replace('pool_', 'Pool ');
      advancementInfo.push(`${poolName}: ${count} team${count !== 1 ? 's' : ''}`);
    });
    totalAdvancingReady = Object.values(poolConfig.advancePerPoolCustom).reduce((sum, val) => sum + parseInt(val || 0), 0);
  } else {
    // Uniform advancement
    advancementInfo.push(`Top ${poolConfig.advancePerPool} team${poolConfig.advancePerPool !== 1 ? 's' : ''} from each pool will advance`);
  }

  return (
    <div className="bg-green-50 border-2 border-green-400 rounded-lg p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="text-green-600 text-2xl">✓</div>
        <div className="flex-1">
          <h4 className="text-lg font-bold text-green-900 mb-1">Pool Play Complete!</h4>
          <p className="text-sm text-green-800 mb-3">
            All pool matches have been completed. You can now generate the playoff bracket
            with seeded teams based on pool performance.
          </p>
          <div className="bg-white rounded-lg p-3 mb-3">
            <p className="text-xs font-semibold text-gray-700 mb-1">Playoff Format:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              {advancementInfo.map((info, index) => (
                <li key={index}>• {info}</li>
              ))}
              <li>• Teams will be seeded by pool performance</li>
              <li>• Single-elimination playoff bracket will be generated</li>
            </ul>
          </div>
        </div>
      </div>

      <button
        onClick={handleAdvance}
        disabled={advancing}
        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {advancing ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Generating Playoffs...</span>
          </>
        ) : (
          <>
            <span className="text-xl">🏆</span>
            <span>Advance to Playoffs</span>
          </>
        )}
      </button>
    </div>
  );
}

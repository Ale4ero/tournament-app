import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import { getTournamentDraft, createPoolPlayTournamentFromDraft } from '../services/tournament.service';
import { DEFAULT_POOL_CONFIG } from '../utils/constants';
import CollapsibleCard from '../components/pools/CollapsibleCard';
import TeamSeedingList from '../components/pools/TeamSeedingList';
import useSeeding from '../components/pools/useSeeding';

/**
 * PoolSetupPage - Configure pool settings before creating tournament
 */
export default function PoolSetupPage() {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [poolConfig, setPoolConfig] = useState({
    numPools: DEFAULT_POOL_CONFIG.numPools,
    pointsPerWin: DEFAULT_POOL_CONFIG.pointsPerWin,
    pointsPerLoss: DEFAULT_POOL_CONFIG.pointsPerLoss,
    advancePerPool: DEFAULT_POOL_CONFIG.advancePerPool,
    poolMatchRules: { ...DEFAULT_POOL_CONFIG.poolMatchRules },
  });

  const [playoffConfig, setPlayoffConfig] = useState({
    matchRules: {
      finals: { firstTo: 21, winBy: 2, cap: 30, bestOf: 3 },
      semifinals: { firstTo: 21, winBy: 2, cap: 25, bestOf: 3 },
      quarterfinals: { firstTo: 21, winBy: 2, cap: 25, bestOf: 3 },
    },
  });

  // Team seeding hook
  const {
    seededTeams,
    updateTeams,
    resetAlphabetically,
    randomize,
    saveSeedOrder,
  } = useSeeding(draftId, draft?.seedOrder || draft?.teams || []);

  useEffect(() => {
    loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  const loadDraft = async () => {
    try {
      setLoading(true);
      const draftData = await getTournamentDraft(draftId);
      if (!draftData) {
        setError('Tournament draft not found');
        setLoading(false);
        return;
      }
      setDraft(draftData);
      setLoading(false);
    } catch (err) {
      console.error('Error loading draft:', err);
      setError(err.message || 'Failed to load tournament draft');
      setLoading(false);
    }
  };

  const handlePoolConfigChange = (field, value) => {
    setPoolConfig((prev) => ({ ...prev, [field]: parseInt(value, 10) }));
  };

  const handlePoolMatchRulesChange = (field, value) => {
    setPoolConfig((prev) => ({
      ...prev,
      poolMatchRules: { ...prev.poolMatchRules, [field]: parseInt(value, 10) },
    }));
  };

  const handleSeedingReorder = (reorderedTeams) => {
    // Update local state with the new order
    updateTeams(reorderedTeams);
    // Auto-save to Firebase
    saveSeedOrder(reorderedTeams).catch(err => {
      console.error('Failed to save seed order:', err);
    });
  };

  const handleResetAlphabetically = () => {
    const sorted = resetAlphabetically();
    saveSeedOrder(sorted).catch(err => {
      console.error('Failed to save seed order:', err);
    });
  };

  const handleRandomize = () => {
    const shuffled = randomize();
    saveSeedOrder(shuffled).catch(err => {
      console.error('Failed to save seed order:', err);
    });
  };

  const handleCreateTournament = async () => {
    try {
      setCreating(true);
      setError('');

      // Validate configuration
      if (poolConfig.numPools < 2) {
        setError('Must have at least 2 pools');
        setCreating(false);
        return;
      }

      if (draft.teams.length < poolConfig.numPools) {
        setError('Number of pools cannot exceed number of teams');
        setCreating(false);
        return;
      }

      if (poolConfig.advancePerPool < 1) {
        setError('At least 1 team must advance from each pool');
        setCreating(false);
        return;
      }

      const totalAdvancing = poolConfig.numPools * poolConfig.advancePerPool;
      if (totalAdvancing > draft.teams.length) {
        setError('Too many teams advancing (more than total teams)');
        setCreating(false);
        return;
      }

      // Check if total advancing teams is a power of 2
      const isPowerOfTwo = (n) => n > 0 && (n & (n - 1)) === 0;
      if (!isPowerOfTwo(totalAdvancing)) {
        setError(
          `Total advancing teams (${totalAdvancing}) must be a power of 2 for playoff bracket. Adjust pools or teams advancing.`
        );
        setCreating(false);
        return;
      }

      // Create tournament
      const tournamentId = await createPoolPlayTournamentFromDraft(draftId, poolConfig, playoffConfig);

      // Redirect to tournament view
      navigate(`/tournament/${tournamentId}`, {
        state: { message: 'Pool play tournament created successfully!' },
      });
    } catch (err) {
      console.error('Error creating tournament:', err);
      setError(err.message || 'Failed to create tournament');
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-600">Loading tournament draft...</div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error && !draft) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
          <button onClick={() => navigate('/admin')} className="mt-4 btn-secondary">
            Back to Admin
          </button>
        </div>
      </Layout>
    );
  }

  const teamsPerPool = Math.floor(draft.teams.length / poolConfig.numPools);
  const totalAdvancing = poolConfig.numPools * poolConfig.advancePerPool;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Configure Pool Play</h1>
          <p className="text-gray-600">
            Set up pools and rules for: <span className="font-semibold">{draft.name}</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Tournament Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Tournament Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <span className="font-medium">Total Teams:</span> {draft.teams.length}
            </div>
            <div>
              <span className="font-medium">Type:</span> Pool Play + Playoffs
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Pool Configuration */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Pool Configuration</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Pools
                </label>
                <input
                  type="number"
                  min="2"
                  max="4"
                  value={poolConfig.numPools}
                  onChange={(e) => handlePoolConfigChange('numPools', e.target.value)}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ~{teamsPerPool} teams per pool
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teams Advancing Per Pool
                </label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={poolConfig.advancePerPool}
                  onChange={(e) => handlePoolConfigChange('advancePerPool', e.target.value)}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Total advancing: {totalAdvancing} teams
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Points Per Win
                </label>
                <input
                  type="number"
                  min="0"
                  value={poolConfig.pointsPerWin}
                  onChange={(e) => handlePoolConfigChange('pointsPerWin', e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Points Per Loss
                </label>
                <input
                  type="number"
                  min="0"
                  value={poolConfig.pointsPerLoss}
                  onChange={(e) => handlePoolConfigChange('pointsPerLoss', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {/* Pool Match Rules */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Pool Match Rules</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First To
                </label>
                <input
                  type="number"
                  min="1"
                  value={poolConfig.poolMatchRules.firstTo}
                  onChange={(e) => handlePoolMatchRulesChange('firstTo', e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Win By
                </label>
                <input
                  type="number"
                  min="1"
                  value={poolConfig.poolMatchRules.winBy}
                  onChange={(e) => handlePoolMatchRulesChange('winBy', e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cap
                </label>
                <input
                  type="number"
                  min="1"
                  value={poolConfig.poolMatchRules.cap}
                  onChange={(e) => handlePoolMatchRulesChange('cap', e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sets Per Match
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={poolConfig.poolMatchRules.numSets}
                  onChange={(e) => handlePoolMatchRulesChange('numSets', e.target.value)}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Team records based on sets won/lost (e.g., 1-1 match = each team gets 1W-1L)
                </p>
              </div>
            </div>
          </div>

          {/* Team Seeding Section */}
          <CollapsibleCard
            title="Configure Team Seeding"
            summary={`Teams Ranked: ${seededTeams.length}`}
            defaultExpanded={false}
          >
            <TeamSeedingList
              teams={seededTeams}
              onReorder={handleSeedingReorder}
              onResetAlphabetically={handleResetAlphabetically}
              onRandomize={handleRandomize}
            />
          </CollapsibleCard>

          {/* Summary */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">Tournament Summary</h3>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• {poolConfig.numPools} pools with ~{teamsPerPool} teams each</li>
              <li>• Top {poolConfig.advancePerPool} from each pool advance ({totalAdvancing} total)</li>
              <li>• Pool matches: {poolConfig.poolMatchRules.numSets} sets per match, first to {poolConfig.poolMatchRules.firstTo}</li>
              <li>• Playoff bracket: {totalAdvancing}-team single elimination</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => navigate('/admin')}
            className="btn-secondary"
            disabled={creating}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateTournament}
            disabled={creating}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating Tournament...' : 'Create Tournament & Generate Pools'}
          </button>
        </div>
      </div>
    </Layout>
  );
}

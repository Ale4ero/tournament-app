import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import { getTournamentDraft, deleteTournamentDraft } from '../services/tournament.service';
import { createKOBTournament, generateRoundPools } from '../services/kob.service';
import { DEFAULT_KOB_CONFIG } from '../utils/constants';
import TeamSeedingList from '../components/pools/TeamSeedingList';
import CollapsibleCard from '../components/pools/CollapsibleCard';

/**
 * KOBSetupPage - Configuration page for King of the Beach tournaments
 */
export default function KOBSetupPage() {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, organizationId } = useAuth();
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [kobConfig, setKobConfig] = useState({
    poolSize: DEFAULT_KOB_CONFIG.poolSize,
    advancePerPool: DEFAULT_KOB_CONFIG.advancePerPool,
    matchRules: { ...DEFAULT_KOB_CONFIG.matchRules },
  });

  // Team seeding state
  const [seededPlayers, setSeededPlayers] = useState([]);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }

    async function loadDraft() {
      try {
        const draftData = await getTournamentDraft(draftId);
        if (!draftData) {
          setError('Draft not found');
          setLoading(false);
          return;
        }

        if (draftData.type !== 'kob') {
          setError('Invalid tournament type');
          setLoading(false);
          return;
        }

        setDraft(draftData);

        // Initialize seeded players (use existing seed order if available)
        if (draftData.players) {
          setSeededPlayers(draftData.players);
        }
      } catch (err) {
        console.error('Error loading draft:', err);
        setError('Failed to load tournament draft');
      } finally {
        setLoading(false);
      }
    }

    loadDraft();
  }, [draftId, isAdmin, navigate]);

  const handleConfigChange = (field, value) => {
    setKobConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleMatchRuleChange = (field, value) => {
    setKobConfig(prev => ({
      ...prev,
      matchRules: { ...prev.matchRules, [field]: parseInt(value) || 0 },
    }));
  };

  // Team seeding handlers
  const handleReorderPlayers = (reorderedPlayers) => {
    setSeededPlayers(reorderedPlayers);
  };

  const handleResetAlphabetically = () => {
    const sorted = [...seededPlayers].sort((a, b) => a.localeCompare(b));
    setSeededPlayers(sorted);
  };

  const handleRandomize = () => {
    const shuffled = [...seededPlayers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setSeededPlayers(shuffled);
  };

  const handleCreateTournament = async () => {
    if (!draft || !draft.players) {
      setError('No players found');
      return;
    }

    setCreating(true);
    setError('');

    try {
      // Create KOB tournament with seeded players
      console.log('Creating KOB tournament...');
      const tournamentId = await createKOBTournament(
        {
          name: draft.name,
          description: draft.description,
          startDate: draft.startDate,
          endDate: draft.endDate,
        },
        seededPlayers, // Use seeded order
        kobConfig,
        user.uid,
        organizationId
      );
      console.log('Tournament created with ID:', tournamentId);

      // Generate first round with seeded player IDs
      console.log('Generating Round 1 with players:', seededPlayers.map((_, i) => `player_${i + 1}`));
      const roundData = await generateRoundPools(
        tournamentId,
        1, // Round 1
        seededPlayers.map((_, i) => `player_${i + 1}`),
        kobConfig.poolSize
      );
      console.log('Round 1 generated:', roundData);

      // Wait a moment for Firebase to sync
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify pools were created
      const poolCheckRef = ref(database, `tournaments/${tournamentId}/rounds/${roundData.id}/pools`);
      const poolsSnapshot = await get(poolCheckRef);
      console.log('Pools verification:', poolsSnapshot.exists(), poolsSnapshot.val());

      // Delete draft
      await deleteTournamentDraft(draftId);

      // Navigate to tournament view
      navigate(`/tournaments/${tournamentId}`);
    } catch (err) {
      console.error('Error creating tournament:', err);
      setError(err.message || 'Failed to create tournament');
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel? This will delete the draft.')) {
      try {
        await deleteTournamentDraft(draftId);
        navigate('/admin');
      } catch (err) {
        console.error('Error deleting draft:', err);
      }
    }
  };

  // Calculate estimated pool configuration
  const numPlayers = draft?.players?.length || 0;
  const numPools = Math.ceil(numPlayers / kobConfig.poolSize);
  const playersPerPool = Math.floor(numPlayers / numPools);
  const remainder = numPlayers % numPools;

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading draft...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error && !draft) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            {error}
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="mt-4 btn-secondary"
          >
            Back to Admin
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{draft?.name}</h1>
          <p className="text-gray-600 mt-1">King of the Beach Tournament Setup</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Configure Team Seeding */}
          <CollapsibleCard title="Configure Team Seeding" defaultOpen={true}>
            <TeamSeedingList
              teams={seededPlayers}
              onReorder={handleReorderPlayers}
              onResetAlphabetically={handleResetAlphabetically}
              onRandomize={handleRandomize}
              instructionText="Snake seeding will distribute players across pools to balance competition."
              footerText={`${seededPlayers.length} players ranked • Pools will be generated using snake seeding when you click "Create Tournament"`}
            />
          </CollapsibleCard>

          {/* Pool Configuration */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Pool Configuration</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Players per Pool (4-6 recommended)
                </label>
                <input
                  type="number"
                  min="4"
                  max="6"
                  value={kobConfig.poolSize}
                  onChange={(e) => handleConfigChange('poolSize', parseInt(e.target.value))}
                  className="input-field w-32"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will create <strong>{numPools}</strong> pool{numPools !== 1 ? 's' : ''} with{' '}
                  {remainder > 0 ? (
                    <>
                      {remainder} pool{remainder !== 1 ? 's' : ''} of {playersPerPool + 1} players and{' '}
                      {numPools - remainder} pool{numPools - remainder !== 1 ? 's' : ''} of {playersPerPool} players
                    </>
                  ) : (
                    <>{playersPerPool} players each</>
                  )}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Players Advancing per Pool
                </label>
                <input
                  type="number"
                  min="1"
                  max={kobConfig.poolSize - 1}
                  value={kobConfig.advancePerPool}
                  onChange={(e) => handleConfigChange('advancePerPool', parseInt(e.target.value))}
                  className="input-field w-32"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Top {kobConfig.advancePerPool} player{kobConfig.advancePerPool !== 1 ? 's' : ''} from each pool will advance to the next round
                </p>
              </div>
            </div>
          </div>

          {/* Match Rules */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Match Rules</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First To
                </label>
                <input
                  type="number"
                  min="11"
                  max="30"
                  value={kobConfig.matchRules.firstTo}
                  onChange={(e) => handleMatchRuleChange('firstTo', e.target.value)}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">Points to win</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Win By
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={kobConfig.matchRules.winBy}
                  onChange={(e) => handleMatchRuleChange('winBy', e.target.value)}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum lead to win</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cap
                </label>
                <input
                  type="number"
                  min="15"
                  max="35"
                  value={kobConfig.matchRules.cap}
                  onChange={(e) => handleMatchRuleChange('cap', e.target.value)}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">Maximum score</p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              <strong>Example:</strong> With these settings, a game to {kobConfig.matchRules.firstTo} requires winning by{' '}
              {kobConfig.matchRules.winBy}, but will cap at {kobConfig.matchRules.cap} points.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleCreateTournament}
              disabled={creating || numPlayers < 4}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating Tournament...' : 'Create Tournament & Start Round 1'}
            </button>
            <button
              onClick={handleCancel}
              disabled={creating}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

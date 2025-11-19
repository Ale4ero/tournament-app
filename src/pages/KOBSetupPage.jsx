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
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [invalidFields, setInvalidFields] = useState([]);

  const [kobConfig, setKobConfig] = useState({
    matchRules: { ...DEFAULT_KOB_CONFIG.matchRules },
  });

  // Rounds configuration state
  const [roundsConfig, setRoundsConfig] = useState([
    {
      roundNumber: 1,
      poolsCount: 1,
      advancePerPool: 4,
      isFinal: false,
    }
  ]);

  // Team seeding state
  const [seededPlayers, setSeededPlayers] = useState([]);

  // Calculate pool configurations first (moved up from later in the code)
  const numPlayers = draft?.players?.length || 0;
  const MIN_POOL_SIZE = 4;
  const MAX_POOL_SIZE = 6;

  // Generate all valid pool configuration options
  const getValidPoolConfigurations = (totalPlayers) => {
    const configurations = [];
    const maxPools = Math.floor(totalPlayers / MIN_POOL_SIZE);

    for (let numPools = 1; numPools <= maxPools; numPools++) {
      const baseSize = Math.floor(totalPlayers / numPools);
      const remainder = totalPlayers % numPools;

      // Check if this configuration is valid (smallest pool has at least 4 players)
      if (baseSize >= MIN_POOL_SIZE && baseSize <= MAX_POOL_SIZE) {
        const largerPools = remainder;
        const smallerPools = numPools - remainder;

        configurations.push({
          numPools,
          baseSize,
          largerPools,
          smallerPools,
          largerSize: baseSize + 1,
          description: remainder > 0
            ? `${largerPools} pool${largerPools !== 1 ? 's' : ''} of ${baseSize + 1}, ${smallerPools} pool${smallerPools !== 1 ? 's' : ''} of ${baseSize}`
            : `${numPools} pool${numPools !== 1 ? 's' : ''} of ${baseSize}`,
          poolSize: baseSize // Store base size as poolSize for backward compatibility
        });
      }
    }

    return configurations;
  };

  const validConfigurations = getValidPoolConfigurations(numPlayers);

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

  const handleMatchRuleChange = (field, value) => {
    // Allow empty string during editing, will validate on submit
    const numValue = value === '' ? '' : parseInt(value);
    setKobConfig(prev => ({
      ...prev,
      matchRules: { ...prev.matchRules, [field]: numValue },
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

  // Rounds configuration handlers
  const handleAddRound = () => {
    const newRound = {
      roundNumber: roundsConfig.length + 1,
      poolsCount: 1,
      advancePerPool: 4, // Minimum for 1 pool to ensure next round has at least 4 players
      isFinal: false,
      selectedPoolConfig: null, // Store selected pool configuration
    };
    setRoundsConfig([...roundsConfig, newRound]);
  };

  const handleRemoveRound = (roundNumber) => {
    if (roundsConfig.length <= 1) return; // Must have at least one round

    const updatedRounds = roundsConfig
      .filter(r => r.roundNumber !== roundNumber)
      .map((r, index) => ({
        ...r,
        roundNumber: index + 1,
        isFinal: r.isFinal && index === roundsConfig.length - 2, // Keep final flag on last round if it was set
      }));

    setRoundsConfig(updatedRounds);
  };

  const handleUpdateRound = (roundNumber, field, value) => {
    setRoundsConfig(roundsConfig.map(round =>
      round.roundNumber === roundNumber
        ? { ...round, [field]: value }
        : round
    ));
  };

  const handleSetFinalRound = (roundNumber) => {
    setRoundsConfig(roundsConfig.map(round => {
      if (round.roundNumber === roundNumber) {
        // Toggle the final status for this round
        return { ...round, isFinal: !round.isFinal };
      }
      // If this round was previously final and we're toggling another round, unset it
      return { ...round, isFinal: false };
    }));
  };

  const handleSelectRoundPoolConfig = (roundNumber, poolConfig) => {
    setRoundsConfig(roundsConfig.map(round => {
      if (round.roundNumber !== roundNumber) return round;

      // Calculate minimum advance per pool for the new pool count
      const minAdvancePerPool = Math.ceil(4 / poolConfig.numPools);

      // Maximum is the pool size (can't advance more players than in the pool)
      const maxAdvancePerPool = poolConfig.poolSize;

      // Adjust current advancePerPool to be within valid range
      const newAdvancePerPool = round.isFinal
        ? Math.ceil(4 / poolConfig.numPools) // For final round, calculate to get exactly 4 players
        : Math.min(Math.max(round.advancePerPool, minAdvancePerPool), maxAdvancePerPool);

      return {
        ...round,
        poolsCount: poolConfig.numPools,
        advancePerPool: newAdvancePerPool,
        selectedPoolConfig: poolConfig,
      };
    }));
  };

  // Calculate valid pool configurations for a specific round based on players available
  const getValidRoundPoolConfigs = (playersInRound) => {
    if (!playersInRound || playersInRound < MIN_POOL_SIZE) return [];

    const configurations = [];
    const maxPools = Math.floor(playersInRound / MIN_POOL_SIZE);

    for (let numPools = 1; numPools <= maxPools; numPools++) {
      const baseSize = Math.floor(playersInRound / numPools);
      const remainder = playersInRound % numPools;

      // Check if this configuration is valid (smallest pool has at least 4 players)
      if (baseSize >= MIN_POOL_SIZE && baseSize <= MAX_POOL_SIZE) {
        const largerPools = remainder;
        const smallerPools = numPools - remainder;

        configurations.push({
          numPools,
          baseSize,
          largerPools,
          smallerPools,
          largerSize: baseSize + 1,
          description: remainder > 0
            ? `${largerPools} pool${largerPools !== 1 ? 's' : ''} of ${baseSize + 1}, ${smallerPools} pool${smallerPools !== 1 ? 's' : ''} of ${baseSize}`
            : `${numPools} pool${numPools !== 1 ? 's' : ''} of ${baseSize}`,
          poolSize: baseSize
        });
      }
    }

    return configurations;
  };

  // Calculate valid advancement options for a round based on number of pools
  const getValidAdvancementOptions = (poolsCount, playersPerPool) => {
    if (!poolsCount || !playersPerPool) return [];

    // Minimum players advancing per pool to ensure next round has at least 4 players total
    const minAdvancePerPool = Math.ceil(4 / poolsCount);

    // Maximum is the number of players in the pool (everyone can advance)
    const maxAdvancePerPool = playersPerPool;

    const options = [];
    for (let i = minAdvancePerPool; i <= maxAdvancePerPool; i++) {
      const totalAdvancing = i * poolsCount;
      options.push({
        advancePerPool: i,
        totalAdvancing,
        description: `${i} per pool (${totalAdvancing} total)`
      });
    }

    return options;
  };

  const handleCreateTournament = async () => {
    if (!draft || !draft.players) {
      setError('No players found');
      return;
    }

    // Validate all inputs before submission
    const { matchRules } = kobConfig;
    const { firstTo, winBy, cap } = matchRules;
    const invalid = [];

    // Validate match rules
    if (firstTo === '' || isNaN(firstTo) || firstTo < 11 || firstTo > 30) {
      setError('First To must be between 11 and 30');
      invalid.push('firstTo');
      setInvalidFields(invalid);
      return;
    }
    if (winBy === '' || isNaN(winBy) || winBy < 1 || winBy > 5) {
      setError('Win By must be between 1 and 5');
      invalid.push('winBy');
      setInvalidFields(invalid);
      return;
    }
    if (cap === '' || isNaN(cap) || cap < 15 || cap > 35) {
      setError('Cap must be between 15 and 35');
      invalid.push('cap');
      setInvalidFields(invalid);
      return;
    }
    if (cap <= firstTo) {
      setError('Cap must be greater than First To');
      invalid.push('cap');
      setInvalidFields(invalid);
      return;
    }

    // Validate rounds configuration
    if (roundsConfig.length === 0) {
      setError('You must have at least one round configured');
      return;
    }

    // Check that there's a final round set
    const hasFinalRound = roundsConfig.some(r => r.isFinal);
    if (!hasFinalRound) {
      setError('Please designate one round as the Final Round');
      return;
    }

    // Validate final round has 4 players
    const finalRound = roundsConfig.find(r => r.isFinal);
    const finalRoundTotalPlayers = finalRound.poolsCount * finalRound.advancePerPool;
    if (finalRoundTotalPlayers !== 4) {
      setError(`Final round must have exactly 4 players. Currently configured for ${finalRoundTotalPlayers} players (${finalRound.poolsCount} pool(s) × ${finalRound.advancePerPool} players)`);
      return;
    }

    // Validate advancement flow makes sense
    for (let i = 0; i < roundsConfig.length - 1; i++) {
      const currentRound = roundsConfig[i];
      const nextRound = roundsConfig[i + 1];
      const currentRoundAdvancing = currentRound.poolsCount * currentRound.advancePerPool;

      // Check minimum players for next round (each pool needs at least 4 players)
      const minPlayersForNextRound = nextRound.poolsCount * 4;

      if (currentRoundAdvancing < minPlayersForNextRound) {
        setError(`Round ${currentRound.roundNumber} only advances ${currentRoundAdvancing} players, but Round ${nextRound.roundNumber} needs at least ${minPlayersForNextRound} players for ${nextRound.poolsCount} pool(s)`);
        return;
      }
    }

    setCreating(true);
    setError('');
    setInvalidFields([]);

    try {
      // Create KOB tournament with seeded players
      console.log('Creating KOB tournament...');

      // Prepare tournament config with rounds configuration
      const tournamentConfig = {
        ...kobConfig,
        roundsConfig: roundsConfig,
      };

      const tournamentId = await createKOBTournament(
        {
          name: draft.name,
          description: draft.description,
          startDate: draft.startDate,
          endDate: draft.endDate,
        },
        seededPlayers, // Use seeded order
        tournamentConfig,
        user.uid,
        organizationId
      );
      console.log('Tournament created with ID:', tournamentId);

      // Generate first round with seeded player IDs
      // Use Round 1's pool configuration
      const round1 = roundsConfig[0];
      const round1PoolSize = round1.selectedPoolConfig?.baseSize || Math.floor(numPlayers / round1.poolsCount);
      console.log('Generating Round 1 with players:', seededPlayers.map((_, i) => `player_${i + 1}`));
      console.log('Using pool size:', round1PoolSize);
      const roundData = await generateRoundPools(
        tournamentId,
        1, // Round 1
        seededPlayers.map((_, i) => `player_${i + 1}`),
        round1PoolSize
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

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleCancelConfirm = async () => {
    try {
      await deleteTournamentDraft(draftId);
      navigate('/admin');
    } catch (err) {
      console.error('Error deleting draft:', err);
    }
  };

  const handleCancelDismiss = () => {
    setShowCancelConfirm(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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

          {/* Rounds Configuration */}
          <div className="card">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Rounds Configuration</h2>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Configure how many rounds your tournament will have and how many players advance from each pool.
              The final round should have 4 players total for the championship.
            </p>

            <div className="space-y-4">
              {roundsConfig.map((round, index) => (
                <div
                  key={round.roundNumber}
                  className={`border-2 rounded-lg p-4 ${
                    round.isFinal
                      ? 'border-yellow-400 bg-yellow-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">
                        Round {round.roundNumber}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xs text-gray-700">Final Round</span>
                        <div
                          onClick={() => handleSetFinalRound(round.roundNumber)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            round.isFinal ? 'bg-yellow-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              round.isFinal ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </div>
                      </label>
                      {roundsConfig.length > 1 && (
                        <button
                          onClick={() => handleRemoveRound(round.roundNumber)}
                          className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                          title="Remove round"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pool Configuration Selection */}
                  <div className="space-y-4">
                    {(() => {
                      // Calculate players available for this round
                      let playersInRound = numPlayers; // Round 1 has all players
                      if (index > 0) {
                        // For subsequent rounds, players = previous round's advancing players
                        const previousRound = roundsConfig[index - 1];
                        playersInRound = previousRound.poolsCount * previousRound.advancePerPool;
                      }

                      const validRoundConfigs = getValidRoundPoolConfigs(playersInRound);
                      const selectedRoundConfig = round.selectedPoolConfig || validRoundConfigs[0];

                      return (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Select Pool Setup ({playersInRound} players available)
                          </label>
                          {validRoundConfigs.length > 0 ? (
                            <div className="space-y-2">
                              {validRoundConfigs.map((config, configIndex) => (
                                <button
                                  key={configIndex}
                                  type="button"
                                  onClick={() => handleSelectRoundPoolConfig(round.roundNumber, config)}
                                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                                    selectedRoundConfig?.numPools === config.numPools &&
                                    selectedRoundConfig?.baseSize === config.baseSize
                                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-semibold">
                                        {config.numPools} Pool{config.numPools !== 1 ? 's' : ''}
                                      </div>
                                      <div className="text-sm text-gray-600 mt-1">
                                        {config.description}
                                      </div>
                                    </div>
                                    {selectedRoundConfig?.numPools === config.numPools &&
                                     selectedRoundConfig?.baseSize === config.baseSize && (
                                      <div className="flex-shrink-0">
                                        <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                              ⚠️ Not enough players ({playersInRound}) to create valid pools for this round.
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Players Advancing Selection (only if not final round) */}
                    {!round.isFinal && (() => {
                      // Calculate players in this round
                      let playersInRound = numPlayers;
                      if (index > 0) {
                        const previousRound = roundsConfig[index - 1];
                        playersInRound = previousRound.poolsCount * previousRound.advancePerPool;
                      }

                      const validRoundConfigs = getValidRoundPoolConfigs(playersInRound);
                      const selectedRoundConfig = round.selectedPoolConfig || validRoundConfigs[0];
                      const playersPerPoolInRound = selectedRoundConfig?.poolSize || 4;

                      const advancementOptions = getValidAdvancementOptions(round.poolsCount, playersPerPoolInRound);

                      return (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Players Advancing per Pool
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {advancementOptions.map((option) => (
                              <button
                                key={option.advancePerPool}
                                type="button"
                                onClick={() => handleUpdateRound(round.roundNumber, 'advancePerPool', option.advancePerPool)}
                                className={`p-3 rounded-lg border-2 text-sm transition-all ${
                                  round.advancePerPool === option.advancePerPool
                                    ? 'border-sky-600 bg-sky-50 text-sky-900'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                              >
                                <div className="font-semibold text-lg">{option.advancePerPool}</div>
                                <div className="text-xs text-gray-600 mt-1">
                                  {option.totalAdvancing} total
                                </div>
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Top {round.advancePerPool || 0} player{round.advancePerPool !== 1 ? 's' : ''} from each pool advance to next round
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Calculated Info */}
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                    <strong>Round Summary:</strong> {round.poolsCount} pool{round.poolsCount !== 1 ? 's' : ''} with{' '}
                    {round.poolsCount * round.advancePerPool} total players{' '}
                    {round.isFinal ? '(Championship Round)' : 'advancing to next round'}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Round Button - Only show if no final round is set */}
            {!roundsConfig.some(r => r.isFinal) && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={handleAddRound}
                  className="btn-primary text-sm px-3 py-1.5"
                >
                  + Add Round
                </button>
              </div>
            )}

            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
              <p className="text-sm font-semibold text-gray-900 mb-2">Tournament Flow:</p>
              <div className="space-y-1 text-sm text-gray-700">
                {roundsConfig.map((round, index) => (
                  <div key={round.roundNumber}>
                    <span className="font-medium">Round {round.roundNumber}:</span>{' '}
                    {round.poolsCount} pool{round.poolsCount !== 1 ? 's' : ''} →{' '}
                    {round.poolsCount * round.advancePerPool} players{' '}
                    {round.isFinal ? '(FINAL)' : index < roundsConfig.length - 1 ? `→ Round ${round.roundNumber + 1}` : ''}
                  </div>
                ))}
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
                  value={kobConfig.matchRules.firstTo}
                  onChange={(e) => {
                    handleMatchRuleChange('firstTo', e.target.value);
                    // Clear invalid state when user types
                    if (invalidFields.includes('firstTo')) {
                      setInvalidFields(invalidFields.filter(f => f !== 'firstTo'));
                      setError('');
                    }
                  }}
                  className={`input-field ${invalidFields.includes('firstTo') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="11-30"
                />
                <p className="text-xs text-gray-500 mt-1">Points to win (11-30)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Win By
                </label>
                <input
                  type="number"
                  value={kobConfig.matchRules.winBy}
                  onChange={(e) => {
                    handleMatchRuleChange('winBy', e.target.value);
                    // Clear invalid state when user types
                    if (invalidFields.includes('winBy')) {
                      setInvalidFields(invalidFields.filter(f => f !== 'winBy'));
                      setError('');
                    }
                  }}
                  className={`input-field ${invalidFields.includes('winBy') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="1-5"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum lead to win (1-5)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cap
                </label>
                <input
                  type="number"
                  value={kobConfig.matchRules.cap}
                  onChange={(e) => {
                    handleMatchRuleChange('cap', e.target.value);
                    // Clear invalid state when user types
                    if (invalidFields.includes('cap')) {
                      setInvalidFields(invalidFields.filter(f => f !== 'cap'));
                      setError('');
                    }
                  }}
                  className={`input-field ${invalidFields.includes('cap') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="15-35"
                />
                <p className="text-xs text-gray-500 mt-1">Maximum score (15-35)</p>
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
              disabled={creating || numPlayers < 4 || validConfigurations.length === 0}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating Tournament...' : 'Create Tournament & Start Round 1'}
            </button>
            <button
              onClick={handleCancelClick}
              disabled={creating}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Cancel Confirmation Dialog */}
        {showCancelConfirm && (
          <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
          >
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Cancel Tournament Setup?
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to cancel? This will delete the draft.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelDismiss}
                  className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  No, Continue Editing
                </button>
                <button
                  onClick={handleCancelConfirm}
                  className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Yes, Cancel Setup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

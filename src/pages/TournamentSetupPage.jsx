import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import {
  getTournamentDraft,
  createTournamentFromDraft,
  createPoolPlayTournamentFromDraft,
  deleteTournamentDraft,
  getTournamentById,
  updateTournament,
} from '../services/tournament.service';
import { getPools } from '../services/pool.service';
import { DEFAULT_POOL_CONFIG, TOURNAMENT_TYPE } from '../utils/constants';
import CollapsibleCard from '../components/pools/CollapsibleCard';
import TeamSeedingList from '../components/pools/TeamSeedingList';
import useSeeding from '../components/pools/useSeeding';
import BracketRulesSection from '../components/bracketRules/BracketRulesSection';
import useBracketRules from '../components/bracketRules/useBracketRules';
import AdvanceRulesForm from '../components/advance/AdvanceRulesForm';
import { suggestPlayoffFormat } from '../services/advance.service';
import useAdvanceRules from '../components/advance/useAdvanceRules';

/**
 * TournamentSetupPage - Unified page for configuring tournament rules and settings
 * Adapts based on tournament type (Single Elimination vs Pool Play + Playoffs)
 */
export default function TournamentSetupPage() {
  const { draftId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [actualPools, setActualPools] = useState([]);

  // Pool Play configuration (only used for pool_play_bracket type)
  const [poolConfig, setPoolConfig] = useState({
    numPools: DEFAULT_POOL_CONFIG.numPools,
    pointsPerWin: DEFAULT_POOL_CONFIG.pointsPerWin,
    pointsPerLoss: DEFAULT_POOL_CONFIG.pointsPerLoss,
    advancePerPool: DEFAULT_POOL_CONFIG.advancePerPool,
    advancePerPoolCustom: null, // Object: { poolA: 2, poolB: 3, ... }
    poolMatchRules: { ...DEFAULT_POOL_CONFIG.poolMatchRules },
  });

  // Team seeding hook
  const {
    seededTeams,
    updateTeams,
    resetAlphabetically,
    randomize,
    saveSeedOrder,
  } = useSeeding(draftId, draft?.seedOrder || draft?.teams || []);

  const isPoolPlayTournament = draft?.type === TOURNAMENT_TYPE.POOL_PLAY_BRACKET;

  // Calculate pool sizes - handles uneven distribution
  const poolSizes = useMemo(() => {
    if (!isPoolPlayTournament || !draft) return [];

    const totalTeams = draft.teams.length;
    const numPools = poolConfig.numPools;
    const baseSize = Math.floor(totalTeams / numPools);
    const remainder = totalTeams % numPools;

    // First 'remainder' pools get an extra team
    const sizes = [];
    for (let i = 0; i < numPools; i++) {
      sizes.push(i < remainder ? baseSize + 1 : baseSize);
    }
    return sizes;
  }, [isPoolPlayTournament, draft, poolConfig.numPools]);

  // Calculate teams per pool for display (backward compatibility)
  const teamsPerPool = poolSizes.length > 0 ? Math.min(...poolSizes) : 0;

  const totalAdvancing = useMemo(() => {
    if (!isPoolPlayTournament || !draft) return 0;

    // If custom advancement is set, sum up all custom values
    if (poolConfig.advancePerPoolCustom) {
      return Object.values(poolConfig.advancePerPoolCustom).reduce((sum, val) => sum + parseInt(val || 0), 0);
    }

    // Otherwise use uniform advancement
    return poolConfig.numPools * poolConfig.advancePerPool;
  }, [isPoolPlayTournament, draft, poolConfig.numPools, poolConfig.advancePerPool, poolConfig.advancePerPoolCustom]);

  // Bracket rules hook for playoff matches
  const numPlayoffTeams = isPoolPlayTournament && draft
    ? totalAdvancing
    : draft?.teams.length || 0;

  const {
    rules: playoffRules,
    rounds: playoffRounds,
    isValid: rulesValid,
    errors: rulesErrors,
    updateRoundRules,
    validateRules,
    resetRules: resetPlayoffRules,
    applyTemplate,
  } = useBracketRules(numPlayoffTeams, null);

  // Use advance rules hook (only after draft is loaded)
  const {
    advanceRules,
    updateFormat,
  } = useAdvanceRules(
    draftId,
    isPoolPlayTournament && draft ? totalAdvancing : (draft?.teams?.length || 0),
    isEditMode
  );

  // Calculate playoff format suggestion (recalculate when totalAdvancing changes)
  const playoffSuggestion = useMemo(() => {
    return isPoolPlayTournament && totalAdvancing > 0
      ? suggestPlayoffFormat(totalAdvancing)
      : null;
  }, [isPoolPlayTournament, totalAdvancing]);

  useEffect(() => {
    const editMode = searchParams.get('edit') === 'true';
    setIsEditMode(editMode);
    loadDraft(editMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, searchParams]);

  const loadDraft = async (editMode = false) => {
    try {
      setLoading(true);

      if (editMode) {
        // Edit mode: Load existing tournament
        const tournamentData = await getTournamentById(draftId);

        if (!tournamentData) {
          setError('Tournament not found.');
          setLoading(false);
          return;
        }

        // Verify that the current user has permission (is admin of the org)
        if (!isAdmin) {
          setError('You do not have permission to edit this tournament.');
          setLoading(false);
          return;
        }

        // Convert tournament to draft-like format for the form
        setDraft({
          ...tournamentData,
          seedOrder: tournamentData.seedOrder || tournamentData.teams,
        });

        // Load pool config if it's a pool play tournament
        if (tournamentData.type === TOURNAMENT_TYPE.POOL_PLAY_BRACKET && tournamentData.poolConfig) {
          setPoolConfig(tournamentData.poolConfig);

          // Load actual pools to get correct pool IDs and order
          try {
            const pools = await getPools(draftId);
            setActualPools(pools);
          } catch (err) {
            console.error('Error loading pools:', err);
          }
        }

        setLoading(false);
      } else {
        // Draft mode: Load draft
        const draftData = await getTournamentDraft(draftId);

        if (!draftData) {
          setError('Draft not found. It may have already been used or deleted.');
          setLoading(false);
          return;
        }

        // Verify that the current user created this draft
        if (draftData.createdBy !== user.uid) {
          setError('You do not have permission to edit this draft.');
          setLoading(false);
          return;
        }

        setDraft(draftData);
        setLoading(false);
      }
    } catch (err) {
      console.error('Error loading draft:', err);
      setError('Failed to load tournament draft.');
      setLoading(false);
    }
  };

  // Pool configuration handlers
  const handlePoolConfigChange = (field, value) => {
    // For advancePerPoolCustom, the value is already an object, don't parse it
    if (field === 'advancePerPoolCustom') {
      setPoolConfig((prev) => ({ ...prev, [field]: value }));
    } else {
      setPoolConfig((prev) => ({ ...prev, [field]: parseInt(value, 10) }));
    }
  };

  const handlePoolMatchRulesChange = (field, value) => {
    setPoolConfig((prev) => ({
      ...prev,
      poolMatchRules: { ...prev.poolMatchRules, [field]: parseInt(value, 10) },
    }));
  };

  // Team seeding handlers
  const handleSeedingReorder = (reorderedTeams) => {
    updateTeams(reorderedTeams);
    saveSeedOrder(reorderedTeams).catch((err) => {
      console.error('Failed to save seed order:', err);
    });
  };

  const handleResetAlphabetically = () => {
    const sorted = resetAlphabetically();
    saveSeedOrder(sorted).catch((err) => {
      console.error('Failed to save seed order:', err);
    });
  };

  const handleRandomize = () => {
    const shuffled = randomize();
    saveSeedOrder(shuffled).catch((err) => {
      console.error('Failed to save seed order:', err);
    });
  };

  // Create or update tournament handler
  const handleCreateTournament = async (e) => {
    e.preventDefault();
    setError('');

    // Validate playoff rules
    if (!validateRules()) {
      setError('Please fix validation errors in match rules');
      return;
    }

    try {
      setCreating(true);

      if (isEditMode) {
        // Edit mode: Update existing tournament configuration
        const updates = {};

        if (isPoolPlayTournament) {
          updates.poolConfig = poolConfig;
          updates.playoffConfig = { matchRules: playoffRules };
        } else {
          updates.matchRules = playoffRules;
        }

        // Save advance rules if they exist
        if (draft.advanceRules) {
          updates.advanceRules = draft.advanceRules;
        }

        await updateTournament(draftId, updates);

        navigate(`/tournament/${draftId}`, {
          state: { message: 'Tournament configuration updated successfully!' },
        });
      } else {
        // Create mode: Create new tournament from draft
        if (isPoolPlayTournament) {
          // Pool Play + Playoffs validation
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

          // No longer require power of 2 - advance rules handle any number of teams

          // Create pool play tournament
          const playoffConfig = { matchRules: playoffRules };
          const tournamentId = await createPoolPlayTournamentFromDraft(
            draftId,
            poolConfig,
            playoffConfig
          );

          navigate(`/tournament/${tournamentId}`, {
            state: { message: 'Pool play tournament created successfully!' },
          });
        } else {
          // Single Elimination tournament
          const tournamentId = await createTournamentFromDraft(draftId, playoffRules);
          navigate(`/tournament/${tournamentId}`);
        }
      }
    } catch (err) {
      console.error('Error creating tournament:', err);
      setError(err.message || `Failed to ${isEditMode ? 'update' : 'create'} tournament`);
      setCreating(false);
    }
  };

  const handleCancel = async () => {
    try {
      if (!isEditMode) {
        await deleteTournamentDraft(draftId);
      }
      navigate(isEditMode ? `/tournament/${draftId}` : '/admin');
    } catch (err) {
      console.error('Error cancelling:', err);
      navigate(isEditMode ? `/tournament/${draftId}` : '/admin');
    }
  };

  // Redirect if not admin
  if (!isAdmin) {
    navigate('/');
    return null;
  }

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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isEditMode
              ? (isPoolPlayTournament ? 'Edit Pool Play & Playoff Configuration' : 'Edit Tournament Configuration')
              : (isPoolPlayTournament ? 'Configure Pool Play & Playoffs' : 'Configure Tournament')}
          </h1>
          <p className="text-gray-600">
            Set up rules and settings for: <span className="font-semibold">{draft.name}</span>
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
              <span className="font-medium">Type:</span>{' '}
              {isPoolPlayTournament ? 'Pool Play + Playoffs' : 'Playoffs Bracket'}
            </div>
          </div>
        </div>

        <form onSubmit={handleCreateTournament} className="space-y-6">
          {/* Pool Configuration (only for pool play tournaments) */}
          {isPoolPlayTournament && (
            <>
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
                    {poolSizes.length > 0 && (
                      <div className="text-xs text-gray-600 mt-2 space-y-1">
                        {poolSizes.every(size => size === poolSizes[0]) ? (
                          <p className="text-gray-500">{poolSizes[0]} teams per pool</p>
                        ) : (
                          <>
                            <p className="font-medium text-amber-700">⚠ Uneven pool distribution:</p>
                            {poolSizes.map((size, idx) => (
                              <p key={idx} className="text-gray-600">
                                • Pool {String.fromCharCode(65 + idx)}: {size} teams
                              </p>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teams Advancing Per Pool
                    </label>
                    {poolSizes.length > 0 && poolSizes.every(size => size === poolSizes[0]) ? (
                      // Uniform pool sizes - single input
                      <>
                        <input
                          type="number"
                          min="1"
                          max={teamsPerPool}
                          value={poolConfig.advancePerPool}
                          onChange={(e) => handlePoolConfigChange('advancePerPool', e.target.value)}
                          className="input-field"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Total advancing: {totalAdvancing} teams (max {teamsPerPool} per pool)
                        </p>
                      </>
                    ) : (
                      // Uneven pool sizes - per-pool inputs
                      <div className="space-y-2">
                        {(isEditMode && actualPools.length > 0 ? actualPools : poolSizes.map((size, idx) => ({
                          id: `pool_${String.fromCharCode(65 + idx)}`,
                          name: `Pool ${String.fromCharCode(65 + idx)}`,
                          teams: { length: size }
                        }))).map((pool, idx) => {
                          const poolId = pool.id;
                          const poolName = pool.name;
                          const size = pool.teams?.length || poolSizes[idx];
                          const customValue = poolConfig.advancePerPoolCustom?.[poolId] ?? poolConfig.advancePerPool;

                          return (
                            <div key={poolId} className="flex items-center gap-2">
                              <label className="text-sm text-gray-700 w-20">{poolName}:</label>
                              <input
                                type="number"
                                min="1"
                                max={size}
                                value={customValue}
                                onChange={(e) => {
                                  const newCustom = { ...(poolConfig.advancePerPoolCustom || {}) };
                                  newCustom[poolId] = parseInt(e.target.value) || 1;
                                  handlePoolConfigChange('advancePerPoolCustom', newCustom);
                                }}
                                className="input-field flex-1"
                              />
                              <span className="text-xs text-gray-500 w-24">of {size} teams</span>
                            </div>
                          );
                        })}
                        <p className="text-xs text-gray-500 mt-2">
                          Total advancing: {totalAdvancing} teams
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Playoff Format Suggestion */}
                {playoffSuggestion && playoffSuggestion.suggestion !== 'none' && (
                  <div className="mt-6 space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-blue-900 mb-2">Playoff Format Suggestion</h4>
                      <p className="text-sm text-blue-800 mb-2">
                        <strong>Recommended: {playoffSuggestion.suggestion === 'byes' ? 'Auto-Byes' : 'Play-In Matches'}</strong>
                      </p>
                      <div className="text-xs text-blue-700 font-mono space-y-1">
                        <div>Byes: {playoffSuggestion.byes} teams skip Round 1</div>
                        <div>Play-In Teams: {playoffSuggestion.playIns} teams play extra matches</div>
                        <div>Lower Bracket: {playoffSuggestion.lower} teams</div>
                        <div>Upper Bracket: {playoffSuggestion.higher} teams</div>
                      </div>
                      <p className="text-xs text-blue-700 mt-2">
                        {playoffSuggestion.suggestion === 'play-in'
                          ? `Play-in is suggested because it impacts fewer teams (${playoffSuggestion.playIns} vs ${playoffSuggestion.byes} idle).`
                          : `Byes are suggested because it impacts fewer teams (${playoffSuggestion.byes} idle vs ${playoffSuggestion.playIns} playing extra).`}
                      </p>
                    </div>

                    <div>
                      <label htmlFor="playoffFormat" className="block text-sm font-medium text-gray-700 mb-2">
                        Playoff Format
                      </label>
                      <select
                        id="playoffFormat"
                        value={advanceRules?.formatChosen || playoffSuggestion.suggestion}
                        onChange={(e) => updateFormat(e.target.value)}
                        className="input-field w-full md:w-64"
                      >
                        <option value="byes">Auto-Byes (Top Seeds Skip Round 1)</option>
                        <option value="play-in">Play-In Matches (Lowest Seeds Play Extra)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        You can override the suggested format if needed
                      </p>
                    </div>

                    {/* Format Explanation */}
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-2">
                      <h5 className="font-semibold text-gray-900">Format Explanation:</h5>
                      <div>
                        <strong>Auto-Byes:</strong> The top {playoffSuggestion.byes} seeded teams automatically advance to Round 2.
                        The remaining {totalAdvancing - playoffSuggestion.byes} teams play in Round 1.
                      </div>
                      <div>
                        <strong>Play-In Matches:</strong> The lowest {playoffSuggestion.playIns} seeded teams play {playoffSuggestion.playIns / 2} play-in
                        matches. Winners advance to join the top seeds in the main bracket.
                      </div>
                    </div>
                  </div>
                )}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Win By</label>
                    <input
                      type="number"
                      min="1"
                      value={poolConfig.poolMatchRules.winBy}
                      onChange={(e) => handlePoolMatchRulesChange('winBy', e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cap</label>
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
                      Team records based on sets won/lost
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Playoff Match Rules */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <BracketRulesSection
              rounds={playoffRounds}
              rules={playoffRules}
              errors={rulesErrors}
              onRulesChange={updateRoundRules}
              onApplyTemplate={applyTemplate}
              onReset={resetPlayoffRules}
              disabled={creating}
            />
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

          {/* Advance Rules (for single elimination only) */}
          {!isPoolPlayTournament && (
            <CollapsibleCard
              title="Bracket Advancement Rules"
              summary={`${draft?.teams?.length || 0} teams in bracket`}
              defaultExpanded={true}
            >
              <AdvanceRulesForm
                draftId={draftId}
                defaultNumTeams={draft?.teams?.length || 0}
              />
            </CollapsibleCard>
          )}

          {/* Summary */}
          {isPoolPlayTournament && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">Tournament Summary</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>
                  • {poolConfig.numPools} pools with ~{teamsPerPool} teams each
                </li>
                <li>
                  • {poolConfig.advancePerPoolCustom && Object.keys(poolConfig.advancePerPoolCustom).length > 0
                    ? `Custom advancement per pool (${totalAdvancing} total)`
                    : `Top ${poolConfig.advancePerPool} from each pool advance (${totalAdvancing} total)`}
                </li>
                <li>
                  • Pool matches: {poolConfig.poolMatchRules.numSets} sets per match, first to{' '}
                  {poolConfig.poolMatchRules.firstTo}
                </li>
                <li>
                  • Playoff bracket: {totalAdvancing}-team {playoffSuggestion?.suggestion === 'play-in' ? 'with play-ins' : 'with byes'}
                </li>
              </ul>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={creating}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !rulesValid}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating
                ? (isEditMode ? 'Saving Changes...' : 'Creating Tournament...')
                : (isEditMode ? 'Save Configuration' : 'Create Tournament')}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

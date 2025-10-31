import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import {
  getTournamentDraft,
  createTournamentFromDraft,
  createPoolPlayTournamentFromDraft,
  deleteTournamentDraft,
} from '../services/tournament.service';
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
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Pool Play configuration (only used for pool_play_bracket type)
  const [poolConfig, setPoolConfig] = useState({
    numPools: DEFAULT_POOL_CONFIG.numPools,
    pointsPerWin: DEFAULT_POOL_CONFIG.pointsPerWin,
    pointsPerLoss: DEFAULT_POOL_CONFIG.pointsPerLoss,
    advancePerPool: DEFAULT_POOL_CONFIG.advancePerPool,
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

  // Calculate teams per pool and total advancing (recalculate when dependencies change)
  const teamsPerPool = useMemo(() => {
    return isPoolPlayTournament && draft
      ? Math.floor(draft.teams.length / poolConfig.numPools)
      : 0;
  }, [isPoolPlayTournament, draft, poolConfig.numPools]);

  const totalAdvancing = useMemo(() => {
    return isPoolPlayTournament && draft
      ? poolConfig.numPools * poolConfig.advancePerPool
      : 0;
  }, [isPoolPlayTournament, draft, poolConfig.numPools, poolConfig.advancePerPool]);

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
    isPoolPlayTournament && draft ? totalAdvancing : (draft?.teams?.length || 0)
  );

  // Calculate playoff format suggestion (recalculate when totalAdvancing changes)
  const playoffSuggestion = useMemo(() => {
    return isPoolPlayTournament && totalAdvancing > 0
      ? suggestPlayoffFormat(totalAdvancing)
      : null;
  }, [isPoolPlayTournament, totalAdvancing]);

  useEffect(() => {
    loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  const loadDraft = async () => {
    try {
      setLoading(true);
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
    } catch (err) {
      console.error('Error loading draft:', err);
      setError('Failed to load tournament draft.');
      setLoading(false);
    }
  };

  // Pool configuration handlers
  const handlePoolConfigChange = (field, value) => {
    setPoolConfig((prev) => ({ ...prev, [field]: parseInt(value, 10) }));
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

  // Create tournament handler
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
    } catch (err) {
      console.error('Error creating tournament:', err);
      setError(err.message || 'Failed to create tournament');
      setCreating(false);
    }
  };

  const handleCancel = async () => {
    try {
      await deleteTournamentDraft(draftId);
      navigate('/admin');
    } catch (err) {
      console.error('Error cancelling:', err);
      navigate('/admin');
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
            {isPoolPlayTournament ? 'Configure Pool Play & Playoffs' : 'Configure Tournament'}
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
                    <p className="text-xs text-gray-500 mt-1">~{teamsPerPool} teams per pool</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teams Advancing Per Pool
                    </label>
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
                  • Top {poolConfig.advancePerPool} from each pool advance ({totalAdvancing} total)
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
              {creating ? 'Creating Tournament...' : 'Create Tournament'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

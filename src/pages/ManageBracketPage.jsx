import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getTournamentDraft,
  createTournamentFromDraft,
  deleteTournamentDraft,
} from '../services/tournament.service';
import BracketRulesForm from '../components/bracketRules/BracketRulesForm';

/**
 * ManageBracketPage - Page for configuring match rules before finalizing tournament
 */
export default function ManageBracketPage() {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Load draft on mount
  useEffect(() => {
    if (!draftId) {
      setError('Invalid draft ID');
      setLoading(false);
      return;
    }

    loadDraft();
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
    } catch (err) {
      console.error('Error loading draft:', err);
      setError('Failed to load tournament draft.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (matchRules) => {
    try {
      setCreating(true);
      setError('');

      const tournamentId = await createTournamentFromDraft(draftId, matchRules);

      // Navigate to the newly created tournament
      navigate(`/tournament/${tournamentId}`);
    } catch (err) {
      console.error('Error creating tournament:', err);
      setError(err.message || 'Failed to create tournament');
      setCreating(false);
    }
  };

  const handleCancel = async () => {
    try {
      // Delete the draft
      await deleteTournamentDraft(draftId);
      navigate('/admin');
    } catch (err) {
      console.error('Error cancelling:', err);
      // Navigate anyway
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tournament draft...</p>
        </div>
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Error</h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <button onClick={() => navigate('/admin')} className="btn-primary w-full">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-600">
            <li>
              <button onClick={() => navigate('/admin')} className="hover:text-primary-600">
                Dashboard
              </button>
            </li>
            <li>
              <span className="mx-2">/</span>
            </li>
            <li>
              <button onClick={() => navigate('/tournaments/create')} className="hover:text-primary-600">
                Create Tournament
              </button>
            </li>
            <li>
              <span className="mx-2">/</span>
            </li>
            <li className="text-gray-900 font-medium">Manage Bracket</li>
          </ol>
        </nav>

        {/* Tournament Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{draft.name}</h1>
          {draft.description && <p className="text-gray-600 mb-4">{draft.description}</p>}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {draft.teams.length} Teams
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {Math.ceil(Math.log2(draft.teams.length))} Rounds
            </span>
          </div>
        </div>

        {/* Bracket Rules Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <BracketRulesForm
            numTeams={draft.teams.length}
            initialRules={null}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={creating}
          />
        </div>
      </div>
    </div>
  );
}

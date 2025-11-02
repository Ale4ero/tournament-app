import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTournamentDraft } from '../../services/tournament.service';
import { useAuth } from '../../contexts/AuthContext';
import { TOURNAMENT_TYPE } from '../../utils/constants';

export default function TournamentForm({ onSuccess }) {
  const { user, organizationId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: TOURNAMENT_TYPE.SINGLE_ELIMINATION,
    startDate: '',
    endDate: '',
    teams: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Parse teams
      const teams = formData.teams
        .split('\n')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (teams.length < 2) {
        setError('Please enter at least 2 teams (one per line)');
        setLoading(false);
        return;
      }

      // No longer require power of 2 - flexible playoff advancement handles any team count

      const draftData = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        startDate: formData.startDate ? new Date(formData.startDate).getTime() : Date.now(),
        teams,
      };

      // Only include endDate if it's provided
      if (formData.endDate) {
        draftData.endDate = new Date(formData.endDate).getTime();
      }

      // Create draft and redirect to setup page
      const draftId = await createTournamentDraft(draftData, user.uid, organizationId);
      navigate(`/tournaments/setup/${draftId}`);
    } catch (err) {
      setError(err.message || 'Failed to create tournament draft');
      console.error('Create tournament draft error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Tournament Name *
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          required
          className="input-field placeholder:text-gray-400"
          placeholder="Tournament Name"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="input-field placeholder:text-gray-400"
          placeholder="Optional description of the tournament..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
            Tournament Type
          </label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="input-field"
          >
            <option value={TOURNAMENT_TYPE.SINGLE_ELIMINATION}>Single Elimination</option>
            <option value={TOURNAMENT_TYPE.POOL_PLAY_BRACKET}>Pool Play + Single Elimination</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
            Start Date
          </label>
          <input
            id="startDate"
            name="startDate"
            type="datetime-local"
            value={formData.startDate}
            onChange={handleChange}
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
            End Date (Optional)
          </label>
          <input
            id="endDate"
            name="endDate"
            type="datetime-local"
            value={formData.endDate}
            onChange={handleChange}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label htmlFor="teams" className="block text-sm font-medium text-gray-700 mb-2">
          Teams (one per line) *
        </label>
        <textarea
          id="teams"
          name="teams"
          value={formData.teams}
          onChange={handleChange}
          rows={8}
          required
          className="input-field font-mono text-sm placeholder:text-gray-400"
          placeholder="Team Alpha&#10;Team Bravo&#10;Team Charlie&#10;Team Delta&#10;..."
        />
        <p className="text-xs text-gray-500 mt-1">
          {formData.type === TOURNAMENT_TYPE.SINGLE_ELIMINATION
            ? 'Any number of teams (system will handle byes or play-ins automatically)'
            : 'Any number of teams (will be distributed across pools)'}
        </p>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? 'Saving...'
            : formData.type === TOURNAMENT_TYPE.POOL_PLAY_BRACKET
            ? 'Configure Pools'
            : 'Manage Bracket'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createOrganization, getAllOrganizations, addAdminToOrganization } from '../../services/organization.service';

export default function OrganizationForm() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // 'create' or 'join'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [organizations, setOrganizations] = useState([]);

  // Create mode state
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');

  // Join mode state
  const [selectedOrgId, setSelectedOrgId] = useState('');

  const handleModeSelect = async (selectedMode) => {
    setMode(selectedMode);
    setError('');

    if (selectedMode === 'join') {
      // Fetch available organizations
      setLoading(true);
      try {
        const orgs = await getAllOrganizations();
        setOrganizations(orgs);
      } catch (err) {
        setError('Failed to load organizations');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCreateOrganization = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const orgId = await createOrganization(
        { name: orgName, description: orgDescription },
        user.uid
      );
      console.log('Organization created:', orgId);

      // Refresh user data to get the new organizationId
      await refreshUser();

      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinOrganization = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await addAdminToOrganization(selectedOrgId, user.uid);
      console.log('Joined organization:', selectedOrgId);

      // Refresh user data to get the new organizationId
      await refreshUser();

      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Failed to join organization');
    } finally {
      setLoading(false);
    }
  };

  if (!mode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary-600 mb-2">VolleyFlow</h1>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h2>
            <p className="text-gray-600">
              To get started, create a new organization or join an existing one
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => handleModeSelect('create')}
              className="card hover:shadow-lg transition-shadow cursor-pointer text-left"
            >
              <div className="text-center">
                <div className="text-4xl mb-4">🏢</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Create Organization
                </h3>
                <p className="text-gray-600 text-sm">
                  Start your own volleyball organization and invite admins to help manage tournaments
                </p>
              </div>
            </button>

            <button
              onClick={() => handleModeSelect('join')}
              className="card hover:shadow-lg transition-shadow cursor-pointer text-left"
            >
              <div className="text-center">
                <div className="text-4xl mb-4">👥</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Join Organization
                </h3>
                <p className="text-gray-600 text-sm">
                  Join an existing organization to help manage their tournaments
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Organization</h1>
            <p className="text-gray-600">Set up your volleyball organization</p>
          </div>

          <div className="card">
            <form onSubmit={handleCreateOrganization} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name *
                </label>
                <input
                  id="orgName"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                  className="input-field placeholder:text-gray-400"
                  placeholder="Orlando Beach Volleyball Club"
                />
              </div>

              <div>
                <label htmlFor="orgDescription" className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  id="orgDescription"
                  value={orgDescription}
                  onChange={(e) => setOrgDescription(e.target.value)}
                  rows={3}
                  className="input-field placeholder:text-gray-400"
                  placeholder="Describe your organization..."
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Organization'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="btn-secondary"
                >
                  Back
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Organization</h1>
            <p className="text-gray-600">Select an organization to join</p>
          </div>

          <div className="card">
            <form onSubmit={handleJoinOrganization} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="text-center py-4 text-gray-600">Loading organizations...</div>
              ) : organizations.length === 0 ? (
                <div className="text-center py-4 text-gray-600">
                  No organizations available. Create your own!
                </div>
              ) : (
                <div>
                  <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Organization *
                  </label>
                  <select
                    id="organization"
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    required
                    className="input-field"
                  >
                    <option value="">Choose an organization...</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading || !selectedOrgId}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Joining...' : 'Join Organization'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="btn-secondary"
                >
                  Back
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

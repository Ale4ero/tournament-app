import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../hooks/useOrganization';
import { subscribeTournamentsByOrganization } from '../../services/tournament.service';
import { getAllPendingSubmissions } from '../../services/match.service';
import TournamentCard from '../tournament/TournamentCard';

export default function AdminDashboard() {
  const { organizationId } = useAuth();
  const { organization, loading: orgLoading } = useOrganization(organizationId);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!organizationId) return;

    const unsubscribe = subscribeTournamentsByOrganization(organizationId, (data) => {
      setTournaments(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [organizationId]);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const pending = await getAllPendingSubmissions();
        setPendingCount(pending.length);
      } catch (error) {
        console.error('Error fetching pending submissions:', error);
      }
    };

    fetchPending();
    // Refresh every 10 seconds
    const interval = setInterval(fetchPending, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          {organization && (
            <p className="text-gray-600 mt-1">{organization.name}</p>
          )}
        </div>
        <Link to="/admin/tournament/create" className="btn-primary">
          + Create Tournament
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Tournaments</h3>
          <p className="text-3xl font-bold text-primary-600">{tournaments.length}</p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Live Tournaments</h3>
          <p className="text-3xl font-bold text-green-600">
            {tournaments.filter((t) => t.status === 'live').length}
          </p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Pending Submissions</h3>
          <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
      </div>

      {/* Pending Submissions Alert */}
      {pendingCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600 text-xl">⚠️</span>
            <div>
              <p className="font-medium text-yellow-800">
                You have {pendingCount} pending score {pendingCount === 1 ? 'submission' : 'submissions'}
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Review them by visiting the respective match pages
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Tournaments */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">All Tournaments</h2>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-600">Loading tournaments...</div>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600 text-lg mb-4">No tournaments yet</p>
            <Link to="/admin/tournament/create" className="btn-primary">
              Create Your First Tournament
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import TournamentForm from '../components/tournament/TournamentForm';

export default function CreateTournamentPage() {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Tournament</h1>
          <p className="text-gray-600">Set up a new volleyball tournament</p>
        </div>

        <div className="card">
          <TournamentForm />
        </div>
      </div>
    </Layout>
  );
}

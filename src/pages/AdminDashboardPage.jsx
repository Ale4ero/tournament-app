import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import AdminDashboard from '../components/admin/AdminDashboard';

export default function AdminDashboardPage() {
  const { user, loading, isAdmin, hasOrganization } = useAuth();

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

  // Redirect to organization setup if user doesn't have an organization
  if (!hasOrganization) {
    return <Navigate to="/organization/setup" replace />;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminDashboard />
      </div>
    </Layout>
  );
}

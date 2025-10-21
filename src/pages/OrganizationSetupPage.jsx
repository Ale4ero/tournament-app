import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OrganizationForm from '../components/organization/OrganizationForm';

export default function OrganizationSetupPage() {
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

  // If user already has an organization, redirect to admin dashboard
  if (hasOrganization) {
    return <Navigate to="/admin" replace />;
  }

  return <OrganizationForm />;
}

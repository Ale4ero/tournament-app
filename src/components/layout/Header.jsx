import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary-600">🏐 VolleyFlow</span>
          </Link>

          <nav className="flex items-center space-x-4">
            <Link to="/" className="text-gray-700 hover:text-primary-600 font-medium">
              Tournaments
            </Link>

            {isAdmin ? (
              <>
                <Link
                  to="/admin"
                  className="text-gray-700 hover:text-primary-600 font-medium"
                >
                  Admin Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="btn-secondary text-sm"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-primary text-sm">
                Admin Login
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

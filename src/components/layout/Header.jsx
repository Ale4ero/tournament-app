import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      setMobileMenuOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const getLinkClassName = (path) => {
    const baseClasses = "font-medium transition-colors pb-1 border-b-2";
    if (isActive(path)) {
      return `${baseClasses} text-primary-600 border-primary-600`;
    }
    return `${baseClasses} text-gray-700 hover:text-primary-600 border-transparent`;
  };

  const getMobileLinkClassName = (path) => {
    const baseClasses = "block px-4 py-3 text-base font-medium transition-colors border-l-4";
    if (isActive(path)) {
      return `${baseClasses} text-primary-600 bg-primary-50 border-primary-600`;
    }
    return `${baseClasses} text-gray-700 hover:text-primary-600 hover:bg-gray-50 border-transparent`;
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white shadow-sm relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
            <span className="text-xl sm:text-2xl font-bold text-primary-600">🏐 VolleyFlow</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            <Link to="/" className={getLinkClassName('/')}>
              Tournaments
            </Link>

            {isAdmin ? (
              <>
                <Link
                  to="/admin"
                  className={getLinkClassName('/admin')}
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

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-x-0 top-16 bottom-0 z-40 md:hidden"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
            onClick={closeMobileMenu}
          />

          {/* Slide-out Menu */}
          <div className="fixed top-16 right-0 bottom-0 w-64 bg-white shadow-xl z-50 md:hidden transform transition-transform duration-300 ease-in-out">
            <nav className="flex flex-col py-2">
              <Link
                to="/"
                className={getMobileLinkClassName('/')}
                onClick={closeMobileMenu}
              >
                Tournaments
              </Link>

              {isAdmin ? (
                <>
                  <Link
                    to="/admin"
                    className={getMobileLinkClassName('/admin')}
                    onClick={closeMobileMenu}
                  >
                    Admin Dashboard
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="text-left px-4 py-3 text-base font-medium text-red-600 hover:bg-red-50 border-l-4 border-transparent hover:border-red-600 transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className={getMobileLinkClassName('/login')}
                  onClick={closeMobileMenu}
                >
                  Admin Login
                </Link>
              )}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}

import { createContext, useContext, useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { auth, database } from '../services/firebase';
import { DB_PATHS } from '../utils/constants';
import { onAuthStateChange, signInAdmin, signUpAdmin, signOutUser } from '../services/auth.service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((userData) => {
      setUser(userData);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const refreshUser = async () => {
    // Force a refresh of the current user's data from database
    const currentUser = auth.currentUser;
    if (currentUser) {
      const userRef = ref(database, `${DB_PATHS.USERS}/${currentUser.uid}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          role: userData.role,
          organizationId: userData.organizationId || null,
        });
      }
    }
  };

  const signIn = async (email, password) => {
    try {
      const userData = await signInAdmin(email, password);
      setUser(userData);
      return userData;
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (email, password) => {
    try {
      const userData = await signUpAdmin(email, password);
      setUser(userData);
      return userData;
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await signOutUser();
      setUser(null);
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUser,
    isAdmin: user?.role === 'admin',
    organizationId: user?.organizationId || null,
    hasOrganization: !!user?.organizationId,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

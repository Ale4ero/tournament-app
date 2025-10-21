import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, database } from './firebase';
import { DB_PATHS, USER_ROLE } from '../utils/constants';

/**
 * Sign in admin user
 * @param {string} email - Admin email
 * @param {string} password - Admin password
 * @returns {Promise<Object>} User object with role
 */
export async function signInAdmin(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Verify user is an admin
    const userRef = ref(database, `${DB_PATHS.USERS}/${user.uid}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      await signOut(auth);
      throw new Error('User not found in database');
    }

    const userData = snapshot.val();
    if (userData.role !== USER_ROLE.ADMIN) {
      await signOut(auth);
      throw new Error('Unauthorized: Admin access required');
    }

    return {
      uid: user.uid,
      email: user.email,
      role: userData.role,
    };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

/**
 * Sign out current user
 * @returns {Promise<void>}
 */
export async function signOutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

/**
 * Subscribe to auth state changes
 * @param {Function} callback - Callback function with user data
 * @returns {Function} Unsubscribe function
 */
export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Get user role from database
      const userRef = ref(database, `${DB_PATHS.USERS}/${user.uid}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();
        callback({
          uid: user.uid,
          email: user.email,
          role: userData.role,
        });
      } else {
        callback(null);
      }
    } else {
      callback(null);
    }
  });
}

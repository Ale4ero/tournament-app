import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { auth, database } from './firebase';
import { DB_PATHS, USER_ROLE } from '../utils/constants';

/**
 * Sign up new admin user
 * @param {string} email - Admin email
 * @param {string} password - Admin password
 * @returns {Promise<Object>} User object with role
 */
export async function signUpAdmin(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user profile in database
    await createUserProfile(user.uid, user.email);

    return {
      uid: user.uid,
      email: user.email,
      role: USER_ROLE.ADMIN,
      organizationId: null,
    };
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
}

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
      organizationId: userData.organizationId || null,
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
      // Get user role and organization from database
      const userRef = ref(database, `${DB_PATHS.USERS}/${user.uid}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();
        callback({
          uid: user.uid,
          email: user.email,
          role: userData.role,
          organizationId: userData.organizationId || null,
        });
      } else {
        callback(null);
      }
    } else {
      callback(null);
    }
  });
}

/**
 * Create initial user profile (called after signup)
 * @param {string} uid - User ID
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
export async function createUserProfile(uid, email) {
  try {
    const userRef = ref(database, `${DB_PATHS.USERS}/${uid}`);
    await set(userRef, {
      email,
      role: USER_ROLE.ADMIN,
      organizationId: null,
      createdAt: Date.now(),
    });
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}

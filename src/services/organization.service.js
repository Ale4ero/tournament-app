import { ref, push, set, get, update, remove, onValue } from 'firebase/database';
import { database } from './firebase';
import { DB_PATHS } from '../utils/constants';

/**
 * Create a new organization
 * @param {Object} organizationData - Organization data
 * @param {string} adminUid - Creator's UID
 * @returns {Promise<string>} Organization ID
 */
export async function createOrganization(organizationData, adminUid) {
  try {
    const orgRef = push(ref(database, DB_PATHS.ORGANIZATIONS));
    const orgId = orgRef.key;

    const organization = {
      id: orgId,
      name: organizationData.name,
      description: organizationData.description || '',
      createdBy: adminUid,
      createdAt: Date.now(),
      admins: {
        [adminUid]: true,
      },
    };

    await set(orgRef, organization);

    // Update user's organizationId
    const userRef = ref(database, `${DB_PATHS.USERS}/${adminUid}`);
    await update(userRef, {
      organizationId: orgId,
    });

    return orgId;
  } catch (error) {
    console.error('Error creating organization:', error);
    throw error;
  }
}

/**
 * Get organization by ID
 * @param {string} orgId - Organization ID
 * @returns {Promise<Object|null>} Organization object or null
 */
export async function getOrganizationById(orgId) {
  try {
    const orgRef = ref(database, `${DB_PATHS.ORGANIZATIONS}/${orgId}`);
    const snapshot = await get(orgRef);

    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error getting organization:', error);
    throw error;
  }
}

/**
 * Get all organizations (for join/selection)
 * @returns {Promise<Object[]>} Array of organizations
 */
export async function getAllOrganizations() {
  try {
    const orgsRef = ref(database, DB_PATHS.ORGANIZATIONS);
    const snapshot = await get(orgsRef);

    if (!snapshot.exists()) {
      return [];
    }

    const organizations = [];
    snapshot.forEach((child) => {
      organizations.push(child.val());
    });

    return organizations.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error getting organizations:', error);
    throw error;
  }
}

/**
 * Update organization
 * @param {string} orgId - Organization ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateOrganization(orgId, updates) {
  try {
    const orgRef = ref(database, `${DB_PATHS.ORGANIZATIONS}/${orgId}`);
    await update(orgRef, updates);
  } catch (error) {
    console.error('Error updating organization:', error);
    throw error;
  }
}

/**
 * Add admin to organization
 * @param {string} orgId - Organization ID
 * @param {string} adminUid - Admin UID to add
 * @returns {Promise<void>}
 */
export async function addAdminToOrganization(orgId, adminUid) {
  try {
    const adminRef = ref(database, `${DB_PATHS.ORGANIZATIONS}/${orgId}/admins/${adminUid}`);
    await set(adminRef, true);

    // Update user's organizationId
    const userRef = ref(database, `${DB_PATHS.USERS}/${adminUid}`);
    await update(userRef, {
      organizationId: orgId,
    });
  } catch (error) {
    console.error('Error adding admin to organization:', error);
    throw error;
  }
}

/**
 * Remove admin from organization
 * @param {string} orgId - Organization ID
 * @param {string} adminUid - Admin UID to remove
 * @returns {Promise<void>}
 */
export async function removeAdminFromOrganization(orgId, adminUid) {
  try {
    const adminRef = ref(database, `${DB_PATHS.ORGANIZATIONS}/${orgId}/admins/${adminUid}`);
    await remove(adminRef);

    // Remove organizationId from user
    const userRef = ref(database, `${DB_PATHS.USERS}/${adminUid}`);
    await update(userRef, {
      organizationId: null,
    });
  } catch (error) {
    console.error('Error removing admin from organization:', error);
    throw error;
  }
}

/**
 * Subscribe to organization updates
 * @param {string} orgId - Organization ID
 * @param {Function} callback - Callback function with organization data
 * @returns {Function} Unsubscribe function
 */
export function subscribeOrganization(orgId, callback) {
  const orgRef = ref(database, `${DB_PATHS.ORGANIZATIONS}/${orgId}`);
  return onValue(orgRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
}

/**
 * Check if user is admin of organization
 * @param {string} orgId - Organization ID
 * @param {string} adminUid - Admin UID
 * @returns {Promise<boolean>} True if user is admin
 */
export async function isAdminOfOrganization(orgId, adminUid) {
  try {
    const adminRef = ref(database, `${DB_PATHS.ORGANIZATIONS}/${orgId}/admins/${adminUid}`);
    const snapshot = await get(adminRef);
    return snapshot.exists();
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

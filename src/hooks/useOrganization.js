import { useState, useEffect } from 'react';
import { subscribeOrganization } from '../services/organization.service';

/**
 * Hook to subscribe to a single organization
 * @param {string} organizationId - Organization ID
 * @returns {Object} { organization, loading }
 */
export function useOrganization(organizationId) {
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeOrganization(organizationId, (data) => {
      setOrganization(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [organizationId]);

  return { organization, loading };
}

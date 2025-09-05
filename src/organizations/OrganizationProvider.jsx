import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { fetchUserOrganizations } from '../data/organizations';

const OrganizationContext = createContext(null);

export function OrganizationProvider({ children }) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user's organizations
  useEffect(() => {
    if (user) {
      loadOrganizations();
    } else {
      setOrganizations([]);
      setCurrentOrganization(null);
      setLoading(false);
    }
  }, [user]);

  // Set default organization when organizations are loaded
  useEffect(() => {
    if (organizations.length > 0 && !currentOrganization) {
      // Get the stored organization preference
      const storedOrgId = localStorage.getItem('currentOrganizationId');
      
      // If there's a stored preference, try to use it
      if (storedOrgId) {
        if (storedOrgId === 'personal') {
          // User explicitly chose personal context
          setCurrentOrganization(null);
          return;
        }
        
        const storedOrg = organizations.find(org => org.id === storedOrgId);
        if (storedOrg) {
          setCurrentOrganization(storedOrg);
          return;
        }
      }
      
      // No stored preference or invalid stored org - default to first organization
      setCurrentOrganization(organizations[0]);
    }
  }, [organizations, currentOrganization]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const data = await fetchUserOrganizations();
      setOrganizations(data);
    } catch (error) {
      console.error('Failed to load organizations:', error);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const switchOrganization = (organization) => {
    setCurrentOrganization(organization);
    if (organization) {
      localStorage.setItem('currentOrganizationId', organization.id);
    } else {
      // Store 'personal' to remember user's choice for personal context
      localStorage.setItem('currentOrganizationId', 'personal');
    }
  };

  const value = {
    organizations,
    currentOrganization,
    setCurrentOrganization: switchOrganization,
    loading,
    refetch: loadOrganizations,
    // Helper to check if user has personal context (no organization)
    isPersonalContext: currentOrganization === null,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
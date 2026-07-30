'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface OrgContextType {
  currentOrgId: string;
  setCurrentOrgId: (id: string) => void;
  organizations: Organization[];
  loading: boolean;
}

const OrganizationContext = createContext<OrgContextType>({
  currentOrgId: 'default-org',
  setCurrentOrgId: () => {},
  organizations: [],
  loading: true,
});

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [currentOrgId, setCurrentOrgId] = useState<string>('default-org');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrgs();
  }, []);

  const fetchOrgs = async () => {
    try {
      const res = await fetch('/api/organizations');
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data);
        if (data.length > 0 && !currentOrgId) {
          setCurrentOrgId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <OrganizationContext.Provider value={{ currentOrgId, setCurrentOrgId, organizations, loading }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export const useOrganization = () => useContext(OrganizationContext);
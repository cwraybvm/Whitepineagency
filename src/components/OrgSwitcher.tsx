'use client';

import React from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { Building2, ChevronDown } from 'lucide-react';

export default function OrgSwitcher() {
  const { currentOrgId, setCurrentOrgId, organizations, loading } = useOrganization();

  if (loading || organizations.length === 0) return null;

  return (
    <div className="relative flex items-center space-x-2 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl text-xs text-white">
      <Building2 className="w-4 h-4 text-emerald-400" />
      <select
        value={currentOrgId}
        onChange={(e) => setCurrentOrgId(e.target.value)}
        className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-2"
      >
        {organizations.map((org) => (
          <option key={org.id} value={org.id} className="bg-neutral-900 text-white">
            {org.name}
          </option>
        ))}
      </select>
    </div>
  );
}
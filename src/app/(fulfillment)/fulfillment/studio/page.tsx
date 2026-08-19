'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import ClientSelector, { ClientProvider, useClientSelector } from '@/components/ClientSelector';
import ContentStudio from '@/components/ContentStudio';

function StudioBody() {
  const { selectedClient, loading } = useClientSelector();

  return (
    <div className="px-6 pb-6 pt-[calc(max(24px,env(safe-area-inset-top))+8px)] md:px-8 md:pb-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-emerald-400" />
          <h1 className="text-xl font-bold text-white">Content Studio</h1>
        </div>
        <ClientSelector />
      </div>

      {!loading && !selectedClient ? (
        <div className="border border-white/10 rounded-2xl p-6 text-center text-gray-500">
          No clients yet — add one under Admin → Clients first.
        </div>
      ) : (
        <ContentStudio
          clientName={selectedClient?.name || 'Select a client'}
          organizationId={selectedClient?.id}
        />
      )}
    </div>
  );
}

function StudioWithClientParam() {
  const searchParams = useSearchParams();
  return (
    <ClientProvider initialClientId={searchParams.get('client') || undefined}>
      <StudioBody />
    </ClientProvider>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={null}>
      <StudioWithClientParam />
    </Suspense>
  );
}

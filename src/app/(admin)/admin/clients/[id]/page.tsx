'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import ClientMeetingsTab from '@/components/admin/clients/ClientMeetingsTab';
import ExpensesTab from '@/components/admin/clients/ExpensesTab';

interface ClientDetail {
  id: string;
  name: string;
  status: string;
}

type TabId = 'overview' | 'meetings' | 'expenses';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'meetings', label: 'Meeting Notes' },
  { id: 'expenses', label: 'Expenses' },
];

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('overview');

  useEffect(() => {
    fetch('/api/clients')
      .then((res) => res.json())
      .then((all: ClientDetail[]) => {
        setClient(all.find((c) => c.id === clientId) || null);
      })
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) {
    return (
      <div className="p-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-gray-400">
        Client not found. <Link href="/admin/clients" className="text-emerald-400 hover:underline">Back to clients</Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/clients" className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-white">{client.name}</h1>
        <span className="text-xs font-mono text-gray-500 uppercase">{client.status}</span>
      </div>

      <div className="flex gap-1 border-b border-white/10">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
              tab === t.id ? 'border-emerald-500 text-white' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="text-gray-400 text-sm">Client ID: {client.id}</div>
      )}
      {tab === 'meetings' && <ClientMeetingsTab clientId={client.id} />}
      {tab === 'expenses' && <ExpensesTab clientId={client.id} />}
    </div>
  );
}

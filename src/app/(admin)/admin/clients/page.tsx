'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Loader2 } from 'lucide-react';

interface ClientRow {
  id: string;
  name: string;
  status: string;
}

export default function ClientsListPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/clients')
      .then((res) => res.json())
      .then(setClients)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="w-6 h-6 text-emerald-400" />
        <h1 className="text-xl font-bold text-white">Clients</h1>
      </div>

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      ) : (
        <div className="border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-400 font-mono text-xs uppercase">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="p-3">
                    <Link href={`/admin/clients/${c.id}`} className="text-emerald-400 hover:underline font-medium">
                      {c.name}
                    </Link>
                  </td>
                  <td className="p-3 text-gray-400">{c.status}</td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={2} className="p-6 text-center text-gray-500">
                    No clients yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

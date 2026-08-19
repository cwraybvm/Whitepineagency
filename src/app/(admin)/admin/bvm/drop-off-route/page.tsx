'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Truck, Search, MapPin, Loader2, ChevronUp, ChevronDown, Navigation, AlertTriangle } from 'lucide-react';
import { nearestNeighborOrder } from '@/lib/routeOptimizer';
import { buildGoogleMapsUrl, buildAppleMapsUrl, buildRouteSummary } from '@/lib/mapLinks';

interface Stop {
  id: string;
  businessName: string;
  contactName: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
}

export default function DropOffRoutePage() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [startAddress, setStartAddress] = useState('');
  const [startCoords, setStartCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    fetch('/api/bvm/drop-off-route')
      .then((res) => res.json())
      .then(setStops)
      .catch(() => toast.error('Failed to load drop-off stops'))
      .finally(() => setLoading(false));
  }, []);

  const filteredStops = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stops;
    return stops.filter(
      (s) =>
        s.businessName.toLowerCase().includes(q) ||
        (s.contactName || '').toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q)
    );
  }, [stops, search]);

  const stopsById = useMemo(() => new Map(stops.map((s) => [s.id, s])), [stops]);
  const selectedStops = useMemo(
    () => selectedIds.map((id) => stopsById.get(id)).filter((s): s is Stop => Boolean(s)),
    [selectedIds, stopsById]
  );

  function toggleStop(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function selectAll() {
    setSelectedIds(filteredStops.map((s) => s.id));
  }

  function clearAll() {
    setSelectedIds([]);
  }

  function moveStop(index: number, direction: -1 | 1) {
    setSelectedIds((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function optimizeRoute() {
    if (!startAddress.trim()) {
      toast.error('Enter a starting location first');
      return;
    }
    if (selectedStops.length < 2) {
      toast.error('Select at least 2 stops to optimize');
      return;
    }

    setOptimizing(true);
    try {
      let coords = startCoords;
      if (!coords) {
        const res = await fetch('/api/bvm/drop-off-route/geocode-start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: startAddress }),
        });
        if (!res.ok) throw new Error();
        coords = await res.json();
        setStartCoords(coords);
      }

      const ordered = nearestNeighborOrder(coords!, selectedStops);
      setSelectedIds(ordered.map((s) => s.id));
      toast.success('Route optimized');
    } catch {
      toast.error('Could not geocode starting location');
    } finally {
      setOptimizing(false);
    }
  }

  function openGoogleMaps() {
    if (!startAddress.trim() || selectedStops.length === 0) return;
    window.open(buildGoogleMapsUrl(startAddress, selectedStops.map((s) => s.address)), '_blank');
  }

  function openAppleMaps() {
    if (!startAddress.trim() || selectedStops.length === 0) return;
    window.open(buildAppleMapsUrl(startAddress, selectedStops.map((s) => s.address)), '_blank');
  }

  async function copySummary() {
    if (selectedStops.length === 0) return;
    try {
      await navigator.clipboard.writeText(buildRouteSummary(selectedStops));
      toast.success('Route summary copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }

  return (
    <div className="px-6 pb-6 pt-[calc(4rem+env(safe-area-inset-top))] md:px-8 md:pb-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-400" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Drop-Off Route</h1>
          </div>
          <p className="text-gray-400 text-[10px] mt-0.5 font-sans">Plan and optimize a multi-stop drop-off run</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <label className="text-[11px] font-mono uppercase text-slate-500 block">Starting Location</label>
        <input
          value={startAddress}
          onChange={(e) => {
            setStartAddress(e.target.value);
            setStartCoords(null);
          }}
          placeholder="Current Location or Office Address"
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white min-h-[44px]"
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients or addresses…"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2.5 text-sm text-white min-h-[44px]"
            />
          </div>
          <button onClick={selectAll} className="min-h-[44px] px-3 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300">
            Select All
          </button>
          <button onClick={clearAll} className="min-h-[44px] px-3 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300">
            Clear All
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
          </div>
        ) : filteredStops.length === 0 ? (
          <div className="border border-white/10 rounded-xl p-6 text-center text-gray-500 text-sm">
            No clients with linked addresses yet — link an address from Client Kanban.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredStops.map((s) => (
              <label
                key={s.id}
                className="flex items-start gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3 min-h-[44px] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(s.id)}
                  onChange={() => toggleStop(s.id)}
                  className="mt-0.5 w-5 h-5 shrink-0 accent-emerald-500"
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{s.businessName}</p>
                  {s.contactName && <p className="text-xs text-slate-400">{s.contactName}</p>}
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{s.address}</p>
                  {(s.lat == null || s.lng == null) && (
                    <p className="text-[10px] text-amber-400 flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3" /> Couldn&apos;t geocode — excluded from optimization
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {selectedStops.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Route ({selectedStops.length} stop{selectedStops.length === 1 ? '' : 's'})
            </h2>
            <button
              onClick={optimizeRoute}
              disabled={optimizing}
              className="min-h-[44px] flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 rounded-xl disabled:opacity-50"
            >
              {optimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>⚡</span>}
              Optimize Route
            </button>
          </div>

          <div className="space-y-2">
            {selectedStops.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-emerald-600/20 text-emerald-400 text-[11px] font-bold font-mono">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">{s.businessName}</p>
                  <p className="text-[11px] text-slate-500 font-mono truncate">{s.address}</p>
                </div>
                <div className="flex flex-col shrink-0">
                  <button
                    onClick={() => moveStop(i, -1)}
                    disabled={i === 0}
                    className="min-h-[22px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveStop(i, 1)}
                    disabled={i === selectedStops.length - 1}
                    className="min-h-[22px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={openGoogleMaps}
              className="min-h-[44px] flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm px-4 rounded-xl flex-1"
            >
              <Navigation className="w-4 h-4" /> Google Maps
            </button>
            <button
              onClick={openAppleMaps}
              className="min-h-[44px] flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm px-4 rounded-xl flex-1"
            >
              <MapPin className="w-4 h-4" /> Apple Maps
            </button>
            <button
              onClick={copySummary}
              className="min-h-[44px] flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-bold text-sm px-4 rounded-xl flex-1"
            >
              <span>📋</span> Copy Route Summary
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

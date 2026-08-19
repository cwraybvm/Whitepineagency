'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Truck,
  Search,
  MapPin,
  Loader2,
  ChevronUp,
  ChevronDown,
  Navigation,
  AlertTriangle,
  Phone,
  Check,
  Rocket,
  X,
  Radar,
  Plus,
  RefreshCw,
  Camera,
} from 'lucide-react';
import { nearestNeighborOrder, haversineMiles } from '@/lib/routeOptimizer';
import { buildGoogleMapsUrl, buildAppleMapsUrl, buildRouteSummary, buildSingleGoogleMapsUrl, buildSingleAppleMapsUrl } from '@/lib/mapLinks';
import VoiceCaptureButton from '@/components/admin/VoiceCaptureButton';
import { readFileAsDataUrl, MAX_PHOTO_BYTES } from '@/lib/photoAttachment';
import { formatTimestamp } from '@/lib/timestamp';
import { isColdAccount } from '@/lib/clientActivity';

interface Stop {
  id: string;
  businessName: string;
  contactName: string | null;
  phone: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  contactNotes: string;
  photoUrl: string | null;
  lastContacted: string | null;
}

const RADIUS_OPTIONS = [1, 3, 5, 10];

export default function DropOffRoutePage() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [startAddress, setStartAddress] = useState('');
  const [startCoords, setStartCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [executionMode, setExecutionMode] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [radarOpen, setRadarOpen] = useState(false);
  const [radarRadius, setRadarRadius] = useState(5);
  const [radarLoading, setRadarLoading] = useState(false);
  const [radarError, setRadarError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [reGeocoding, setReGeocoding] = useState(false);
  const [coldOnly, setColdOnly] = useState(false);

  function loadStops() {
    setLoading(true);
    fetch('/api/bvm/drop-off-route')
      .then((res) => res.json())
      .then(setStops)
      .catch(() => toast.error('Failed to load drop-off stops'))
      .finally(() => setLoading(false));
  }

  useEffect(loadStops, []);

  async function reGeocodeAll() {
    setReGeocoding(true);
    try {
      const res = await fetch('/api/bvm/drop-off-route/re-geocode', { method: 'POST' });
      if (!res.ok) throw new Error();
      const { total, succeeded } = await res.json();
      toast.success(`Re-geocoded ${succeeded} / ${total} addresses`);
      loadStops();
    } catch {
      toast.error('Failed to re-geocode addresses');
    } finally {
      setReGeocoding(false);
    }
  }

  const filteredStops = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stops
      .filter(
        (s) =>
          !q ||
          s.businessName.toLowerCase().includes(q) ||
          (s.contactName || '').toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q)
      )
      .filter((s) => !coldOnly || isColdAccount(s.lastContacted));
  }, [stops, search, coldOnly]);

  const stopsById = useMemo(() => new Map(stops.map((s) => [s.id, s])), [stops]);
  const radarResults = useMemo(() => {
    if (!userCoords) return [];
    return stops
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => ({ stop: s, distance: haversineMiles(userCoords, { lat: s.lat as number, lng: s.lng as number }) }))
      .filter((r) => r.distance <= radarRadius)
      .sort((a, b) => a.distance - b.distance);
  }, [stops, userCoords, radarRadius]);
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
      toast.error("Could not geocode starting location — stops kept in current order. You can still launch Google/Apple Maps.");
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

  function openSingleGoogleMaps(stop: Stop) {
    window.open(buildSingleGoogleMapsUrl(stop.address), '_blank');
  }

  function openSingleAppleMaps(stop: Stop) {
    window.open(buildSingleAppleMapsUrl(stop.address), '_blank');
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

  function startExecutionMode() {
    setCompletedIds(new Set());
    setExecutionMode(true);
  }

  async function markDroppedOff(stop: Stop) {
    setMarkingId(stop.id);
    try {
      const res = await fetch('/api/bvm/drop-off-route/mark-dropped-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: stop.id }),
      });
      if (!res.ok) throw new Error();
      setCompletedIds((prev) => new Set(prev).add(stop.id));
      toast.success(`${stop.businessName} marked dropped off`);
    } catch {
      toast.error('Failed to mark dropped off');
    } finally {
      setMarkingId(null);
    }
  }

  function findClientsNearMe() {
    if (!navigator.geolocation) {
      setRadarError("Geolocation isn't available in this browser.");
      setRadarOpen(true);
      return;
    }

    setRadarOpen(true);
    setRadarLoading(true);
    setRadarError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setRadarLoading(false);
      },
      (error) => {
        const messages: Record<number, string> = {
          1: 'Location access denied — enable it in your browser/device settings to use the radar.',
          2: "Couldn't determine your location — try again in a moment.",
          3: 'Location request timed out — try again.',
        };
        setRadarError(messages[error.code] || 'Failed to get your location.');
        setRadarLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function updateStopLocal(id: string, patch: Partial<Stop>) {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function attachPhotoToStop(stop: Stop, file: File) {
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('Photo too large — keep it under 2MB');
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const res = await fetch('/api/bvm/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: stop.id, photoUrl: dataUrl }),
      });
      if (!res.ok) throw new Error();
      updateStopLocal(stop.id, { photoUrl: dataUrl });
      toast.success('Photo attached');
    } catch {
      toast.error('Failed to attach photo');
    }
  }

  async function appendVoiceMemoToStop(stop: Stop, text: string) {
    const note = `[Voice Memo: ${formatTimestamp(new Date())}]: ${text}`;
    const contactNotes = stop.contactNotes ? `${stop.contactNotes}\n${note}` : note;
    try {
      const res = await fetch('/api/bvm/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: stop.id, contactNotes }),
      });
      if (!res.ok) throw new Error();
      updateStopLocal(stop.id, { contactNotes });
      toast.success('Voice memo added to notes');
    } catch {
      toast.error('Failed to save voice memo');
    }
  }

  function addNearbyToRoute() {
    setSelectedIds((prev) => {
      const toAdd = radarResults.map((r) => r.stop.id).filter((id) => !prev.includes(id));
      return [...prev, ...toAdd];
    });
    toast.success('Nearby clients added to route');
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={reGeocodeAll}
            disabled={reGeocoding}
            className="min-h-[44px] flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm px-4 rounded-xl disabled:opacity-50"
          >
            {reGeocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Re-Geocode All Addresses
          </button>
          <button
            onClick={findClientsNearMe}
            className="min-h-[44px] flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm px-4 rounded-xl"
          >
            <Radar className="w-4 h-4" /> Find Clients Near Me
          </button>
        </div>
      </div>

      {radarOpen && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Radar className="w-4 h-4 text-sky-400" /> Nearby Clients
            </h2>
            <button onClick={() => setRadarOpen(false)} className="text-gray-400 hover:text-white p-1" aria-label="Close radar">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono uppercase text-slate-500">Radius:</span>
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRadarRadius(r)}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-bold ${
                  radarRadius === r ? 'bg-sky-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {r} Mile{r === 1 ? '' : 's'}
              </button>
            ))}
          </div>

          {radarLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            </div>
          ) : radarError ? (
            <div className="flex items-start gap-2 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {radarError}
            </div>
          ) : radarResults.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No geocoded clients within {radarRadius} miles.</p>
          ) : (
            <>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {radarResults.map(({ stop, distance }) => (
                  <div key={stop.id} className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{stop.businessName}</p>
                      <p className="text-[11px] text-slate-500 font-mono truncate">{stop.address}</p>
                    </div>
                    <span className="shrink-0 text-xs font-mono font-bold text-sky-400">{distance.toFixed(1)} miles away</span>
                  </div>
                ))}
              </div>
              <button
                onClick={addNearbyToRoute}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm px-4 rounded-xl"
              >
                <Plus className="w-4 h-4" /> Add Nearby Clients to Route
              </button>
            </>
          )}
        </div>
      )}

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
          <button
            onClick={() => setColdOnly((v) => !v)}
            className={`min-h-[44px] px-3 rounded-lg text-xs font-bold ${
              coldOnly ? 'bg-red-500/30 text-red-200' : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            Show Cold Accounts Only
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-white">{s.businessName}</p>
                    {isColdAccount(s.lastContacted) && (
                      <span className="shrink-0 flex items-center gap-1 bg-red-500/30 text-red-200 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full animate-pulse">
                        <AlertTriangle className="w-2.5 h-2.5" /> Cold Account (30+ Days)
                      </span>
                    )}
                  </div>
                  {s.contactName && <p className="text-xs text-slate-400">{s.contactName}</p>}
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{s.address}</p>
                  {(s.lat == null || s.lng == null) && (
                    <p className="text-[10px] text-amber-400 flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3" /> Couldn&apos;t geocode — kept in manual order, Maps will still navigate to it directly
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {selectedStops.length > 0 && !executionMode && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Route ({selectedStops.length} stop{selectedStops.length === 1 ? '' : 's'})
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={optimizeRoute}
                disabled={optimizing}
                className="min-h-[44px] flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 rounded-xl disabled:opacity-50"
              >
                {optimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>⚡</span>}
                Optimize Route
              </button>
              <button
                onClick={startExecutionMode}
                className="min-h-[44px] flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm px-4 rounded-xl"
              >
                <Rocket className="w-4 h-4" /> Start Drop-Off Route
              </button>
            </div>
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

      {executionMode && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              {completedIds.size} / {selectedStops.length} Drop-Offs Completed
            </h2>
            <button
              onClick={() => setExecutionMode(false)}
              className="min-h-[44px] flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white font-bold text-sm px-4 rounded-xl"
            >
              <X className="w-4 h-4" /> Exit
            </button>
          </div>

          <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${selectedStops.length > 0 ? (completedIds.size / selectedStops.length) * 100 : 0}%` }}
            />
          </div>

          <div className="space-y-2">
            {selectedStops.map((s, i) => {
              const done = completedIds.has(s.id);
              return (
                <div
                  key={s.id}
                  className={`bg-slate-950 border rounded-xl p-3 space-y-2 ${done ? 'border-emerald-600/40 opacity-50' : 'border-slate-800'}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-emerald-600/20 text-emerald-400 text-[11px] font-bold font-mono">
                      {i + 1}
                    </span>
                    <div className={`min-w-0 flex-1 ${done ? 'line-through' : ''}`}>
                      <p className="text-sm font-bold text-white">{s.businessName}</p>
                      {s.contactName && <p className="text-xs text-slate-400">{s.contactName}</p>}
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{s.address}</p>
                    </div>
                    {s.photoUrl && (
                      <img src={s.photoUrl} alt="Attached" className="w-10 h-10 rounded-lg object-cover border border-slate-800 shrink-0" />
                    )}
                  </div>

                  {done ? (
                    <div className="flex items-center gap-2 min-h-[44px] justify-center bg-emerald-600/10 text-emerald-400 font-bold text-sm rounded-lg">
                      <Check className="w-4 h-4" /> Dropped Off
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {s.phone && (
                        <a
                          href={`tel:${s.phone}`}
                          className="min-h-[44px] flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-bold text-xs px-3 rounded-lg flex-1"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call
                        </a>
                      )}
                      <button
                        onClick={() => openSingleGoogleMaps(s)}
                        className="min-h-[44px] flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-3 rounded-lg flex-1"
                      >
                        <Navigation className="w-3.5 h-3.5" /> Navigate
                      </button>
                      <button
                        onClick={() => openSingleAppleMaps(s)}
                        className="min-h-[44px] flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs px-3 rounded-lg flex-1"
                      >
                        <MapPin className="w-3.5 h-3.5" /> Apple Maps
                      </button>
                      <label className="min-h-[44px] flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-bold text-xs px-3 rounded-lg flex-1 cursor-pointer">
                        <Camera className="w-3.5 h-3.5" /> 📸 Attach Photo
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file) attachPhotoToStop(s, file);
                          }}
                        />
                      </label>
                      <div className="flex-1">
                        <VoiceCaptureButton
                          onTranscript={(text) => appendVoiceMemoToStop(s, text)}
                          idleLabel="🎙️ Record Voice Memo"
                          listeningLabel="🔴 Recording…"
                          className="w-full flex items-center justify-center gap-2 min-h-[44px] bg-white/5 hover:bg-white/10 text-white font-bold text-xs px-3 rounded-lg"
                        />
                      </div>
                      <button
                        onClick={() => markDroppedOff(s)}
                        disabled={markingId === s.id}
                        className="min-h-[44px] w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 rounded-lg disabled:opacity-50"
                      >
                        {markingId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>✅</span>} Mark Dropped Off
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

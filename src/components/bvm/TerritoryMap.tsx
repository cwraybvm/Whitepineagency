'use client';

import { useState } from 'react';

interface MapAddress {
  id: string;
  customerName: string;
  street: string;
  city: string;
  state: string;
  magazineZone: string | null;
  publicationName: string | null;
  sentToBvm: boolean;
}

const BAND_HEIGHT = 90;
const WIDTH = 900;
const MARGIN_X = 130;

// Deterministic pseudo-coordinates from the address id -- there's no lat/lng
// on BvmAddress (no geocoding pipeline), so pins are laid out schematically
// by zone rather than on a real street map. Same id always lands same spot.
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export default function TerritoryMap({ addresses }: { addresses: MapAddress[] }) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const zones = Array.from(new Set(addresses.map((a) => a.magazineZone || 'Unassigned'))).sort();
  const height = Math.max(BAND_HEIGHT, zones.length * BAND_HEIGHT);

  return (
    <div
      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-x-auto touch-pan-x"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <p className="text-[10px] text-slate-500 font-mono mb-2">
        Schematic territory layout by zone (no live geocoding) — <span className="text-emerald-400">green = sent</span>,{' '}
        <span className="text-amber-400">orange = pending</span>
      </p>
      <svg viewBox={`0 0 ${WIDTH} ${height}`} className="w-full min-w-[600px]" style={{ height: Math.min(500, height) }}>
        {zones.map((zone, zi) => {
          const y = zi * BAND_HEIGHT + BAND_HEIGHT / 2;
          return (
            <g key={zone}>
              <line x1={MARGIN_X} y1={zi * BAND_HEIGHT} x2={WIDTH} y2={zi * BAND_HEIGHT} stroke="#1e293b" strokeWidth={1} />
              <text x={8} y={y + 4} fill="#94a3b8" fontSize={11} fontFamily="monospace">
                {zone}
              </text>
            </g>
          );
        })}

        {addresses.map((a) => {
          const zi = zones.indexOf(a.magazineZone || 'Unassigned');
          const h = hash(a.id);
          const x = MARGIN_X + 20 + (h % (WIDTH - MARGIN_X - 40));
          const y = zi * BAND_HEIGHT + BAND_HEIGHT / 2 + (((h >> 8) % 40) - 20);
          const color = a.sentToBvm ? '#22C55E' : '#F97316';
          const isHovered = hoverId === a.id;
          return (
            <g key={a.id} onMouseEnter={() => setHoverId(a.id)} onMouseLeave={() => setHoverId(null)} className="cursor-pointer">
              <circle cx={x} cy={y} r={isHovered ? 8 : 6} fill={color} stroke="#020617" strokeWidth={1.5} opacity={0.9} />
              {isHovered && (
                <g>
                  <rect x={x - 90} y={y - 46} width={180} height={38} rx={6} fill="#0F172A" stroke="#334155" />
                  <text x={x} y={y - 30} fill="#fff" fontSize={11} fontWeight={700} textAnchor="middle" fontFamily="sans-serif">
                    {a.customerName}
                  </text>
                  <text x={x} y={y - 16} fill="#94a3b8" fontSize={9} textAnchor="middle" fontFamily="monospace">
                    {a.street}, {a.city}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

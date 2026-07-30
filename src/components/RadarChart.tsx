'use client';
import React from 'react';

interface RadarChartProps {
  speed: number;
  security: number;
  seo: number;
  deliverability: number;
  legal: number;
}

export default function RadarChart({ speed, security, seo, deliverability, legal }: RadarChartProps) {
  const cx = 100, cy = 100;
  const rScale = (val: number) => (val / 100) * 70;
  
  const pSpeed = { x: cx, y: cy - rScale(speed) };
  const pSec = { x: cx + rScale(security) * Math.cos(-Math.PI/10), y: cy + rScale(security) * Math.sin(-Math.PI/10) };
  const pSEO = { x: cx + rScale(seo) * Math.cos(Math.PI/3), y: cy + rScale(seo) * Math.sin(Math.PI/3) };
  const pDeliv = { x: cx - rScale(deliverability) * Math.cos(Math.PI/3), y: cy + rScale(deliverability) * Math.sin(Math.PI/3) };
  const pLegal = { x: cx - rScale(legal) * Math.cos(-Math.PI/10), y: cy + rScale(legal) * Math.sin(-Math.PI/10) };

  const pointsString = `${pSpeed.x},${pSpeed.y} ${pSec.x},${pSec.y} ${pSEO.x},${pSEO.y} ${pDeliv.x},${pDeliv.y} ${pLegal.x},${pLegal.y}`;

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <svg width="140" height="140" viewBox="0 0 200 200" className="overflow-visible flex-shrink-0">
        {/* Background Grid Circles */}
        <circle cx={cx} cy={cy} r="70" className="stroke-white/[0.04] fill-none" strokeWidth="1" />
        <circle cx={cx} cy={cy} r="45" className="stroke-white/[0.04] fill-none" strokeWidth="1" />
        
        {/* Dynamic Radar Polygon */}
        <polygon points={pointsString} className="fill-indigo-500/15 stroke-indigo-500 transition-all duration-700 ease-out" strokeWidth="2" />
        
        {/* Axis Labels */}
        <text x={cx} y={cy - 78} fill="#9CA3AF" fontSize="9" textAnchor="middle" fontWeight="700">PERFORMANCE</text>
        <text x={cx + 80} y={cy - 10} fill="#9CA3AF" fontSize="9" textAnchor="start" fontWeight="700">SECURITY</text>
        <text x={cx + 40} y={cy + 82} fill="#9CA3AF" fontSize="9" textAnchor="middle" fontWeight="700">SEO MATRIX</text>
        <text x={cx - 40} y={cy + 82} fill="#9CA3AF" fontSize="9" textAnchor="middle" fontWeight="700">INBOX DELIV</text>
        <text x={cx - 80} y={cy - 10} fill="#9CA3AF" fontSize="9" textAnchor="end" fontWeight="700">LEGAL COMP</text>
      </svg>
      
      {/* Descriptive Text Layout Block */}
      <div className="text-center mt-4">
        <h4 className="font-bold text-white text-sm">Risk Surface Radial Axis</h4>
        <p className="text-[11px] text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">
          This radial axis map checks structural surface parameters. Indented corners mark immediate optimization targets.
        </p>
      </div>
    </div>
  );
}
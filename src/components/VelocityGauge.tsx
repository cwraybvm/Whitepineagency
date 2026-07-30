'use client';
import React from 'react';

interface VelocityGaugeProps {
  speed: number;
}

export default function VelocityGauge({ speed }: VelocityGaugeProps) {
  const needleAngle = (speed / 100) * 180 - 180;

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="w-[100px] h-[60px] relative overflow-visible flex-shrink-0">
        <svg viewBox="0 0 100 50" width="100" height="50">
          {/* Background Track Arc */}
          <path d="M 10,50 A 40,40 0 0,1 90,50" className="fill-none stroke-white/[0.05]" strokeWidth="8" />
          
          {/* Colored Progress Arc */}
          <path d="M 10,50 A 40,40 0 0,1 90,50" className={`fill-none ${speed < 50 ? 'stroke-red-500' : 'stroke-emerald-500'}`} strokeWidth="8" strokeDasharray="126" strokeDashoffset={126 - (speed / 100) * 126} />
          
          {/* Dynamic Gauge Needle Group */}
          <g style={{ transform: `translate(50px, 50px) rotate(${needleAngle}deg)`, transformOrigin: '0px 0px', transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            <line x1="0" y1="0" x2="-35" y2="0" stroke="#6366F1" strokeWidth="3" strokeLinecap="round" />
          </g>
          
          {/* Center Pin Anchor */}
          <circle cx="50" cy="50" r="4" fill="#6366F1" />
        </svg>
      </div>
      
      {/* Descriptive Typography Block aligned to the radar chart aesthetic */}
      <div className="text-center mt-4">
        <h4 className="font-bold text-white text-sm">Compliance Velocity Gauge</h4>
        <p className="text-[11px] text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">
          Needle orientation locks into global data layer throughput and connectivity integrity metrics.
        </p>
      </div>
    </div>
  );
}
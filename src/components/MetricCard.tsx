'use client';
import React from 'react';

interface MetricCardProps {
  nodeKey: string;
  isReady: boolean;
  isActive: boolean;
  isGated: boolean;
  dataValue: string;
  riskLabel: string;
  riskStyle: string;
  onClick: () => void;
}

export default function MetricCard({
  nodeKey,
  isReady,
  isActive,
  isGated,
  dataValue,
  riskLabel,
  riskStyle,
  onClick
}: MetricCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-xl border text-center transition-all duration-200 relative overflow-hidden ${
        !isReady 
          ? 'bg-white/[0.01] border-white/[0.03] animate-pulse cursor-wait select-none' 
          : isActive 
            ? 'bg-indigo-600/10 border-indigo-500 shadow-md shadow-indigo-500/5 -translate-y-1 cursor-pointer' 
            : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.15] hover:-translate-y-0.5 cursor-pointer'
      }`}
    >
      <h4 className="text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate">
        {nodeKey === 'og' ? 'Social Card' : nodeKey === 'ada' ? 'ADA Legal' : nodeKey}
      </h4>
      
      {isReady ? (
        <>
          <p className={`text-base font-bold my-2 font-mono text-white ${isGated ? 'text-gray-600 blur-sm select-none' : ''}`}>
            {dataValue}
          </p>
          <div className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded border ${
            isGated ? 'bg-white/[0.02] border-white/[0.05] text-gray-500' : riskStyle
          }`}>
            {isGated ? "LOCKED" : riskLabel}
          </div>
        </>
      ) : (
        <div className="space-y-2 mt-3">
          <div className="h-4 w-16 bg-white/5 rounded mx-auto" />
          <div className="h-3.5 w-12 bg-white/[0.03] rounded mx-auto" />
        </div>
      )}
    </div>
  );
}
'use client';

import React from 'react';

interface FloatingSmartDockProps {
  activeWorkspaceLead: any;
  isQuoteModalOpen: boolean;
  setIsQuoteModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isRecordingMemo: boolean;
  togglePostCallVoiceMemo: () => void;
  generateGoogleCalendarUrl: (name: string) => void;
  handleSyncToCrm: (lead: any) => void;
  handleUpdateStage: (id: string, stage: any) => void;
  playAudioChime: (type: any) => void;
}

export default function FloatingSmartDock({
  activeWorkspaceLead,
  setIsQuoteModalOpen,
  setIsCommandPaletteOpen,
  isRecordingMemo,
  togglePostCallVoiceMemo,
  generateGoogleCalendarUrl,
  handleSyncToCrm,
  handleUpdateStage,
  playAudioChime,
}: FloatingSmartDockProps) {
  return (
    <div className="fixed bottom-16 sm:bottom-4 left-1/2 -translate-x-1/2 z-[100] no-print px-2 w-full max-w-lg flex justify-center pb-safe-bottom">
      <div className="bg-[#080E1A]/95 border border-white/30 backdrop-blur-2xl px-3 py-2 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.9)] flex items-center justify-between gap-1.5 font-mono text-xs w-full max-w-md">
        {activeWorkspaceLead ? (
          <>
            <button
              onClick={togglePostCallVoiceMemo}
              className={`px-2.5 py-1.5 rounded-full font-bold text-[10px] uppercase transition-all cursor-pointer border shrink-0 ${
                isRecordingMemo
                  ? 'bg-red-600 text-white border-red-400 animate-pulse'
                  : 'bg-white/10 text-gray-200 border-white/20 hover:bg-white/20'
              }`}
            >
              🎤 {isRecordingMemo ? 'Rec...' : 'Memo'}
            </button>

            <button
              onClick={() => generateGoogleCalendarUrl(activeWorkspaceLead.businessName)}
              className="px-2.5 py-1.5 bg-indigo-600/40 text-indigo-200 border border-indigo-400/50 rounded-full font-bold text-[10px] uppercase hover:bg-indigo-600 shrink-0"
            >
              📅 Schedule
            </button>

            <button
              onClick={() => handleSyncToCrm(activeWorkspaceLead)}
              className="px-2.5 py-1.5 bg-emerald-600/40 text-emerald-200 border border-emerald-400/50 rounded-full font-bold text-[10px] uppercase hover:bg-emerald-600 shrink-0"
            >
              ⚡ CRM
            </button>

            <button
              onClick={() => {
                playAudioChime('click');
                setIsQuoteModalOpen((p) => !p);
              }}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-indigo-600 text-white font-black rounded-full text-[10px] uppercase shadow-lg shrink-0"
            >
              🧮 Quoter
            </button>

            <button
              onClick={() => handleUpdateStage(activeWorkspaceLead.id, 'Closed Won')}
              className="px-3 py-1.5 bg-emerald-400 text-black font-black rounded-full text-[10px] uppercase shrink-0"
            >
              🏆 Won
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                playAudioChime('click');
                setIsQuoteModalOpen((p) => !p);
              }}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs uppercase font-mono rounded-full shadow-lg transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 border border-white/30 min-h-[44px]"
            >
              <span className="text-base">🧮</span> Solution Quoter Engine
            </button>

            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-white/20 text-gray-200 rounded-full font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-1 shrink-0 min-h-[44px]"
            >
              <span>🔍</span>
              <span className="text-[9px] bg-black/60 px-1.5 py-0.5 rounded text-indigo-300 font-mono font-bold">Cmd+K</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
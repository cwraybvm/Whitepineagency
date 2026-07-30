'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav() {
  const pathname = usePathname();

  const getLinkStyles = (path: string) => {
    const isActive = pathname === path;
    return `flex items-center gap-3 p-3 rounded-xl transition-all font-bold ${
      isActive 
        ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] border border-indigo-500/30" 
        : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
    }`;
  };

  const getMobileLinkStyles = (path: string) => {
    const isActive = pathname === path;
    return `flex flex-col items-center justify-center flex-1 py-2 text-[10px] font-mono font-bold transition-all ${
      isActive ? "text-indigo-400 text-glow-indigo" : "text-gray-500 hover:text-gray-300"
    }`;
  };

  return (
    <>
      {/* 🖥️ DESKTOP SIDEBAR */}
      <aside className="w-64 border-r border-white/5 bg-black/40 backdrop-blur-xl p-6 flex flex-col justify-between hidden md:flex shrink-0 z-20 no-print">
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center border border-white/10 overflow-hidden">
              <img src="/logo.jpg" alt="White Pine" className="max-w-full max-h-full object-contain" />
            </div>
            <span className="font-black tracking-tight text-white text-sm">WHITE PINE</span>
          </div>
          
          <nav className="space-y-1.5 font-mono text-xs">
            <Link href="/admin" className={getLinkStyles("/admin")}>
              <span>📥</span> Pipeline Intake
            </Link>
            <Link href="/admin/analytics" className={getLinkStyles("/admin/analytics")}>
              <span>📊</span> Telemetry Analytics
            </Link>
          </nav>
        </div>
        
        <div className="border-t border-white/5 pt-4">
          <span className="text-[10px] text-gray-500 font-mono uppercase block">SECURE OPERATOR FRAME</span>
          <span className="text-[9px] text-indigo-400/50 font-mono uppercase block mt-0.5">NODE_STATUS: ACTIVE</span>
        </div>
      </aside>

      {/* 📱 MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 h-[calc(4.5rem+env(safe-area-inset-bottom))] bg-black/80 backdrop-blur-lg border-t border-white/10 flex items-start px-6 pt-2 z-40 md:hidden no-print pb-[env(safe-area-inset-bottom)]">
        <Link href="/admin" className={getMobileLinkStyles("/admin")}>
          <span className="text-lg mb-1">📥</span>
          <span>Pipeline</span>
        </Link>
        <Link href="/admin/analytics" className={getMobileLinkStyles("/admin/analytics")}>
          <span className="text-lg mb-1">📊</span>
          <span>Analytics</span>
        </Link>
      </nav>
    </>
  );
}
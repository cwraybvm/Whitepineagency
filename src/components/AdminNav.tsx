'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/sandbox/ThemeToggle";

export default function AdminNav() {
  const pathname = usePathname();

  const getLinkStyles = (path: string) => {
    const isActive = pathname === path;
    return `flex items-center gap-3 p-3 rounded-xl transition-all font-bold ${
      isActive
        ? "bg-emerald-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.3)] border border-emerald-500/30"
        : "text-gray-400 dark:text-gray-400 light:text-slate-600 hover:text-white dark:hover:text-white light:hover:text-slate-900 hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-slate-900/5 border border-transparent"
    }`;
  };

  const getMobileLinkStyles = (path: string) => {
    const isActive = pathname === path;
    return `flex flex-col items-center justify-center flex-1 py-2 text-[10px] font-mono font-bold transition-all ${
      isActive ? "text-emerald-500 dark:text-emerald-400 text-glow-emerald" : "text-gray-500 dark:text-gray-500 light:text-slate-500 hover:text-gray-300 dark:hover:text-gray-300 light:hover:text-slate-700"
    }`;
  };

  // Primary console navigation — shared across /admin, /sandbox, /fulfillment.
  // Rendered only inside OWNER-gated route groups (see src/proxy.ts), so no
  // per-link role check is needed here.
  const NAV_LINKS = [
    { href: "/admin", label: "Pipeline Intake", mobileLabel: "Pipeline", icon: "📥" },
    { href: "/fulfillment", label: "Fulfillment / SLA", mobileLabel: "Fulfillment", icon: "📦" },
    { href: "/sandbox", label: "Creative Sandbox", mobileLabel: "Sandbox", icon: "🎨" },
    { href: "/admin/simulator", label: "Voice Simulator", mobileLabel: "Simulator", icon: "🎙️" },
    { href: "/admin/reports", label: "Reports", mobileLabel: "Reports", icon: "📄" },
    { href: "/admin/analytics", label: "Telemetry Analytics", mobileLabel: "Analytics", icon: "📊" },
  ];

  return (
    <>
      {/* 🖥️ DESKTOP SIDEBAR */}
      <aside className="w-64 border-r border-slate-200/80 dark:border-slate-800/80 bg-black/40 dark:bg-black/40 light:bg-[#F1F5F2] backdrop-blur-xl p-6 flex flex-col justify-between hidden md:flex shrink-0 z-20 no-print">
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
            <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center border border-white/10 overflow-hidden">
              <img src="/logo.jpg" alt="White Pine" className="max-w-full max-h-full object-contain" />
            </div>
            <span className="font-black tracking-tight text-white dark:text-white light:text-slate-900 text-sm flex-1">WHITE PINE</span>
            <ThemeToggle />
          </div>

          <nav className="space-y-1.5 font-mono text-xs">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={getLinkStyles(link.href)}>
                <span>{link.icon}</span> {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t border-slate-200/80 dark:border-slate-800/80 pt-4">
          <span className="text-[10px] text-gray-500 dark:text-gray-500 light:text-slate-500 font-mono uppercase block">SECURE OPERATOR FRAME</span>
          <span className="text-[9px] text-emerald-400/50 font-mono uppercase block mt-0.5">NODE_STATUS: ACTIVE</span>
        </div>
      </aside>

      {/* 📱 MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 h-[calc(4.5rem+env(safe-area-inset-bottom))] bg-black/80 dark:bg-black/80 light:bg-[#F1F5F2]/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800/80 flex items-start px-2 pt-2 z-40 md:hidden no-print pb-[env(safe-area-inset-bottom)] overflow-x-auto">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={getMobileLinkStyles(link.href)}>
            <span className="text-lg mb-1">{link.icon}</span>
            <span>{link.mobileLabel}</span>
          </Link>
        ))}
      </nav>

      {/* ThemeToggle only ships inside the desktop aside above (hidden below
          md), so it's otherwise unreachable on mobile — this floating button
          is the only theme control available under the md breakpoint. */}
      <div className="fixed top-4 right-4 z-40 md:hidden no-print">
        <ThemeToggle />
      </div>
    </>
  );
}
'use client';

import { useState } from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/sandbox/ThemeToggle";
import { Focus as FocusIcon, ListTodo, MoreHorizontal, X, ChevronDown, Building2 } from "lucide-react";

// BVM Business subtabs -- rendered as a collapsible group in the desktop
// sidebar / mobile "More" drawer rather than 6 flat top-level entries.
const BVM_LINKS: { href: string; label: string; icon: string }[] = [
  { href: "/admin/bvm/call-consistency", label: "Call Consistency", icon: "📞" },
  { href: "/admin/bvm/conference", label: "Conference Calls", icon: "👥" },
  { href: "/admin/bvm/addresses", label: "New Addresses", icon: "📍" },
  { href: "/admin/bvm/appointments", label: "Appointments", icon: "🗓️" },
  { href: "/admin/bvm/clients", label: "Client Kanban", icon: "🗂️" },
  { href: "/admin/bvm/email-templates", label: "Email Templates", icon: "✉️" },
  { href: "/admin/bvm/issues", label: "Issue Deadlines & Quotas", icon: "🗞️" },
  { href: "/admin/bvm/reports", label: "BVM Reports", icon: "📈" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [bvmOpen, setBvmOpen] = useState(pathname.startsWith("/admin/bvm"));

  // "/admin" and "/fulfillment" are each a prefix of another NAV_LINKS entry
  // (/fulfillment/competitor-audit), so both need an exact match -- every
  // other link highlights on itself and sub-routes.
  const EXACT_MATCH_ONLY = new Set(["/admin", "/fulfillment"]);
  const isPathActive = (path: string) =>
    EXACT_MATCH_ONLY.has(path) ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);
  const isBvmActive = pathname.startsWith("/admin/bvm");

  const getLinkStyles = (path: string) => {
    const isActive = isPathActive(path);
    return `flex items-center gap-3 p-3 rounded-xl transition-all font-bold ${
      isActive
        ? "bg-emerald-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.3)] border border-emerald-500/30"
        : "text-gray-400 dark:text-gray-400 light:text-slate-600 hover:text-white dark:hover:text-white light:hover:text-slate-900 hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-slate-900/5 border border-transparent"
    }`;
  };

  const getMobileLinkStyles = (isActive: boolean) =>
    `flex flex-col items-center justify-center gap-1 py-2.5 px-1 text-[10px] font-mono font-bold leading-tight transition-all ${
      isActive ? "text-emerald-500 dark:text-emerald-400 text-glow-emerald" : "text-gray-500 dark:text-gray-500 light:text-slate-500 hover:text-gray-300 dark:hover:text-gray-300 light:hover:text-slate-700"
    }`;

  // Primary console navigation — shared across /admin, /sandbox, /fulfillment.
  // Rendered only inside OWNER-gated route groups (see src/proxy.ts), so no
  // per-link role check is needed here.
  const NAV_LINKS: { href: string; label: string; mobileLabel: string; icon: string | typeof ListTodo }[] = [
    { href: "/admin", label: "Pipeline Intake", mobileLabel: "Pipeline", icon: "📥" },
    { href: "/admin/tasks", label: "To-Do List", mobileLabel: "To-Do", icon: ListTodo },
    { href: "/admin/clients", label: "Clients", mobileLabel: "Clients", icon: "🏢" },
    { href: "/fulfillment", label: "Fulfillment / SLA", mobileLabel: "Fulfillment", icon: "📦" },
    { href: "/fulfillment/competitor-audit", label: "Competitor Audit", mobileLabel: "Audit", icon: "🔍" },
    { href: "/fulfillment/reports", label: "Fulfillment Reports", mobileLabel: "Fulfill Rpts", icon: "📑" },
    { href: "/fulfillment/sandbox", label: "Fulfillment Sandbox", mobileLabel: "Fulfill Sand", icon: "🧪" },
    { href: "/fulfillment/studio", label: "Fulfillment Studio", mobileLabel: "Studio", icon: "🎬" },
    { href: "/sandbox", label: "Creative Sandbox", mobileLabel: "Sandbox", icon: "🎨" },
    { href: "/admin/simulator", label: "Voice Simulator", mobileLabel: "Simulator", icon: "🎙️" },
    { href: "/admin/reports", label: "Reports", mobileLabel: "Reports", icon: "📄" },
    { href: "/admin/analytics", label: "Telemetry Analytics", mobileLabel: "Analytics", icon: "📊" },
    { href: "/admin/cmo", label: "CMO Dashboard", mobileLabel: "CMO", icon: "🧭" },
    { href: "/admin/vault", label: "Integration Vault", mobileLabel: "Vault", icon: "🔐" },
  ];

  // Mobile bottom bar only has room for 4 anchors -- the 3 highest-traffic
  // destinations stay pinned, everything else lives behind "More".
  const MOBILE_PRIMARY_HREFS = ["/admin", "/admin/tasks", "/admin/clients"];
  const primaryLinks = NAV_LINKS.filter((l) => MOBILE_PRIMARY_HREFS.includes(l.href));
  const moreLinks = NAV_LINKS.filter((l) => !MOBILE_PRIMARY_HREFS.includes(l.href));
  const isInMoreSection = moreLinks.some((l) => isPathActive(l.href)) || isBvmActive;

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
                {typeof link.icon === "string" ? <span>{link.icon}</span> : <link.icon className="w-4 h-4 shrink-0" />} {link.label}
              </Link>
            ))}

            {/* 🏢 BVM Business — collapsible group of 6 subtabs */}
            <div>
              <button
                type="button"
                onClick={() => setBvmOpen((v) => !v)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all font-bold ${
                  isBvmActive
                    ? "bg-emerald-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.3)] border border-emerald-500/30"
                    : "text-gray-400 dark:text-gray-400 light:text-slate-600 hover:text-white dark:hover:text-white light:hover:text-slate-900 hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-slate-900/5 border border-transparent"
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">BVM Business</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${bvmOpen ? "rotate-180" : ""}`} />
              </button>
              {bvmOpen && (
                <div className="ml-3 mt-1 space-y-1 border-l border-slate-200/80 dark:border-slate-800/80 pl-3">
                  {BVM_LINKS.map((link) => (
                    <Link key={link.href} href={link.href} className={getLinkStyles(link.href)}>
                      <span>{link.icon}</span> {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>
        </div>

        <div className="border-t border-slate-200/80 dark:border-slate-800/80 pt-4 space-y-4">
          <Link
            href="/admin/tasks?focus=1"
            className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-3 py-2.5 rounded-xl w-full"
          >
            <FocusIcon className="w-3.5 h-3.5" /> Focus Mode
          </Link>
          <div>
            <span className="text-[10px] text-gray-500 dark:text-gray-500 light:text-slate-500 font-mono uppercase block">SECURE OPERATOR FRAME</span>
            <span className="text-[9px] text-emerald-400/50 font-mono uppercase block mt-0.5">NODE_STATUS: ACTIVE</span>
          </div>
        </div>
      </aside>

      {/* 📱 MOBILE BOTTOM NAVIGATION BAR — 3 primary anchors + "More" drawer */}
      <nav className="fixed bottom-0 left-0 right-0 h-[calc(4.25rem+env(safe-area-inset-bottom))] bg-black/90 dark:bg-black/90 light:bg-[#F1F5F2]/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800/80 grid grid-cols-4 z-40 md:hidden no-print pb-[env(safe-area-inset-bottom)]">
        {primaryLinks.map((link) => (
          <Link key={link.href} href={link.href} className={getMobileLinkStyles(isPathActive(link.href))}>
            {typeof link.icon === "string" ? (
              <span className="text-lg">{link.icon}</span>
            ) : (
              <link.icon className="w-[18px] h-[18px]" />
            )}
            <span>{link.mobileLabel}</span>
          </Link>
        ))}
        <button type="button" onClick={() => setMoreOpen(true)} className={getMobileLinkStyles(isInMoreSection)}>
          <MoreHorizontal className="w-[18px] h-[18px]" />
          <span>More</span>
        </button>
      </nav>

      {/* "More" drawer — secondary destinations, mobile only */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden no-print flex items-end" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full bg-black/95 light:bg-[#F1F5F2] border-t border-slate-200/80 dark:border-slate-800/80 rounded-t-2xl p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-mono uppercase text-gray-500">More</span>
              <button onClick={() => setMoreOpen(false)} className="text-gray-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            {moreLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMoreOpen(false)}
                className={getLinkStyles(link.href)}
              >
                {typeof link.icon === "string" ? <span>{link.icon}</span> : <link.icon className="w-4 h-4 shrink-0" />} {link.label}
              </Link>
            ))}
            <div className="pt-1 mt-1 border-t border-slate-200/80 dark:border-slate-800/80">
              <span className="text-[10px] font-mono uppercase text-gray-500 px-3 block pb-1">BVM Business</span>
              {BVM_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMoreOpen(false)}
                  className={getLinkStyles(link.href)}
                >
                  <span>{link.icon}</span> {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ThemeToggle only ships inside the desktop aside above (hidden below
          md), so it's otherwise unreachable on mobile — this floating button
          is the only theme control available under the md breakpoint. Offset
          by safe-area-inset-top so it clears the device status bar/notch. */}
      <div className="fixed top-[calc(1rem+env(safe-area-inset-top))] right-4 z-40 md:hidden no-print">
        <ThemeToggle />
      </div>

      {/* Global Focus Mode quick-launch for mobile — desktop version lives in
          the sidebar footer above. Sits above the bottom nav bar. */}
      <Link
        href="/admin/tasks?focus=1"
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-40 md:hidden no-print flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-3 py-2 rounded-full shadow-lg"
      >
        <FocusIcon className="w-3.5 h-3.5" /> Focus Mode
      </Link>
    </>
  );
}

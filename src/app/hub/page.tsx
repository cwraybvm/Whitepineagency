'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Fira_Code } from 'next/font/google';
import {
  ShieldCheck,
  Users,
  PackageCheck,
  PlayCircle,
  Building2,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';

const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
});

interface Module {
  key: string;
  hotkey: string;
  title: string;
  description: string;
  href: string;
  badge: string;
  status: string;
  accent: string;
  glow: string;
  icon: LucideIcon;
}

const MODULES: Module[] = [
  {
    key: 'admin',
    hotkey: '1',
    title: 'Admin Operations',
    description: 'Command console for pipeline, quoting, and telemetry across every account.',
    href: '/admin',
    badge: 'INTERNAL OPS',
    status: 'System Nominal',
    accent: '#0EA5E9',
    glow: 'shadow-[0_0_60px_-15px_rgba(14,165,233,0.5)]',
    icon: ShieldCheck,
  },
  {
    key: 'crm',
    hotkey: '2',
    title: 'CRM & Pipeline',
    description: 'Lead capture, scoring, and dispatch across every active channel.',
    href: '/crm',
    badge: 'SALES & LEADS',
    status: 'Active — 38 Leads',
    accent: '#10B981',
    glow: 'shadow-[0_0_60px_-15px_rgba(16,185,129,0.5)]',
    icon: Users,
  },
  {
    key: 'fulfillment',
    hotkey: '3',
    title: 'Fulfillment Center',
    description: 'Production board tracking every deliverable from intake to launch.',
    href: '/fulfillment',
    badge: 'PRODUCTION',
    status: 'SLA 99.4%',
    accent: '#F59E0B',
    glow: 'shadow-[0_0_60px_-15px_rgba(245,158,11,0.5)]',
    icon: PackageCheck,
  },
  {
    key: 'demo',
    hotkey: '4',
    title: 'Demo & Sales Portal',
    description: 'Live prospect simulations for missed-call text-back and AI receptionist demos.',
    href: '/demo/simulator',
    badge: 'PROSPECTING',
    status: 'Shadow Mode Available',
    accent: '#A855F7',
    glow: 'shadow-[0_0_60px_-15px_rgba(168,85,247,0.5)]',
    icon: PlayCircle,
  },
  {
    key: 'portal',
    hotkey: '5',
    title: 'Client Portal Experience',
    description: 'The white-labeled dashboard every client sees — metrics, leads, reports.',
    href: '/portal/dashboard',
    badge: 'CLIENT FACING',
    status: '24 Orgs Live',
    accent: '#3B82F6',
    glow: 'shadow-[0_0_60px_-15px_rgba(59,130,246,0.5)]',
    icon: Building2,
  },
];

export default function HubPage() {
  const router = useRouter();
  const hotkeyMap = useMemo(
    () => new Map(MODULES.map((m) => [m.hotkey, m.href])),
    []
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isTyping) return;

      const href = hotkeyMap.get(e.key);
      if (href) router.push(href);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hotkeyMap, router]);

  return (
    <div
      className={`${firaCode.variable} relative min-h-screen overflow-hidden bg-[#0F172A] text-gray-200 antialiased`}
    >
      <div className="absolute inset-0 cyber-grid pointer-events-none z-0 opacity-30" />
      <div className="absolute top-0 right-1/4 w-[700px] h-[700px] bg-indigo-500/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-[160px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-16 md:py-24">
        <header className="mb-14 text-center">
          <p className="font-mono text-xs tracking-[0.3em] text-sky-400 uppercase mb-3">
            White Pine Executive Suite
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
            Executive Suite Launchpad
          </h1>
          <p className="mt-4 text-gray-400 max-w-xl mx-auto">
            One console into every module. Press{' '}
            <kbd className="font-mono px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-gray-200">
              1
            </kbd>
            –
            <kbd className="font-mono px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-gray-200">
              5
            </kbd>{' '}
            to launch instantly.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.key}
                onClick={() => router.push(mod.href)}
                className={`group relative flex flex-col items-start text-left rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-1 ${mod.glow}`}
              >
                <div className="absolute top-4 right-4 font-mono text-[10px] w-6 h-6 flex items-center justify-center rounded-md bg-white/5 border border-white/10 text-gray-400 group-hover:text-white group-hover:border-white/30 transition-colors">
                  {mod.hotkey}
                </div>

                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{ backgroundColor: `${mod.accent}1A`, color: mod.accent }}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <span
                  className="font-mono text-[10px] tracking-[0.2em] uppercase px-2 py-1 rounded-full border mb-3"
                  style={{
                    color: mod.accent,
                    borderColor: `${mod.accent}40`,
                    backgroundColor: `${mod.accent}14`,
                  }}
                >
                  {mod.badge}
                </span>

                <h2 className="text-lg font-semibold text-white mb-1.5">{mod.title}</h2>
                <p className="text-sm text-gray-400 leading-relaxed mb-5">{mod.description}</p>

                <div className="mt-auto flex items-center justify-between w-full pt-4 border-t border-white/10">
                  <span className="flex items-center gap-2 text-xs text-gray-300">
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: mod.accent }}
                    />
                    {mod.status}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium text-gray-300 group-hover:text-white transition-colors">
                    Launch
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

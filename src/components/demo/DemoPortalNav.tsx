'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PhoneMissed, Search, AudioWaveform } from 'lucide-react';

const TABS = [
  { href: '/demo/simulator', label: 'Text-Back Simulator', icon: PhoneMissed },
  { href: '/demo/audit-generator', label: 'Audit Generator', icon: Search },
  { href: '/demo/voice-simulator', label: 'Voice AI Simulator', icon: AudioWaveform },
];

export default function DemoPortalNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2 font-mono text-[11px]">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${
              active
                ? 'bg-purple-600 border-purple-500 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-3 h-3" /> {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

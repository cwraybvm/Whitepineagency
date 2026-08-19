'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import IssueTicker from '@/components/bvm/IssueTicker';
import { BVM_LINKS } from '@/components/AdminNav';

export default function BvmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative">
      <div className="px-6 pt-[calc(max(24px,env(safe-area-inset-top))+20px)] md:px-8 md:pt-4 max-w-6xl mx-auto space-y-3">
        <IssueTicker />

        {/* Subtab strip -- desktop already has the BVM Business drawer in
            AdminNav, so this swipeable row only needs to render on mobile. */}
        <nav className="md:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-6 px-6">
          {BVM_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-mono font-bold whitespace-nowrap ${
                  active ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-400'
                }`}
              >
                <span>{link.icon}</span> {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}

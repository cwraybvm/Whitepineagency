'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

export interface BvmIssue {
  id: string;
  issueName: string;
  deadlineDate: string;
  adSpaceGoal: number;
  adSpaceSold: number;
}

function daysUntil(dateStr: string): number {
  const deadline = new Date(dateStr);
  const now = new Date();
  const ms = deadline.setHours(23, 59, 59, 999) - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

// Next upcoming deadline (today or later); falls back to the most recent
// past issue if nothing is upcoming so the banner still shows something.
export function pickActiveIssue(issues: BvmIssue[]): BvmIssue | null {
  if (issues.length === 0) return null;
  const now = Date.now();
  const upcoming = issues.filter((i) => new Date(i.deadlineDate).getTime() >= now).sort((a, b) => new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime());
  if (upcoming.length > 0) return upcoming[0];
  return [...issues].sort((a, b) => new Date(b.deadlineDate).getTime() - new Date(a.deadlineDate).getTime())[0];
}

export default function IssueTicker() {
  const [issue, setIssue] = useState<BvmIssue | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/bvm/issues')
      .then((res) => res.json())
      .then((data: BvmIssue[]) => setIssue(pickActiveIssue(data)))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || !issue) return null;

  const days = daysUntil(issue.deadlineDate);
  const pct = issue.adSpaceGoal > 0 ? Math.round((issue.adSpaceSold / issue.adSpaceGoal) * 100) : 0;
  const urgent = days <= 3;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold border ${
        urgent ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
      }`}
    >
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span>
        ⏳ {days} day{days === 1 ? '' : 's'} left until {issue.issueName} Deadline — {pct}% Ad Space Sold (
        ${issue.adSpaceSold.toLocaleString()} / ${issue.adSpaceGoal.toLocaleString()})
      </span>
    </div>
  );
}

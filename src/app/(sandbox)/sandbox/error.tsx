'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

// Next.js app-router error boundary — catches any uncaught render/effect
// error under /sandbox and shows a recoverable state instead of the
// framework's generic "Application error" screen.
export default function SandboxError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[SANDBOX_ERROR_BOUNDARY]', error);
  }, [error]);

  return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Creative Sandbox couldn't load</h2>
        <p className="text-sm text-slate-400">
          Something went wrong loading this view. This has been logged — try again below.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Try again
        </button>
      </div>
    </div>
  );
}

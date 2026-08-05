// src/components/sandbox/SkeletonLoader.tsx

function RowSkeleton() {
  return (
    <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-5 flex items-center gap-4 animate-pulse">
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 w-1/3 bg-slate-300/70 dark:bg-slate-800 rounded" />
        <div className="h-3 w-2/3 bg-slate-200/70 dark:bg-slate-800/60 rounded" />
      </div>
      <div className="h-8 w-32 bg-slate-200/70 dark:bg-slate-800 rounded-lg shrink-0" />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-white/85 dark:bg-[#121824]/75 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/70 border-t-white/80 dark:border-t-white/10 shadow-sm dark:shadow-md dark:shadow-black/20 rounded-xl p-5 space-y-3 animate-pulse">
      <div className="h-4 w-1/2 bg-slate-300/70 dark:bg-slate-800 rounded" />
      <div className="h-3 w-full bg-slate-200/70 dark:bg-slate-800/60 rounded" />
      <div className="h-3 w-3/4 bg-slate-200/70 dark:bg-slate-800/60 rounded" />
      <div className="h-6 w-24 bg-slate-200/70 dark:bg-slate-800 rounded-full" />
    </div>
  );
}

export default function SkeletonLoader({ variant, count = 3 }: { variant: 'card' | 'row'; count?: number }) {
  const items = Array.from({ length: count });
  if (variant === 'card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((_, i) => <RowSkeleton key={i} />)}
    </div>
  );
}

import { Lock } from 'lucide-react';
import { FEATURE_LABELS, type FeatureKey } from '@/config/tenantFeatures';

export default function FeatureLockedPlaceholder({ feature }: { feature: FeatureKey }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 p-12 max-w-md mx-auto">
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <Lock className="w-5 h-5 text-slate-400" />
      </div>
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Feature Not Included in Your Plan</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {FEATURE_LABELS[feature]} isn&apos;t part of your current plan. Contact your account manager to upgrade and unlock it.
      </p>
    </div>
  );
}

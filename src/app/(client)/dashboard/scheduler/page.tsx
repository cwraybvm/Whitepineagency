import { getCurrentTenant } from '@/config/clientConfig';
import FeatureGuard from '@/components/FeatureGuard';
import FeatureLockedPlaceholder from '@/components/FeatureLockedPlaceholder';
import SchedulerDashboard from '@/components/SchedulerDashboard';

export default async function SchedulerPage() {
  const tenant = await getCurrentTenant();

  return (
    <FeatureGuard feature="scheduler" fallback={<FeatureLockedPlaceholder feature="scheduler" />}>
      <SchedulerDashboard primaryColor={tenant.primaryColor} />
    </FeatureGuard>
  );
}

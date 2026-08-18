import { getCurrentTenant } from '@/config/clientConfig';
import FeatureGuard from '@/components/FeatureGuard';
import FeatureLockedPlaceholder from '@/components/FeatureLockedPlaceholder';
import CmoStrategyDashboard from '@/components/CmoStrategyDashboard';

export default async function CmoStrategyPage() {
  const tenant = await getCurrentTenant();

  return (
    <FeatureGuard feature="cmo" fallback={<FeatureLockedPlaceholder feature="cmo" />}>
      <CmoStrategyDashboard primaryColor={tenant.primaryColor} orgName={tenant.name} />
    </FeatureGuard>
  );
}

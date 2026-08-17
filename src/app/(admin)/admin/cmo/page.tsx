import CmoExecutiveDashboard from '@/components/CmoExecutiveDashboard';

// /admin/* is OWNER-gated by src/proxy.ts, and /api/cmo/kpis enforces the
// same requireOwner() check server-side — page needs no extra auth here.
export default function AdminCmoPage() {
  return (
    <div className="p-3 sm:p-4 max-w-7xl mx-auto">
      <CmoExecutiveDashboard organizationId="default-org" />
    </div>
  );
}

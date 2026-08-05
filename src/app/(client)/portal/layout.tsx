import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fira_Code } from "next/font/google";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import TenantTheme from "@/components/portal/TenantTheme";

// design-system/white-pine-portal/pages/portal.md — Flat Design, trust-blue, light-mode default.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
});
const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "White Pine Portal",
  description: "Client Portal",
};

type OrgBranding = { name: string | null; primaryColor: string | null };

// Resolves the tenant by host first (x-tenant-slug/x-tenant-domain, set in
// src/proxy.ts from the request's subdomain or custom domain), falling back
// to the org_id cookie used by the internal app/demo-auth flow.
async function getOrgBranding(): Promise<OrgBranding> {
  const headerStore = await headers();
  const tenantSlug = headerStore.get("x-tenant-slug");
  const tenantDomain = headerStore.get("x-tenant-domain");
  const select = { name: true, primaryColor: true };

  if (tenantDomain) {
    const byDomain = await prisma.organization
      .findFirst({ where: { customDomain: tenantDomain }, select })
      .catch(() => null);
    if (byDomain) return byDomain;
  }

  if (tenantSlug) {
    const bySubdomain = await prisma.organization
      .findUnique({ where: { slug: tenantSlug }, select })
      .catch(() => null);
    if (bySubdomain) return bySubdomain;
  }

  const cookieStore = await cookies();
  const orgIdCookie = cookieStore.get("org_id")?.value;
  if (!orgIdCookie) return { name: null, primaryColor: null };

  const byId = await prisma.organization
    .findUnique({ where: { id: orgIdCookie }, select })
    .catch(() => null);
  if (byId) return byId;

  const bySlug = await prisma.organization
    .findUnique({ where: { slug: orgIdCookie }, select })
    .catch(() => null);
  return bySlug ?? { name: null, primaryColor: null };
}

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { name: orgName, primaryColor } = await getOrgBranding();

  return (
    <div
      className={`${jakarta.variable} ${firaCode.variable} font-sans min-h-screen bg-[#F8FAFC] text-[#1E293B] antialiased`}
      style={
        {
          "--color-primary": "#2563EB",
          "--color-on-primary": "#FFFFFF",
          "--color-secondary": "#3B82F6",
          "--color-accent": "#EA580C",
          "--color-background": "#F8FAFC",
          "--color-foreground": "#1E293B",
          "--color-muted": "#E9EFF8",
          "--color-border": "#E2E8F0",
          "--color-destructive": "#DC2626",
          "--color-ring": "#2563EB",
        } as React.CSSProperties
      }
    >
      <TenantTheme primaryColor={primaryColor}>
        {orgName && (
          <div className="border-b border-[var(--color-border)] px-6 py-3 text-sm font-medium text-[var(--color-foreground)]">
            {orgName}
          </div>
        )}
        <main className="min-h-screen">{children}</main>
      </TenantTheme>
    </div>
  );
}

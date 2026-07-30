import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fira_Code } from "next/font/google";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

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

async function getOrgName(): Promise<string | null> {
  const cookieStore = await cookies();
  const orgIdCookie = cookieStore.get("org_id")?.value;
  if (!orgIdCookie) return null;

  const byId = await prisma.organization
    .findUnique({ where: { id: orgIdCookie }, select: { name: true } })
    .catch(() => null);
  if (byId) return byId.name;

  const bySlug = await prisma.organization
    .findUnique({ where: { slug: orgIdCookie }, select: { name: true } })
    .catch(() => null);
  return bySlug?.name ?? null;
}

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const orgName = await getOrgName();

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
      {orgName && (
        <div className="border-b border-[var(--color-border)] px-6 py-3 text-sm font-medium text-[var(--color-foreground)]">
          {orgName}
        </div>
      )}
      <main className="min-h-screen">{children}</main>
    </div>
  );
}

import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fira_Code } from "next/font/google";
import { getCurrentTenant } from "@/config/clientConfig";
import TenantTheme from "@/components/portal/TenantTheme";
import { TenantProvider } from "@/components/TenantProvider";

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

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getCurrentTenant();

  return (
    <div
      className={`${jakarta.variable} ${firaCode.variable} font-sans min-h-screen bg-[#F8FAFC] text-[#1E293B] antialiased`}
      style={
        {
          "--color-primary": tenant.primaryColor || "#2563EB",
          "--color-on-primary": "#FFFFFF",
          "--color-secondary": "#3B82F6",
          "--color-accent": tenant.accentColor || "#EA580C",
          "--color-background": "#F8FAFC",
          "--color-foreground": "#1E293B",
          "--color-muted": "#E9EFF8",
          "--color-border": "#E2E8F0",
          "--color-destructive": "#DC2626",
          "--color-ring": "#2563EB",
          "--primary-color": tenant.primaryColor || "#2563EB",
          "--accent-color": tenant.accentColor || "#EA580C",
        } as React.CSSProperties
      }
    >
      <TenantProvider tenant={tenant}>
        <TenantTheme primaryColor={tenant.primaryColor}>
          {tenant.id !== "default" && (
            <div className="border-b border-[var(--color-border)] px-6 py-3 text-sm font-medium text-[var(--color-foreground)]">
              {tenant.name}
            </div>
          )}
          <main className="min-h-screen">{children}</main>
        </TenantTheme>
      </TenantProvider>
    </div>
  );
}

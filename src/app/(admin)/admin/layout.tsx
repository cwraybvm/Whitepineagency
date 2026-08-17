import type { Metadata } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import AdminNav from "@/components/AdminNav";
import AdminCommandPalette from "@/components/admin/AdminCommandPalette";
import BillingTimerWidget from "@/components/BillingTimerWidget";

// design-system/white-pine-portal/MASTER.md + pages/admin.md — Data-Dense Dashboard, navy/Fira.
const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
});
const firaSans = Fira_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "White Pine Admin Console",
  description: "Intelligent Operator Terminal",
  icons: {
    icon: [
      { url: "/admin-icon.png?v=admin-1", sizes: "192x192", type: "image/png" }
    ],
    apple: [
      { url: "/admin-icon.png?v=admin-1", sizes: "192x192", type: "image/png" }
    ]
  }
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`admin-console ${firaCode.variable} ${firaSans.variable} font-sans flex bg-slate-950 dark:bg-slate-950 light:bg-slate-50 min-h-screen text-slate-100 dark:text-slate-100 light:text-slate-900 antialiased relative overflow-hidden before:content-[''] before:absolute before:top-0 before:right-1/4 before:w-[500px] before:h-[500px] before:bg-emerald-500/5 before:blur-[120px] before:pointer-events-none before:-z-10`}
      style={
        {
          "--color-primary": "#0F172A",
          "--color-on-primary": "#FFFFFF",
          "--color-secondary": "#334155",
          "--color-accent": "#0369A1",
          "--color-background": "#F8FAFC",
          "--color-foreground": "#020617",
          "--color-muted": "#E8ECF1",
          "--color-border": "#E2E8F0",
          "--color-destructive": "#DC2626",
          "--color-ring": "#0F172A",
        } as React.CSSProperties
      }
    >

      {/* Shared Design Grid Canvas */}
      <div className="absolute inset-0 cyber-grid pointer-events-none z-0 opacity-30" />
      <div className="absolute top-0 right-1/4 w-[700px] h-[700px] bg-indigo-500/5 rounded-full blur-[160px] pointer-events-none" />

      {/* 🧭 Responsive Navigation Sidebar & Bottom Bar */}
      <AdminNav />

      {/* 💻 MAIN DYNAMIC CONTENT CONTAINER */}
      <main className="flex-1 overflow-y-auto relative z-10 w-full pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
        {children}
      </main>

      {/* ⌘K GLOBAL COMMAND PALETTE — available on every /admin/* route */}
      <AdminCommandPalette />
      <BillingTimerWidget />

    </div>
  );
}
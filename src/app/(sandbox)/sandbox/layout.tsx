import type { Metadata } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import AdminNav from "@/components/AdminNav";
import AdminCommandPalette from "@/components/admin/AdminCommandPalette";

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
  title: "White Pine Creative Sandbox",
  description: "AI Creative Sandbox Workspace",
};

export default function SandboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`admin-console ${firaCode.variable} ${firaSans.variable} font-sans flex bg-[#0F172A] min-h-screen text-gray-200 antialiased relative overflow-hidden`}
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
      <div className="absolute inset-0 cyber-grid pointer-events-none z-0 opacity-30" />
      <div className="absolute top-0 right-1/4 w-[700px] h-[700px] bg-indigo-500/5 rounded-full blur-[160px] pointer-events-none" />

      <AdminNav />

      <main className="flex-1 overflow-y-auto relative z-10 w-full pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
        {children}
      </main>

      <AdminCommandPalette />
    </div>
  );
}

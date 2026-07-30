import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


// ─── NEXT.JS 14+ VIEWPORT CONFIGURATION ───
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0B0F17",
};

// ─── ROOT METADATA ───
export const metadata: Metadata = {
  title: "White Pine Portal",
  description: "Lead Management System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "White Pine Portal",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("dark", "font-sans", geist.variable)}>
      <body className="antialiased bg-[#0B0F17] text-gray-200">
        {/* 🔔 SONNER DARK TOAST NOTIFICATIONS */}
        <Toaster 
          position="top-center" 
          theme="dark"
          richColors
          toastOptions={{
            style: {
              background: "#090D16",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#ffffff",
              borderRadius: "1rem",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "0.75rem",
            },
          }}
        />

        {children}
      </body>
    </html>
  );
}
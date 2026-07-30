import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  /* Keep any of your existing configuration settings here safely */
};

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  disable: false, 
  workboxOptions: {
    skipWaiting: true, // Moved inside workboxOptions where TypeScript expects it!
  }
});

export default pwaConfig(nextConfig);
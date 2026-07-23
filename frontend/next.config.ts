import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["gnomologic-zita-unarduously.ngrok-free.dev"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

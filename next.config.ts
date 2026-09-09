import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows loading the dev server from other devices on the LAN (e.g. testing
  // the QR scanner from a phone at http://<your-lan-ip>:3000).
  allowedDevOrigins: ["172.20.10.6"],
};

export default nextConfig;

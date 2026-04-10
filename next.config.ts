import type { NextConfig } from "next";

// Đọc .env từ project root (override cả biến env hệ thống)
import { readFileSync } from "fs";
import { resolve } from "path";
import dotenv from "dotenv";

const envPath = resolve(process.cwd(), ".env");
const envConfig = dotenv.config({ path: envPath, override: true });

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Ghi đè biến env hệ thống bằng giá trị từ .env
  env: envConfig.parsed,
  // 🔒 Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
    ];
  },
};

export default nextConfig;

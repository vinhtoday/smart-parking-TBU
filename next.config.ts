import type { NextConfig } from "next";

// Đọc .env từ project root (override cả biến env hệ thống)
import { resolve } from "path";
import dotenv from "dotenv";

const envPath = resolve(process.cwd(), ".env");
const envConfig = dotenv.config({ path: envPath, override: true });

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  // Ghi đè biến env hệ thống bằng giá trị từ .env
  env: envConfig.parsed,
  // Force Next.js to transpile date-fns so internal relative imports resolve correctly
  transpilePackages: ['date-fns', '@date-fns/tz', 'react-day-picker'],
  // Turbopack config
  turbopack: {
    resolveExtensions: [".js", ".mjs", ".ts", ".tsx", ".jsx"],
  },
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
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' ws: wss: http://localhost:*; frame-ancestors 'none';" },
        ],
      },
    ];
  },
};

export default nextConfig;

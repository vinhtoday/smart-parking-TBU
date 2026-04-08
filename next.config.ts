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
};

export default nextConfig;

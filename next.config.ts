import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // 🟢 دور زدن خطای SSRF و آی‌پی داخلی در اینترنت ایران
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // اجازه لود عکس از تمامی دامنه‌ها برای محیط تستی
      },
    ],
  },
};

export default nextConfig;
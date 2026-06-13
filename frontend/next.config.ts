import type { NextConfig } from "next";

const isExport = process.env.BUILD_MODE === "export";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: isExport ? "export" : "standalone",
  basePath: isExport ? basePath : "",
  images: isExport ? { unoptimized: true } : {},
  experimental: {
    optimizePackageImports: ["recharts", "lucide-react"],
  },
  ...(isExport
    ? {}
    : {
        async headers() {
          return [
            {
              source: "/(.*)",
              headers: [
                { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
                { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;

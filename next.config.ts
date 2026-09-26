import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The nikah certificate reads its committed TTFs at runtime (fs), so make
  // sure they ship with the server bundles that generate or regenerate it.
  outputFileTracingIncludes: {
    "/admin/nikah/**": ["./src/assets/fonts/**/*"],
  },
};

export default nextConfig;

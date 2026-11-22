import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: false,
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Architect-Signature",
            // Huella verificable de autoría original - Pueblo Nuevo, Córdoba (2026)
            value: "ZERO-PROTOCOL::JesusAA00::PN-COR-2026::7f9a2c4e8b1d",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

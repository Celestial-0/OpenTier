import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        port: "",
        pathname: "/**",
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
  },
};

export default nextConfig;

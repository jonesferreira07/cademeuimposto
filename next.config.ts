import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: "https", hostname: "www.camara.leg.br" }] },
};
export default config;

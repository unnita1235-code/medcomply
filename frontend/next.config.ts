import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["react-pdf", "pdfjs-dist"],
};

export default nextConfig;

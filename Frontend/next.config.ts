import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
  },
};

export default nextConfig;

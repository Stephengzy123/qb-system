import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/dashboard", destination: "/admin/dashboard", permanent: false },
      { source: "/question-bank/:path*", destination: "/admin/question-bank/:path*", permanent: false },
      { source: "/classes/:path*", destination: "/admin/classes/:path*", permanent: false },
      { source: "/assignments/:path*", destination: "/admin/assignments/:path*", permanent: false },
      { source: "/attention", destination: "/admin/attention", permanent: false },
      { source: "/audit-logs/:path*", destination: "/admin/audit-logs/:path*", permanent: false },
      { source: "/settings", destination: "/admin/settings", permanent: false },
    ];
  },
};

export default nextConfig;

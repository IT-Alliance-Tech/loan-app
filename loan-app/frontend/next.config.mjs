import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  turbopack: {},
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://loan-app-dev-ofvk.onrender.com/api/:path*",
      },
    ];
  },
};

export default withPWA(nextConfig);

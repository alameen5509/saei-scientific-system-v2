/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Prisma 7 يولّد العميل إلى src/generated/prisma
  // experimental.outputFileTracingIncludes يضمن تضمين العميل المولَّد
  // في bundle الـserverless functions على Vercel
  experimental: {
    outputFileTracingIncludes: {
      "/api/**": ["./src/generated/prisma/**/*"],
    },
  },

  // — aliases لـURLs بديلة شائعة —
  // /works و /announce اختصارات تتوقعها بعض الواجهات؛ الـcanonical هو /projects و /announcements
  async redirects() {
    return [
      { source: "/works", destination: "/projects", permanent: false },
      { source: "/works/:path*", destination: "/projects/:path*", permanent: false },
    ];
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
let nextConfig = {
  reactStrictMode: true,
};

// Optional PWA (disabled by default in dev). Enable with NEXT_PWA=1
if (process.env.NEXT_PWA === '1') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const withPWA = require('next-pwa')({
      dest: 'public',
      disable: process.env.NODE_ENV !== 'production',
    });
    nextConfig = withPWA(nextConfig);
  } catch (e) {
    console.warn('[pwa] next-pwa not installed; skipping PWA setup');
  }
}

export default nextConfig;

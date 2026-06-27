import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next 14's webpack does not honor the tsconfig `@/*` -> `src/*` path mapping
  // under moduleResolution:"bundler"; resolve the alias explicitly so `next build`
  // (production) matches `next dev`. Without this, production builds fail with
  // "Module not found: Can't resolve '@/...'". See BIT-288.
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
};

export default nextConfig;

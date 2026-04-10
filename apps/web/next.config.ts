import type { NextConfig } from 'next';

const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL ?? '';

const cspDirectives = [
  "default-src 'self'",
  // unsafe-eval is required by Next.js HMR in development; strip in production via build-time env
  `script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ''} tokenization.payrillagateway.com services.nofraud.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: https: ${cdnUrl}`.trim(),
  "font-src 'self' fonts.gstatic.com",
  `connect-src 'self' ${apiUrl} tokenization.payrillagateway.com services.nofraud.com`.trim(),
  'frame-src tokenization.payrillagateway.com',
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
]
  .map((d) => d.trim())
  .join('; ');

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: cspDirectives },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

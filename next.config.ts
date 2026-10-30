import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

// The Telegram bot's manual check runs the dev server behind a Cloudflare
// quick tunnel (see README), which serves it from a *.trycloudflare.com host.
const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.trycloudflare.com'],
};

export default withNextIntl(nextConfig);

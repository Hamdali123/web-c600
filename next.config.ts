import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['ssh2', 'telnet-client'],
  async rewrites() {
    return [
      { source: '/locations/listing', destination: '/settings/zones' },
      { source: '/odbs/listing', destination: '/settings/odbs' },
      { source: '/onu_types/listing', destination: '/settings/onu-types' },
      { source: '/speed_profiles', destination: '/settings/speed-profiles' },
      { source: '/olt', destination: '/settings/olts' },
      { source: '/system_config', destination: '/settings/vpn-tr069' },
      { source: '/onu_authorization_presets/listing', destination: '/settings/auth-presets' },
      { source: '/general', destination: '/settings/general?tab=general' },
      { source: '/general/listing/api_key', destination: '/settings/general?tab=api_key' },
      { source: '/api_stats', destination: '/settings/general?tab=api_logs' },
      { source: '/general/listing/billing', destination: '/settings/general?tab=billing' },
      { source: '/reports/authorizations/list', destination: '/reports/authorizations' },
      { source: '/reports/tasks', destination: '/tasks' },
      { source: '/auth', destination: '/settings/general?tab=users' },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/dev.db', '**/dev.db-journal', '**/node_modules'],
      };
    }
    return config;
  }
};

export default nextConfig;

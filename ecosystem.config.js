module.exports = {
  apps: [
    {
      name: 'smartolt-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'dev -H 0.0.0.0 -p 3009',
      cwd: '/home/sanwanay/smartolt_baru',
      env: {
        NODE_ENV: 'development',
        PORT: 3009
      }
    },
    {
      name: 'smartolt-terminal',
      script: 'node_modules/ts-node/dist/bin.js',
      args: "--compiler-options '{\"module\":\"CommonJS\"}' terminal-server.ts",
      cwd: '/home/sanwanay/smartolt_baru',
      env: {
        NODE_ENV: 'development',
        PORT: 3010
      }
    }
  ]
};

module.exports = {
  apps: [
    {
      name: 'parking-web',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: __dirname,
      env: { NODE_ENV: 'production', PORT: 3000 },
      watch: false,
    },
    {
      name: 'parking-ws',
      script: 'src/mini-services/parking-ws.js',
      cwd: __dirname,
      env: { NODE_ENV: 'production' },
      watch: false,
    },
    {
      name: 'parking-serial',
      script: 'src/mini-services/parking-serial.js',
      cwd: __dirname,
      env: { NODE_ENV: 'production' },
      watch: false,
    },
  ],
}

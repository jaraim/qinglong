module.exports = {
  apps: [
    {
      name: 'main',
      max_restarts: 10,
      kill_timeout: 15000,
      wait_ready: true,
      listen_timeout: 10000,
      source_map_support: true,
      time: true,
      script: 'static/build/app.js',
      env: {
        http_proxy: '',
        https_proxy: '',
        HTTP_PROXY: '',
        HTTPS_PROXY: '',
        all_proxy: '',
        ALL_PROXY: '',
      },
    },
  ],
};

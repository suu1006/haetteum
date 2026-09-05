module.exports = {
  apps: [
    {
      name: "haetteum-web",
      cwd: "/home/ubuntu/haetteum",
      script: "/usr/bin/pnpm",
      args: "--filter @haetteum/web start",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      max_memory_restart: "512M",
      out_file: "./logs/web-out.log",
      error_file: "./logs/web-error.log",
      time: true,
    },
    {
      name: "haetteum-api",
      cwd: "/home/ubuntu/haetteum",
      script: "/usr/bin/pnpm",
      args: "--filter @haetteum/api start",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      max_memory_restart: "512M",
      out_file: "./logs/api-out.log",
      error_file: "./logs/api-error.log",
      time: true,
    },
  ],
};

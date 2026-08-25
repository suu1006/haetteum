import "dotenv/config";

process.env.NODE_ENV = "test";
process.env.API_PORT ??= "4001";
process.env.WEB_ORIGIN ??= "http://localhost:3000";
process.env.DATABASE_URL ??=
  "postgresql://haetteum:local-development-only@localhost:5432/haetteum";
process.env.TOURISM_SYNC_ENABLED = "false";

export function applyTestEnvironment(environment: NodeJS.ProcessEnv): void {
  environment.NODE_ENV = "test";
  environment.API_PORT = "4001";
  environment.WEB_ORIGIN = "http://localhost:3000";
  environment.KAKAO_REST_API_KEY = "kakao-rest-test-key";
  environment.KAKAO_CLIENT_SECRET = "kakao-client-secret-for-test";
  environment.KAKAO_REDIRECT_URI =
    "http://localhost:4000/api/v1/auth/kakao/callback";
  environment.TOURISM_SYNC_ENABLED = "false";
  delete environment.END_POINT;
  delete environment.SERVICE_KEY;
  environment.DATABASE_URL ??=
    "postgresql://haetteum:local-development-only@localhost:5432/haetteum";
}

applyTestEnvironment(process.env);

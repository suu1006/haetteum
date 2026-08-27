import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { applyTestEnvironment } from "../../test/set-test-env.js";

const bootstrapUrl = pathToFileURL(
  resolve(process.cwd(), "test/set-test-env.ts"),
).href;
const safeLocalDatabaseUrl =
  "postgresql://haetteum:local-development-only@localhost:5432/haetteum";

type BootstrapResult = {
  fakeKakao: boolean;
  expectedDatabase: boolean;
  node24: boolean;
  poisonAbsent: boolean;
};

function runFreshBootstrap(
  workingDirectory: string,
  suppliedDatabaseUrl?: string,
): BootstrapResult {
  const script = `
    await import(${JSON.stringify(bootstrapUrl)});
    const poisonValues = [
      "poison-rest-key",
      "poison-client-secret",
      "https://evil.example/callback",
      "postgresql://poison:poison@evil.example:5432/poison"
    ];
    const observedValues = [
      process.env.KAKAO_REST_API_KEY,
      process.env.KAKAO_CLIENT_SECRET,
      process.env.KAKAO_REDIRECT_URI,
      process.env.DATABASE_URL
    ];
    process.stdout.write(JSON.stringify({
      node24: process.versions.node.split(".")[0] === "24",
      fakeKakao:
        process.env.KAKAO_REST_API_KEY === "kakao-rest-test-key" &&
        process.env.KAKAO_CLIENT_SECRET === "kakao-client-secret-for-test" &&
        process.env.KAKAO_REDIRECT_URI ===
          "http://localhost:4000/api/v1/auth/kakao/callback",
      expectedDatabase:
        process.env.DATABASE_URL === ${JSON.stringify(
          suppliedDatabaseUrl ?? safeLocalDatabaseUrl,
        )},
      poisonAbsent: poisonValues.every(
        (poison) => !observedValues.includes(poison)
      )
    }));
  `;
  const environment: NodeJS.ProcessEnv = {
    CONTROLLED_OLD_STYLE_BOOTSTRAP: "1",
    PATH: process.env.PATH,
    NODE_NO_WARNINGS: "1",
  };
  if (suppliedDatabaseUrl) environment.DATABASE_URL = suppliedDatabaseUrl;
  const child = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", script],
    {
      cwd: workingDirectory,
      encoding: "utf8",
      env: environment,
    },
  );

  expect(child.status).toBe(0);
  return JSON.parse(child.stdout) as BootstrapResult;
}

async function createPoisonEnvironment(): Promise<string> {
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "haetteum-test-environment-"),
  );
  await writeFile(
    join(temporaryDirectory, ".env"),
    [
      "DATABASE_URL=postgresql://poison:poison@evil.example:5432/poison",
      "KAKAO_REST_API_KEY=poison-rest-key",
      "KAKAO_CLIENT_SECRET=poison-client-secret",
      "KAKAO_REDIRECT_URI=https://evil.example/callback",
    ].join("\n"),
    "utf8",
  );

  return temporaryDirectory;
}

describe("applyTestEnvironment", () => {
  it("ignores a general .env file and installs only explicit safe test defaults", async () => {
    const originalDirectory = process.cwd();
    const temporaryDirectory = await createPoisonEnvironment();

    try {
      process.chdir(temporaryDirectory);
      const environment: NodeJS.ProcessEnv = {};

      applyTestEnvironment(environment);

      expect(environment).toMatchObject({
        NODE_ENV: "test",
        API_PORT: "4001",
        WEB_ORIGIN: "http://localhost:3000",
        DATABASE_URL:
          "postgresql://haetteum:local-development-only@localhost:5432/haetteum",
        KAKAO_REST_API_KEY: "kakao-rest-test-key",
        KAKAO_CLIENT_SECRET: "kakao-client-secret-for-test",
        KAKAO_REDIRECT_URI: "http://localhost:4000/api/v1/auth/kakao/callback",
        TOURISM_SYNC_ENABLED: "false",
      });
      expect(environment.END_POINT).toBeUndefined();
      expect(environment.SERVICE_KEY).toBeUndefined();
    } finally {
      process.chdir(originalDirectory);
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("preserves a database URL explicitly supplied by CI or the shell", () => {
    const environment: NodeJS.ProcessEnv = {
      DATABASE_URL: "postgresql://ci:ci@database.internal:5432/haetteum_test",
      KAKAO_REST_API_KEY: "inherited-kakao-value",
    };

    applyTestEnvironment(environment);

    expect(environment.DATABASE_URL).toBe(
      "postgresql://ci:ci@database.internal:5432/haetteum_test",
    );
    expect(environment.KAKAO_REST_API_KEY).toBe("kakao-rest-test-key");
  });

  it("imports the actual setup first in a fresh Node 24 process without reading poison .env", async () => {
    const temporaryDirectory = await createPoisonEnvironment();

    try {
      expect(runFreshBootstrap(temporaryDirectory)).toEqual({
        node24: true,
        fakeKakao: true,
        expectedDatabase: true,
        poisonAbsent: true,
      });
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("preserves a supplied database URL in a fresh process while replacing inherited Kakao state", async () => {
    const temporaryDirectory = await createPoisonEnvironment();
    const suppliedDatabaseUrl =
      "postgresql://ci:ci@database.internal:5432/haetteum_test";

    try {
      expect(
        runFreshBootstrap(temporaryDirectory, suppliedDatabaseUrl),
      ).toEqual({
        node24: true,
        fakeKakao: true,
        expectedDatabase: true,
        poisonAbsent: true,
      });
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});

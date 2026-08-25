import { validateEnvironment } from "./environment.js";

const validEnvironment = {
  NODE_ENV: "test",
  API_PORT: "4000",
  WEB_ORIGIN: "http://localhost:3000",
  DATABASE_URL: "postgresql://haetteum:local@localhost:5432/haetteum",
};

describe("validateEnvironment", () => {
  it("parses and types the API environment", () => {
    expect(validateEnvironment(validEnvironment)).toMatchObject({
      NODE_ENV: "test",
      API_PORT: 4000,
      WEB_ORIGIN: "http://localhost:3000",
    });
  });

  it("rejects a missing database URL", () => {
    const { DATABASE_URL: _removed, ...invalid } = validEnvironment;
    expect(() => validateEnvironment(invalid)).toThrow("DATABASE_URL");
  });

  it("rejects ports outside the TCP range", () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, API_PORT: "70000" }),
    ).toThrow("API_PORT");
  });

  it("allows the API to boot with tourism sync disabled and no provider secret", () => {
    expect(
      validateEnvironment({
        ...validEnvironment,
        END_POINT: "",
        SERVICE_KEY: "",
        TOURISM_SYNC_ENABLED: "false",
      }),
    ).toMatchObject({
      END_POINT: undefined,
      SERVICE_KEY: undefined,
      TOURISM_SYNC_ENABLED: false,
    });
  });

  it("parses an enabled TourAPI configuration", () => {
    expect(
      validateEnvironment({
        ...validEnvironment,
        END_POINT: "https://apis.data.go.kr/B551011/KorService2",
        SERVICE_KEY: "secret-for-test-only",
        TOURISM_SYNC_ENABLED: "true",
      }),
    ).toMatchObject({
      END_POINT: "https://apis.data.go.kr/B551011/KorService2",
      SERVICE_KEY: "secret-for-test-only",
      TOURISM_SYNC_ENABLED: true,
    });
  });

  it("rejects enabled sync without both provider values", () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        TOURISM_SYNC_ENABLED: "true",
      }),
    ).toThrow("END_POINT");
  });

  it("rejects enabled sync with a blank provider secret", () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        END_POINT: "https://apis.data.go.kr/B551011/KorService2",
        SERVICE_KEY: "",
        TOURISM_SYNC_ENABLED: "true",
      }),
    ).toThrow("SERVICE_KEY");
  });

  it("rejects a provider URL outside the approved HTTPS service path", () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        END_POINT: "http://example.com/KorService2",
        SERVICE_KEY: "secret-for-test-only",
        TOURISM_SYNC_ENABLED: "true",
      }),
    ).toThrow("END_POINT");
  });

  it("rejects a provider URL outside the approved TourAPI host", () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        END_POINT: "https://example.com/B551011/KorService2",
        SERVICE_KEY: "secret-for-test-only",
        TOURISM_SYNC_ENABLED: "true",
      }),
    ).toThrow("END_POINT");
  });
});

import { validateEnvironment } from "./environment.js";

const validEnvironment = {
  NODE_ENV: "test",
  API_PORT: "4000",
  WEB_ORIGIN: "http://localhost:3000",
  DATABASE_URL: "postgresql://haetteum:local@localhost:5432/haetteum",
  KAKAO_REST_API_KEY: "kakao-rest-test-key",
  KAKAO_CLIENT_SECRET: "kakao-client-secret-for-test",
  KAKAO_REDIRECT_URI: "http://localhost:4000/api/v1/auth/kakao/callback",
};

describe("validateEnvironment", () => {
  it("parses and types the API environment", () => {
    expect(validateEnvironment(validEnvironment)).toMatchObject({
      NODE_ENV: "test",
      API_PORT: 4000,
      WEB_ORIGIN: "http://localhost:3000",
    });
  });

  it("rejects overallocated daily budgets and permits explicit lower allocations", () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, TOUR_API_DAILY_LIMIT: "100" }),
    ).toThrow("TourAPI job budgets");
    expect(
      validateEnvironment({
        ...validEnvironment,
        TOUR_API_DAILY_LIMIT: "100",
        TOUR_API_TOURISM_DAILY_BUDGET: "70",
        TOUR_API_FESTIVAL_DAILY_BUDGET: "30",
      }),
    ).toMatchObject({ TOUR_API_DAILY_LIMIT: 100 });
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
        TOUR_API_ENDPOINT: "",
        TOUR_API_SERVICE_KEY: "",
        TOURISM_SYNC_ENABLED: "false",
      }),
    ).toMatchObject({
      TOUR_API_ENDPOINT: undefined,
      TOUR_API_SERVICE_KEY: undefined,
      TOURISM_SYNC_ENABLED: false,
    });
  });

  it.each(["KAKAO_REST_API_KEY", "KAKAO_CLIENT_SECRET"] as const)(
    "rejects a missing %s",
    (key) => {
      const invalid = { ...validEnvironment };
      delete invalid[key];

      expect(() => validateEnvironment(invalid)).toThrow(key);
    },
  );

  it("allows the API to boot without a Kakao redirect URI configured", () => {
    const { KAKAO_REDIRECT_URI: _removed, ...withoutRedirectUri } =
      validEnvironment;

    expect(
      validateEnvironment(withoutRedirectUri).KAKAO_REDIRECT_URI,
    ).toBeUndefined();
  });

  it.each([
    "KAKAO_REST_API_KEY",
    "KAKAO_CLIENT_SECRET",
    "KAKAO_REDIRECT_URI",
  ] as const)("rejects a blank %s", (key) => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, [key]: "   " }),
    ).toThrow(key);
  });

  it("allows a localhost callback during development and test", () => {
    expect(
      validateEnvironment({
        ...validEnvironment,
        NODE_ENV: "development",
        KAKAO_REDIRECT_URI: "http://127.0.0.1:4000/api/v1/auth/kakao/callback",
      }),
    ).toMatchObject({
      KAKAO_REDIRECT_URI: "http://127.0.0.1:4000/api/v1/auth/kakao/callback",
    });
  });

  it("rejects an HTTP localhost callback in production", () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        NODE_ENV: "production",
        KAKAO_REDIRECT_URI: "http://localhost:4000/api/v1/auth/kakao/callback",
      }),
    ).toThrow("KAKAO_REDIRECT_URI");
  });

  it("rejects a non-local HTTP Kakao callback", () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        KAKAO_REDIRECT_URI:
          "http://api.haetteum.example/api/v1/auth/kakao/callback",
      }),
    ).toThrow("KAKAO_REDIRECT_URI");
  });

  it("allows an HTTPS Kakao callback outside localhost", () => {
    expect(
      validateEnvironment({
        ...validEnvironment,
        KAKAO_REDIRECT_URI:
          "https://api.haetteum.example/api/v1/auth/kakao/callback",
      }),
    ).toMatchObject({
      KAKAO_REDIRECT_URI:
        "https://api.haetteum.example/api/v1/auth/kakao/callback",
    });
  });

  it("requires the Kakao callback path", () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        KAKAO_REDIRECT_URI: "https://api.haetteum.example/auth/kakao/callback",
      }),
    ).toThrow("KAKAO_REDIRECT_URI");
  });

  it("parses an enabled TourAPI configuration", () => {
    expect(
      validateEnvironment({
        ...validEnvironment,
        TOUR_API_ENDPOINT: "https://apis.data.go.kr/B551011/KorService2",
        TOUR_API_SERVICE_KEY: "secret-for-test-only",
        TOURISM_SYNC_ENABLED: "true",
      }),
    ).toMatchObject({
      TOUR_API_ENDPOINT: "https://apis.data.go.kr/B551011/KorService2",
      TOUR_API_SERVICE_KEY: "secret-for-test-only",
      TOURISM_SYNC_ENABLED: true,
    });
  });

  it("rejects enabled sync without both provider values", () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        TOURISM_SYNC_ENABLED: "true",
      }),
    ).toThrow("TOUR_API_ENDPOINT");
  });

  it("rejects enabled sync with a blank provider secret", () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        TOUR_API_ENDPOINT: "https://apis.data.go.kr/B551011/KorService2",
        TOUR_API_SERVICE_KEY: "",
        TOURISM_SYNC_ENABLED: "true",
      }),
    ).toThrow("TOUR_API_SERVICE_KEY");
  });

  it("rejects a provider URL outside the approved HTTPS service path", () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        TOUR_API_ENDPOINT: "http://example.com/KorService2",
        TOUR_API_SERVICE_KEY: "secret-for-test-only",
        TOURISM_SYNC_ENABLED: "true",
      }),
    ).toThrow("TOUR_API_ENDPOINT");
  });

  it("rejects a provider URL outside the approved TourAPI host", () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        TOUR_API_ENDPOINT: "https://example.com/B551011/KorService2",
        TOUR_API_SERVICE_KEY: "secret-for-test-only",
        TOURISM_SYNC_ENABLED: "true",
      }),
    ).toThrow("TOUR_API_ENDPOINT");
  });

  it("allows the API to boot with place reels disabled and no YouTube key", () => {
    expect(
      validateEnvironment({
        ...validEnvironment,
        YOUTUBE_API_KEY: "",
        PLACE_REELS_ENABLED: "false",
      }),
    ).toMatchObject({
      YOUTUBE_API_KEY: undefined,
      PLACE_REELS_ENABLED: false,
    });
  });

  it("parses an enabled place reels configuration", () => {
    expect(
      validateEnvironment({
        ...validEnvironment,
        YOUTUBE_API_KEY: "youtube-key-for-test",
        PLACE_REELS_ENABLED: "true",
      }),
    ).toMatchObject({
      YOUTUBE_API_KEY: "youtube-key-for-test",
      PLACE_REELS_ENABLED: true,
    });
  });

  it("rejects enabled place reels without a YouTube key", () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        PLACE_REELS_ENABLED: "true",
      }),
    ).toThrow("YOUTUBE_API_KEY");
  });
});

it("allows authenticated-only chat without an anonymous IP hashing secret", () => {
  expect(
    validateEnvironment({
      ...validEnvironment,
      CHAT_ENABLED: "true",
      CHAT_AWS_REGION: "ap-northeast-2",
    }).CHAT_ENABLED,
  ).toBe(true);
});

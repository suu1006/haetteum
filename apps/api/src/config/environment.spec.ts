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
});

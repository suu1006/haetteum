import assert from "node:assert/strict";

const base = process.argv[2] ?? "http://localhost:4100/api/v1";
const session = await fetch(`${base}/auth/session`);
assert.equal(session.status, 200);
assert.match(session.headers.get("cache-control"), /no-store/);
assert.equal(await session.json(), null);
const protectedResponse = await fetch(`${base}/auth/me`);
assert.equal(protectedResponse.status, 401);
console.log("Anonymous session JSON, no-store and protected me: PASS");

import assert from "node:assert/strict";
import test from "node:test";
import {
  AppError,
  digest,
  hashPassword,
  newSession,
  requireDate,
  requirePassword,
  verifyPassword,
} from "../lib/server/security.ts";

test("password hashes are salted and verify without storing plaintext", async () => {
  const password = "A-long-unique-password!";
  const one = await hashPassword(password),
    two = await hashPassword(password);
  assert.notEqual(one, two);
  assert.ok(!one.includes(password));
  assert.equal(await verifyPassword(password, one), true);
  assert.equal(await verifyPassword("wrong", one), false);
  assert.equal(await verifyPassword(password, "corrupt"), false);
  assert.throws(() => requirePassword("short"), AppError);
  assert.throws(() => requirePassword("x".repeat(129)), AppError);
});

test("session tokens are unpredictable and only their digests are stored", () => {
  const one = newSession(),
    two = newSession();
  assert.equal(one.token.length, 64);
  assert.equal(one.hash, digest(one.token));
  assert.notEqual(one.token, one.hash);
  assert.notEqual(one.token, two.token);
});

test("server validation rejects impossible calendar dates", () => {
  for (const date of [
    "2026-02-29",
    "2026-13-01",
    "2026-01-32",
    "2026-1-1",
    "1999-12-31",
    null,
  ])
    assert.throws(() => requireDate(date), AppError);
  requireDate("2024-02-29");
  requireDate("2100-12-31");
});

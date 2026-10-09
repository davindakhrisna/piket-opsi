import assert from "node:assert/strict";
import test from "node:test";
import { main } from "../scripts/test-email.mjs";

test("email CLI previews safely, sends to the selected recipient, and never retries failures", async (t) => {
  const originalFrom = process.env.RESEND_FROM;
  const originalKey = process.env.RESEND_API_KEY;
  process.env.RESEND_FROM = "Piket Opsi <piket@example.com>";
  process.env.RESEND_API_KEY = "fake-api-key-for-unit-test";
  t.after(() => {
    if (originalFrom === undefined) delete process.env.RESEND_FROM;
    else process.env.RESEND_FROM = originalFrom;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  });
  const output = [];
  t.mock.method(console, "log", (text) => output.push(text));
  const requests = [];
  const send = t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify({ id: "test-email-id" }), { status: 200 });
  });

  await assert.rejects(main([]), /Provide one recipient/);
  await assert.rejects(main(["not-an-email"]), /Provide one recipient/);
  await assert.rejects(main(["one@example.com,two@example.com"]), /Provide one recipient/);
  await assert.rejects(main(["one@example.com", "two@example.com"]), /Provide one recipient/);
  await assert.rejects(main(["one@example.com", "--unknown"]), /Unknown option/);
  await main(["--help"]);
  process.env.RESEND_API_KEY = "";
  await main(["preview@example.com", "--dry-run"]);
  assert.equal(send.mock.callCount(), 0);
  assert.deepEqual(JSON.parse(output.at(-1)).to, ["preview@example.com"]);
  await assert.rejects(main(["one@example.com"]), /Set RESEND_API_KEY/);
  process.env.RESEND_API_KEY = "fake-api-key-for-unit-test";

  await main(["first@example.com"]);
  await main(["second@example.com", "--normal-priority"]);
  assert.equal(requests.length, 2);
  const first = requests[0];
  assert.equal(first.url, "https://api.resend.com/emails");
  assert.equal(first.options.method, "POST");
  assert.equal(first.options.headers.Authorization, "Bearer fake-api-key-for-unit-test");
  const payload = JSON.parse(first.options.body);
  assert.deepEqual(payload.to, ["first@example.com"]);
  assert.deepEqual(payload.headers, { "X-Priority": "1", Importance: "high" });
  const second = requests[1];
  assert.deepEqual(JSON.parse(second.options.body).to, ["second@example.com"]);
  assert.equal(JSON.parse(second.options.body).headers, undefined);
  assert.notEqual(first.options.headers["Idempotency-Key"], second.options.headers["Idempotency-Key"]);
  assert.ok(output.some((text) => text.includes('"accepted": true')));
  assert.ok(!output.join("\n").includes("fake-api-key-for-unit-test"));

  send.mock.mockImplementation(async () => new Response(JSON.stringify({
    message: "Sender not verified: fake-api-key-for-unit-test",
  }), { status: 403 }));
  await assert.rejects(main(["one@example.com"]), (error) =>
    error.message.includes("HTTP 403") &&
    error.message.includes("[REDACTED]") &&
    !error.message.includes("fake-api-key-for-unit-test"));
  assert.equal(send.mock.callCount(), 3);
  send.mock.mockImplementation(async () => { throw new Error("Network failure"); });
  await assert.rejects(main(["one@example.com"]), /Delivery result unknown/);
  assert.equal(send.mock.callCount(), 4);
  send.mock.mockImplementation(async () => new Response("Unavailable", { status: 503 }));
  await assert.rejects(main(["one@example.com"]), /Delivery result unknown \(Resend HTTP 503\)/);
  assert.equal(send.mock.callCount(), 5);
  send.mock.mockImplementation(async () => new Response("{}", { status: 200 }));
  await assert.rejects(main(["one@example.com"]), /Resend returned no email ID/);
  assert.equal(send.mock.callCount(), 6);
});

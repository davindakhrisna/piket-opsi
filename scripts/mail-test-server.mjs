import http from "node:http";
import { randomUUID } from "node:crypto";

// Local Playwright capture server. No messages leave this process.
const messages = new Map();
let mode = "ok";
http
  .createServer(async (request, response) => {
    response.setHeader("Content-Type", "application/json");
    if (request.url === "/health") return response.end("{}");
    if (request.url === "/messages" && request.method === "GET")
      return response.end(JSON.stringify([...messages.values()]));
    if (request.url === "/reset") {
      messages.clear();
      mode = "ok";
      return response.end("{}");
    }
    if (request.url?.startsWith("/mode/")) {
      mode = request.url.split("/").pop();
      return response.end("{}");
    }
    if (request.url !== "/emails" || request.method !== "POST") {
      response.statusCode = 404;
      return response.end("{}");
    }
    let body = "";
    for await (const chunk of request) body += chunk;
    if (mode === "rate-limit") {
      response.statusCode = 429;
      return response.end(JSON.stringify({ name: "rate_limit_exceeded" }));
    }
    const key = request.headers["idempotency-key"];
    if (!messages.has(key))
      messages.set(key, {
        id: randomUUID(),
        key,
        payload: JSON.parse(body),
        receivedAt: new Date().toISOString(),
      });
    const message = messages.get(key);
    if (mode === "ambiguous") {
      response.statusCode = 500;
      return response.end("{}");
    }
    response.end(JSON.stringify({ id: message.id }));
  })
  .listen(3419, "127.0.0.1", () => console.log("Local email capture ready."));

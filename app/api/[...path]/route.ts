import { timingSafeEqual } from "node:crypto";
import { after, NextRequest, NextResponse } from "next/server";
import {
  addMember,
  authenticate,
  changePassword,
  deleteSchedule,
  login,
  logout,
  requireAccess,
  saveSchedule,
  snapshot,
} from "@/lib/server/app-service";
import { retryDefiniteFailures, updateStatus } from "@/lib/server/app-service";
import { AppError } from "@/lib/server/security";
import {
  appOrigin,
  processEmailJobs,
  queueTomorrowReminders,
} from "@/lib/server/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
const cookieName = "piket_session";

function json(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
function withSession(value: { token: string; user: unknown }) {
  const response = json({ user: value.user });
  response.cookies.set(cookieName, value.token, {
    httpOnly: true,
    secure: appOrigin().startsWith("https:"),
    sameSite: "strict",
    path: "/",
    maxAge: 7 * 86400,
  });
  return response;
}
async function body(request: NextRequest): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new AppError(415, "Gunakan JSON untuk permintaan ini.");
  // Bounded streaming read avoids accepting oversized/chunked payloads into memory.
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, "Isi permintaan tidak tersedia.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    size += item.value.length;
    if (size > 16384) {
      await reader.cancel();
      throw new AppError(413, "Isi permintaan terlalu besar.");
    }
    chunks.push(item.value);
  }
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new Error();
    return input;
  } catch {
    throw new AppError(400, "Isi JSON tidak valid.");
  }
}
function deliverSoon() {
  after(async () => {
    try {
      await processEmailJobs();
    } catch {
      console.error("Email worker failed; jobs remain in the database.");
    }
  });
}

async function handle(request: NextRequest) {
  try {
    const path = new URL(request.url).pathname.replace(/^\/api\//, "");
    if (
      request.method !== "GET" &&
      request.headers.get("origin") !== appOrigin()
    )
      throw new AppError(
        403,
        "Asal permintaan tidak diizinkan. Buka aplikasi dari alamat resminya.",
      );
    if (path === "cron/reminders" && request.method === "GET") {
      const secret = process.env.CRON_SECRET;
      const provided = request.headers.get("authorization") ?? "";
      const expected = secret ? `Bearer ${secret}` : "";
      const providedBytes = Buffer.from(provided),
        expectedBytes = Buffer.from(expected);
      if (
        !secret ||
        secret.length < 32 ||
        providedBytes.length !== expectedBytes.length ||
        !timingSafeEqual(providedBytes, expectedBytes)
      )
        throw new AppError(401, "Tidak diizinkan.");
      await queueTomorrowReminders();
      return json(await processEmailJobs());
    }
    if (path === "auth/login" && request.method === "POST") {
      const input = await body(request);
      const ip = process.env.VERCEL
        ? (request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown")
        : "local";
      return withSession(await login(input.email, input.password, ip));
    }
    const auth = await authenticate(request.cookies.get(cookieName)?.value);
    if (path === "auth/logout" && request.method === "POST") {
      await logout(auth);
      const response = json({ ok: true });
      response.cookies.delete(cookieName);
      return response;
    }
    if (path === "auth/password" && request.method === "POST") {
      const input = await body(request);
      return withSession(
        await changePassword(auth, input.currentPassword, input.newPassword),
      );
    }
    if (path === "snapshot" && request.method === "GET")
      return json(await snapshot(auth));
    if (path === "members" && request.method === "POST")
      return json(await addMember(auth, await body(request)), 201);
    if (path === "schedules" && request.method === "POST") {
      const result = await saveSchedule(auth, await body(request));
      deliverSoon();
      return json(result, 201);
    }
    const schedulePath = path.match(/^schedules\/([^/]+)(\/status)?$/);
    if (schedulePath) {
      const [, id, status] = schedulePath;
      if (status && request.method === "PATCH") {
        await updateStatus(auth, id, await body(request));
        deliverSoon();
        return json({ ok: true });
      }
      if (!status && request.method === "PUT") {
        const result = await saveSchedule(auth, await body(request), id);
        deliverSoon();
        return json(result);
      }
      if (!status && request.method === "DELETE") {
        const input = await body(request);
        await deleteSchedule(auth, id, input.version);
        return json({ ok: true });
      }
    }
    if (path === "emails/process" && request.method === "POST") {
      requireAccess(auth, true);
      await retryDefiniteFailures(auth);
      return json(await processEmailJobs());
    }
    throw new AppError(404, "Rute tidak ditemukan.");
  } catch (error) {
    if (error instanceof AppError)
      return json({ error: error.message }, error.status);
    console.error(
      "Application request failed; inspect database connectivity and deployment configuration.",
    );
    return json(
      {
        error:
          "Permintaan belum berhasil. Periksa koneksi dan coba lagi. Data yang belum disimpan tetap ada di formulir.",
      },
      503,
    );
  }
}

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};

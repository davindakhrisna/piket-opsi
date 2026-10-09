import { timingSafeEqual } from "node:crypto";
import { after, NextRequest, NextResponse } from "next/server";
import {
  addMember,
  updateMember,
  deleteMember,
  addOrganization,
  authenticate,
  changePassword,
  deleteOrganization,
  deleteSchedule,
  login,
  logout,
  requireAccess,
  saveSchedule,
  snapshot,
  updateOrganization,
  updateNotificationSettings,
} from "@/lib/server/app-service";
import { retryDefiniteFailures, updateStatus } from "@/lib/server/app-service";
import { AppError, requireId } from "@/lib/server/security";
import {
  appOrigin,
  processEmailJobs,
  queueTomorrowReminders,
  releaseAssignmentEmails,
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
    const notificationCron = path.match(/^cron\/notifications\/(0\d|1\d|2[0-3])$/);
    if ((path === "cron/reminders" || notificationCron) && request.method === "GET") {
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
      if (notificationCron) {
        const result = await releaseAssignmentEmails(Number(notificationCron[1]));
        // Catch up today's H−1 queue if the primary 07:00 WIB invocation was missed.
        if (result.hour >= 7) await queueTomorrowReminders();
      } else await queueTomorrowReminders();
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
        await changePassword(auth, input.newPassword),
      );
    }
    if (path === "snapshot" && request.method === "GET")
      return json(await snapshot(auth));
    if (path === "notification-settings" && request.method === "PUT")
      return json(await updateNotificationSettings(auth, await body(request)));
    if (path === "notifications/send" && request.method === "POST") {
      requireAccess(auth, true);
      const input = await body(request);
      if (input.scheduleId !== undefined) requireId(input.scheduleId);
      const { released } = await releaseAssignmentEmails(undefined, auth.user.id, input.scheduleId as string | undefined);
      return json({ released, ...await processEmailJobs() });
    }
    if (path === "organizations" && request.method === "POST") {
      const result = await addOrganization(auth, await body(request));
      return json(result, result.created ? 201 : 200);
    }
    if (path === "organizations" && request.method === "PUT")
      return json(await updateOrganization(auth, await body(request)));
    if (path === "organizations" && request.method === "DELETE")
      return json(await deleteOrganization(auth, await body(request)));
    if (path === "members" && request.method === "POST")
      return json(await addMember(auth, await body(request)), 201);
    const memberPath = path.match(/^members\/([^/]+)$/);
    if (memberPath && request.method === "PUT")
      return json(await updateMember(auth, memberPath[1], await body(request)));
    if (memberPath && request.method === "DELETE") {
      const input = await body(request);
      return json(await deleteMember(auth, memberPath[1], input.version));
    }
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

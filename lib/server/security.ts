import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export class AppError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function derive(password: string, salt: string, version = 2): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      {
        N: version === 2 ? 131072 : 32768,
        r: 8,
        p: 1,
        maxmem: 256 * 1024 * 1024,
      },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt-v2:${salt}:${(await derive(password, salt)).toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, hex] = encoded.split(":");
  if (
    !["scrypt", "scrypt-v2"].includes(algorithm) ||
    !/^[a-f0-9]{32}$/.test(salt ?? "") ||
    !/^[a-f0-9]{128}$/.test(hex ?? "")
  )
    return false;
  const actual = await derive(
    password,
    salt,
    algorithm === "scrypt-v2" ? 2 : 1,
  );
  return timingSafeEqual(actual, Buffer.from(hex, "hex"));
}

export function newSession() {
  const token = randomBytes(32).toString("hex");
  return { token, hash: digest(token) };
}

export function requirePassword(password: unknown): asserts password is string {
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128
  )
    throw new AppError(
      400,
      "Gunakan kata sandi baru sepanjang 12–128 karakter.",
    );
}

export function requireId(value: unknown): asserts value is string {
  if (
    typeof value !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      value,
    )
  )
    throw new AppError(400, "ID tidak valid.");
}

export function requireVersion(value: unknown): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 1)
    throw new AppError(400, "Versi jadwal tidak valid. Muat ulang jadwal.");
}

export function requireDate(value: unknown): asserts value is string {
  const parsed =
    typeof value === "string" ? new Date(`${value}T00:00:00Z`) : new Date(NaN);
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < "2000-01-01" ||
    value > "2100-12-31" ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  )
    throw new AppError(400, "Tanggal jadwal tidak valid.");
}

export function minutes(value: unknown) {
  if (typeof value !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))
    throw new AppError(400, "Waktu jadwal tidak valid.");
  const [hours, minute] = value.split(":").map(Number);
  return hours * 60 + minute;
}

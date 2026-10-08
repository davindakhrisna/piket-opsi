import { defineConfig, devices } from "@playwright/test";

const databaseUrl =
  process.env.E2E_DATABASE_URL ??
  "postgresql://postgres:piket-test-only@localhost:55439/piket_test";
const database = new URL(databaseUrl);
if (
  !["localhost", "127.0.0.1"].includes(database.hostname) ||
  !/^\/piket_test/.test(database.pathname)
)
  throw new Error("E2E tests require an isolated local piket_test database.");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], timezoneId: "America/Los_Angeles" },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], timezoneId: "America/Los_Angeles" },
    },
  ],
  webServer: [
    {
      command: "node scripts/mail-test-server.mjs",
      url: "http://127.0.0.1:3419/health",
      reuseExistingServer: false,
    },
    {
      command: "pnpm db:migrate && pnpm dev --port 3100",
      url: "http://localhost:3100",
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        DATABASE_URL: databaseUrl,
        NEXT_DIST_DIR: ".next-e2e",
        APP_URL: "http://localhost:3100",
        CRON_SECRET: "e2e-private-cron-secret-32-characters",
        RESEND_API_KEY: "local-test-key",
        RESEND_FROM: "Piket Opsi <test@example.com>",
        MAIL_TEST_URL: "http://127.0.0.1:3419/emails",
      },
    },
  ],
});

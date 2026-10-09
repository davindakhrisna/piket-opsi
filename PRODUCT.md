# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

An administrator manages members and their schedules. Members review their own and other members' schedules and update their own assignment status.

## Product Purpose

Manage duty schedules, assignments, completion, and email reminders in one application.

## Capabilities and Constraints

- Administrator creates members with name, email, and a registered organization. BEM, BPM, and LPM are initial options that cannot be renamed or deleted. Through Organisasi on Anggota, administrator can list and add organizations, rename custom organizations, and delete custom organizations without members. Organization names are 1–80 characters and unique without regard to case. Renaming preserves member associations, accounts, and schedules.
- Member row actions open their schedules, edit name/email/organization, or confirm deletion. Deletion archives the account, revokes sessions, stops further emails, and preserves assignments and history. Archived members are excluded from member management and new assignments; their details remain visible in existing schedules. Email addresses remain unique, including archived accounts. Changing email revokes sessions, preserves chosen passwords, and updates an unchanged initial password to the new email. Known-unsent emails follow the new recipient; uncertain delivery blocks profile edits.
- Initial administrator login uses `admin` for both identifier and password; require a password change afterward.
- Initial member password is their administrator-provided email. Members receive a post-login notification and persistent reminder to change it; the change is optional. All password changes omit the current-password field. A valid signed-in session is required; each change rotates the session and revokes other sessions. New passwords must have 12–128 characters and differ from the email and previous password.
- All schedules are piket at Ruang Opsi. Administrator sets a calendar date and selects multiple members, filtering assignees by organization. Each member can be assigned once per date.
- Members open a compact detailed list and can switch between their own and all members' schedules. Administrator opens the calendar and sees all members. Both roles can switch views.
- Assignment states are scheduled, done, and skipped; administrator can override each member's state. Status filtering defaults to scheduled.
- Both views support 3/7/14/30-day ranges, counting today as day one in Jakarta, and all dates.
- Theme defaults to the operating system, with persistent light/dark/system choices. All password inputs have visibility controls.
- Initial loading uses the official shadcn Spinner with the accessible label `Memuat aplikasi`; connection failures show a card with Coba lagi.
- Assignment emails include a schedule link. Administrator saves one daily, one-hour WIB window for all waiting assignment notifications (default 07.00–07.59 WIB), or Manual saja. Kirim semua starts sending waiting scheduled assignments for today or future dates. Repeat sends and schedule edits skip already notified assignees; new assignees wait for sending.
- After creating a schedule, a persistent prompt offers Kirim sekarang for that schedule or Nanti to retain waiting notifications. The daily time picker uses a compact scrollable list; all hourly windows remain available.
- Notification status is separate from scheduled/done/skipped task status: Belum diberi tahu until Resend accepts the assignment email, then Diberi tahu. Acceptance does not confirm arrival in the recipient's inbox.
- Accounts, sessions, schedules, assignments, audit events, and email jobs persist in PostgreSQL. Server routes enforce permissions and detect stale edits.
- Backend uses Resend, Neon free tier, and Vercel Hobby. Assignment email is queued transactionally for the saved WIB window or Kirim semua. H−1 reminders remain automatic from 07.00 WIB, independently of Manual saja; hourly processing catches up missed reminders and retries already released jobs without releasing new waiting assignments outside the selected window or a manual request.
- Confirmed interface language: Bahasa Indonesia. Confirmed schedule time zone: Asia/Jakarta.
- Schedules use a date only. No start or end time appears in forms, lists, calendars, details, or new email content. Existing stored clock values are preserved as historical data.
- New emails include high-priority headers for supporting mail clients. Gmail importance requires a recipient-side filter; the sender cannot force it. Production sending requires a verified Resend domain and RESEND_FROM on that domain.

## Brand Commitments

Use shadcn/ui components extensively and preserve the library's generated default theme. Do not customize its color scheme. Use the official shadcn MCP server for component discovery and installation guidance. The favicon uses the existing CalendarDays motif on a neutral rounded square.

## Evidence on Hand

The repository contains a working Next.js app and PostgreSQL migrations. Production starts with only the administrator; illustrative fixtures are confined to tests.

## Open Decisions

Configure the public HTTPS APP_URL and service credentials on Vercel. Resend sender verification and free-tier capacity must support actual member volume. Predictable initial passwords remain an explicit user choice and cannot provide strong protection until changed.

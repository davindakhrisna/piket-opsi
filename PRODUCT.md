# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

An administrator manages members and their schedules. Members review their own and other members' schedules and update their own assignment status.

## Product Purpose

Manage duty schedules, assignments, completion, and email reminders in one application.

## Capabilities and Constraints

- Administrator creates members with name, email, and organization: BEM, BPM, or LPM.
- Initial administrator login uses `admin` for both identifier and password; require a password change afterward.
- Initial member password is their administrator-provided email. Members receive a post-login notification and persistent reminder to change it; the change is optional. First-time setup for both roles omits the current-password field; later changes require it.
- All schedules are piket at Ruang Opsi. Administrator sets dates/times and selects multiple members, filtering assignees by organization.
- Members open a compact detailed list and can switch between their own and all members' schedules. Administrator opens the calendar and sees all members. Both roles can switch views.
- Assignment states are scheduled, done, and skipped; administrator can override each member's state. Status filtering defaults to scheduled.
- Both views support 3/7/14/30-day ranges, counting today as day one in Jakarta, and all dates.
- Theme defaults to the operating system, with persistent light/dark/system choices. All password inputs have visibility controls.
- Email notification on assignment includes a schedule link; another reminder is due the day before.
- Accounts, sessions, schedules, assignments, audit events, and email jobs persist in PostgreSQL. Server routes enforce permissions and detect stale edits.
- Backend uses Resend, Neon free tier, and Vercel Hobby. Assignment email is queued transactionally and processed immediately on the assignment day. H−1 reminders run daily at 07:00–07:59 WIB.
- Confirmed interface language: Bahasa Indonesia. Confirmed schedule time zone: Asia/Jakarta.
- Schedules use a date and start/end time, as proposed in the language/time-zone question.

## Brand Commitments

Use shadcn/ui components extensively and preserve the library's generated default theme. Do not customize its color scheme. Use the official shadcn MCP server for component discovery and installation guidance.

## Evidence on Hand

The repository contains a working Next.js app and PostgreSQL migrations. Production starts with only the administrator; illustrative fixtures are confined to tests.

## Open Decisions

Configure the public HTTPS APP_URL and service credentials on Vercel. Resend sender verification and free-tier capacity must support actual member volume. Predictable initial passwords remain an explicit user choice and cannot provide strong protection until changed.

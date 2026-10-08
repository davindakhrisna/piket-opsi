# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

An administrator manages members and their schedules. Members review their own and other members' schedules and update their own assignment status.

## Product Purpose

Manage duty schedules, assignments, completion, and email reminders in one application.

## Capabilities and Constraints

- Administrator creates members with name and email only.
- Initial administrator login uses `admin` for both identifier and password; require a password change afterward.
- Initial member password is their administrator-provided email. Password changes are optional for members.
- Administrator creates schedules and selects multiple members.
- Calendar and detailed views support own schedules and other members' schedules; administrator sees all schedules.
- Assignment states are scheduled, done, and skipped; administrator can override each member's state.
- Email notification on assignment includes a schedule link; another reminder is due the day before.
- Current scope is frontend only with illustrative local data; no authentication, database, or email delivery backend yet.
- Future backend uses Resend, Neon free tier, and Vercel Hobby. Daily reminder processing must respect Hobby cron limits.
- Confirmed interface language: Bahasa Indonesia. Confirmed schedule time zone: Asia/Jakarta.
- Schedules use a date and start/end time, as proposed in the language/time-zone question.

## Brand Commitments

Use shadcn/ui components extensively and preserve the library's generated default theme. Do not customize its color scheme. Use the official shadcn MCP server for component discovery and installation guidance.

## Evidence on Hand

The repository contains a Next.js App Router starter. Any sample members or schedules must be clearly identified as demonstration data.

## Open Decisions

Production credentials, sender domain, notification volume, exact delivery hour, and backend implementation remain for the backend phase.

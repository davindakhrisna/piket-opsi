---
name: Piket Opsi
description: Default shadcn UI for managing duty schedules
colors:
  background: "oklch(1 0 0)"
  foreground: "oklch(0.145 0 0)"
  primary: "oklch(0.205 0 0)"
  primary-foreground: "oklch(0.985 0 0)"
  muted: "oklch(0.97 0 0)"
  muted-foreground: "oklch(0.556 0 0)"
  border: "oklch(0.922 0 0)"
  destructive: "oklch(0.577 0.245 27.325)"
typography:
  heading:
    fontFamily: "Geist, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  control: "0.625rem"
  panel: "0.875rem"
spacing:
  compact: "0.5rem"
  group: "1rem"
  section: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.control}"
    height: "2rem"
---

# Design System: Piket Opsi

## Overview

**Creative North Star: "Default shadcn, clear scheduling"**

Use the generated shadcn/ui base-nova preset with the neutral default theme. The schedule, date, assignees, and per-member status carry the visual hierarchy. All application data and email content are clearly marked as demonstrations.

**Key Characteristics:**
- Neutral surfaces and default component variants.
- Geist typography, clear grouping, and compact controls.
- Calendar-first for administrators; compact detail-first lists for members.

## Colors

The normative values above come from `app/globals.css`. Keep both `:root` and `.dark` token declarations unchanged. The app follows the system theme by default. Users can select the default light or dark palette, or return to system mode; the selection persists locally. Completion uses the default primary badge, scheduled uses secondary, and skipped uses outline. Destructive controls use the library's default destructive variant.

## Typography

Use the existing Geist font binding. Desktop page headings use 30px/36px semibold; mobile headings use 24px/32px. Body content is generally 14px, supporting text 12px, and dates use tabular numerals. Desktop calendar event labels use 11px and overflow counts use 10px to fit seven date columns; full event details remain 14px in the selected-day panel. Component typography inherits the generated shadcn styles.

## Layout

Use the shadcn sidebar and inset with a 64px header. The collapsed desktop rail is 64px wide with centered buttons. Select menus open below their triggers, align to the left edge, and use inset option padding. Main content uses 16px padding on mobile, 24px from sm, and 32px from lg; maximum content width is 1440px. Below 768px, search and a Filter button share one row; a bottom sheet holds the full-width 44px scope/status/date controls, and a short summary remains visible. Desktop filters wrap. Detailed rows show date, assignees and organizations, and status with one detail action; lists paginate after ten schedules. Rows stack on mobile, and the sidebar becomes a sheet below 768px. From 1280px, calendar and selected-day details sit side by side. On smaller screens, day details follow the calendar; mobile calendar cells use centered dates and one dot for scheduled events, with counts retained in accessible labels and selected-day details. Mobile cells are 64px tall with a quieter grid. Today uses a filled primary date marker and a primary outline, while another selected date uses the muted background. Today follows Asia/Jakarta independently of the device time zone.

## Elevation & Depth

Keep default shadcn popup, dialog, sheet, and focus treatments. Use one bordered list with thin row dividers. Sidebar header and footer borders span their full width. Honor the reduced-motion override in global CSS.

## Shapes

Use the generated 0.625rem radius and its existing multipliers. App schedule panels use rounded-xl; controls retain their default component rounding. Avatars and badges keep their library shapes. The favicon repeats the existing CalendarDays motif on a neutral rounded square.

## Components

Use library Sidebar, Tabs, Calendar, Dialog, Sheet, Select, Table, Alert, Avatar, Badge, Tooltip, Button, and Spinner components. A schedule detail sheet exposes each assignment independently. Admin status controls are visible for everyone; member controls appear only for their own assignment. Dialogs handle member/schedule entry; an alert dialog confirms deletion. Email sheets preview assignment and H−1 messages. Member creation selects a saved organization. The admin Organisasi dialog on Anggota lists saved names, marks protected BEM/BPM/LPM options with Bawaan badges, and allows adding organizations or editing/deleting custom organizations. Editing reuses the entry form; the official shadcn AlertDialog confirms deletion, which is disabled for organizations with members. Schedule creation fixes the place to Ruang Opsi and filters assignees by saved organizations without losing hidden selections. Initial loading centers the official shadcn Spinner with the accessible label `Memuat aplikasi`; connection failures retain the retry card. Date ranges and status filters apply to both schedule views. See `.impeccable/surfaces/schedule.md` for surface behavior.

On Pengingat, an admin-only default shadcn Card groups the daily WIB time choice and Simpan waktu above the pending assignment count and Kirim semua, before reminder summaries and rows. Controls stack on mobile. Detail sheets place outline Belum diberi tahu or secondary Diberi tahu badges beside member information, separate from Status tugas controls.

## Do's and Don'ts

- Preserve the generated light and dark theme tokens.
- Use shadcn components and their default variants for controls and feedback.
- Keep Indonesian labels, Jakarta calendar dates, and per-member status text.
- Do not introduce a custom color scheme or decorative accent colors.
- Do not imply that preview credentials, schedule changes, or email delivery are persisted on a server.

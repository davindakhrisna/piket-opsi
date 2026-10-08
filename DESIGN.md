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

Use the generated shadcn/ui base-nova preset with the neutral default theme. The schedule, time, assignees, and per-member status carry the visual hierarchy. All application data and email content are clearly marked as demonstrations.

**Key Characteristics:**
- Neutral surfaces and default component variants.
- Geist typography, clear grouping, and compact controls.
- Detail-first schedules with a calendar tab.

## Colors

The normative values above come from `app/globals.css`. Keep both `:root` and `.dark` token declarations unchanged. The current app displays the default light theme. Completion uses the default primary badge, scheduled uses secondary, and skipped uses outline. Destructive controls use the library's default destructive variant.

## Typography

Use the existing Geist font binding. Desktop page headings use 30px/36px semibold; mobile headings use 24px/32px. Body content is generally 14px, supporting text 12px, and times use tabular numerals. Component typography inherits the generated shadcn styles.

## Layout

Use the shadcn sidebar and inset with a 64px header. Main content uses 16px padding on mobile, 24px from sm, and 32px from lg; maximum content width is 1440px. Filters wrap, detailed rows stack, and the sidebar becomes a sheet below 768px. From 1280px, calendar and selected-day details sit side by side. On smaller screens, day details follow the calendar; mobile calendar cells show schedule counts.

## Elevation & Depth

Keep default shadcn popup, dialog, sheet, and focus treatments. Separate schedule groups with spacing and thin borders. Honor the reduced-motion override in global CSS.

## Shapes

Use the generated 0.625rem radius and its existing multipliers. App schedule panels use rounded-xl; controls retain their default component rounding. Avatars and badges keep their library shapes.

## Components

Use library Sidebar, Tabs, Calendar, Dialog, Sheet, Select, Table, Alert, Avatar, Badge, Tooltip, and Button components. A schedule detail sheet exposes each assignment independently. Admin status controls are visible for everyone; member controls appear only for their own assignment. Dialogs handle member/schedule entry; an alert dialog confirms deletion. Email sheets preview assignment and H−1 messages. See `.impeccable/surfaces/schedule.md` for surface behavior.

## Do's and Don'ts

- Preserve the generated light and dark theme tokens.
- Use shadcn components and their default variants for controls and feedback.
- Keep Indonesian labels, explicit WIB times, and per-member status text.
- Do not introduce a custom color scheme or decorative accent colors.
- Do not imply that preview credentials, schedule changes, or email delivery are persisted on a server.

# Schedule application

Mode: Operate. Build path: code, chosen by the user.

## Confirmed direction

The user requires extensive shadcn/ui use and the library's unmodified default color scheme. Initialization selected the CLI's default `base-nova` preset with neutral tokens. Component styling and states inherit the generated components. Geist remains the starter's font. Do not introduce custom colors, charts, or decorative artwork.

## First viewport and hierarchy

After login, a required password-change screen blocks initial admin access. The app opens the calendar for administrators and the detailed list for members, following the latest user instructions. A shadcn sidebar provides Jadwal, Anggota (admin only), Pengingat, and Pengaturan. A compact header identifies the active section and marks all content as demonstration data. The main schedule screen puts creation, view tabs, search, scope, status, and date-range filters before a compact list. Rows show date, member names and organizations, status, and one detail action; display ten schedules per page. The fixed place, Ruang Opsi, appears in the page introduction rather than in every row. Use the calendar tab for a full-month calendar with a selected-day list.

## Interaction and state

A schedule detail sheet exposes per-member assignment states. Admin can change every assignment; members can change only their own. Search and scope/status/date-range filters apply consistently to both views. Member scope offers exactly Semua anggota and Jadwal saya; admin can open a member's calendar from the member table and clear that contextual filter. Status defaults to Terjadwal. Date ranges offer 3, 7, 14, 30 days including today in Jakarta, or all dates. Calendar navigation and day selection retain the filtered scope. Member creation requires name, email, and BEM/BPM/LPM. Schedule creation requests a date only and fixes the activity/place to piket in Ruang Opsi and preserves selections when filtering assignees by organization. All password fields have show/hide controls. Theme follows the system by default with light/dark/system switching on login and inside the app. Confirmation protects schedule deletion. Links use `?jadwal=<id>` and resume after login. Email sheets preview assignment and H−1 reminder content without sending mail.

## Responsive and motion contract

The collapsed desktop sidebar uses a 64px rail with centered icons. Select menus open below the trigger rather than over the selected value. On mobile the sidebar becomes a sheet; search and a Filter button share one row, and a bottom sheet exposes scope/status/date controls with 44px tap targets. Current filter selections remain in a short summary. Detail rows stack. Below 768px, the calendar centers dates, uses one dot for scheduled events, and removes the dense desktop grid lines. Counts remain in accessible day labels and the selected-day details. Today follows Asia/Jakarta and has a primary-filled date marker plus primary outline; other selected dates use the muted surface. Selected-day details remain below the calendar. Default shadcn interactive motion is retained, with a reduced-motion override. No page-wide horizontal overflow. Visible focus, accessible labels, empty/error states, and truthful preview messaging are required.

## Evidence

Date-only refinement removes clock inputs and displays from creation, detailed rows, calendar events, schedule sheets, and new email messages. Desktop/mobile creation captures: `/tmp/piket-date-after-desktop.png` and `/tmp/piket-date-after-mobile.png`. Playwright checks date-only persistence, today's notification, legacy-data preservation, daily assignment conflicts, and both reminder kinds alongside existing application coverage.

Current desktop captures: `/tmp/piket-refined-desktop.png`, `/tmp/piket-refined-calendar.png`, `/tmp/piket-refined-dark.png`.
Current mobile calendar captures: `/tmp/piket-mobile-calendar-clean-dark.png`, `/tmp/piket-mobile-calendar-clean-light.png`, `/tmp/piket-mobile-calendar-filters.png`.
Browser smoke checks cover role visibility, assignment status permissions, CRUD forms, calendar navigation, email previews, deep links, optional member password changes, and mobile overflow. No page errors or external email/database requests were observed. Refinement checks additionally cover date ranges, role defaults, password visibility, organizations and retained assignee selections, system/theme persistence, compact lists, and full-width sidebar borders.

Mobile calendar checks use touch-emulated Chromium, including a device time zone outside Jakarta, widths from 320px through 767px, filter application/reset across both views, selected-day taps, month navigation, and desktop preservation. Physical-device and Safari gesture checks remain unperformed.

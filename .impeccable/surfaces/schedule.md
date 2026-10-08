# Schedule application

Mode: Operate. Build path: code, chosen by the user.

## Confirmed direction

The user requires extensive shadcn/ui use and the library's unmodified default color scheme. Initialization selected the CLI's default `base-nova` preset with neutral tokens. Component styling and states inherit the generated components. Geist remains the starter's font. Do not introduce custom colors, charts, or decorative artwork.

## First viewport and hierarchy

After login, a required password-change screen blocks initial admin access. The app then opens the detailed schedule list, as selected by the user. A shadcn sidebar provides Jadwal, Anggota (admin only), Pengingat, and Pengaturan. A compact header identifies the active section and marks all content as demonstration data. The main schedule screen puts creation, view tabs, search, member filter, and status filter before date-grouped schedule rows. Use the calendar tab for a full-month calendar with a selected-day list.

## Interaction and state

A schedule detail sheet exposes per-member assignment states. Admin can change every assignment; members can change only their own. Search and member/status filters apply consistently to both views. Calendar navigation and day selection retain the filtered scope. Dialogs focus schedule and member creation. Confirmation protects schedule deletion. Links use `?jadwal=<id>` and resume after login. Email sheets preview assignment and H−1 reminder content without sending mail.

## Responsive and motion contract

On mobile the sidebar becomes a sheet, filters wrap, detail rows stack, and the monthly calendar shows schedule counts rather than clipped event titles. Selected-day details remain below the calendar. Default shadcn interactive motion is retained, with a reduced-motion override. No page-wide horizontal overflow. Visible focus, accessible labels, empty/error states, and truthful preview messaging are required.

## Evidence

Desktop captures: `/tmp/piket-desktop-detail.png`, `/tmp/piket-desktop-calendar.png`.
Mobile captures: `/tmp/piket-mobile-detail.png`, `/tmp/piket-mobile-calendar.png`.
Browser smoke checks cover role visibility, assignment status permissions, CRUD forms, calendar navigation, email previews, deep links, optional member password changes, and mobile overflow. No page errors or external email/database requests were observed. Impeccable's detector returned an empty findings list before the final login-state correction and formatting; these changed no visual tokens.

# huma · HCM Lite

**People, simply managed.** A complete browser-based Human Capital Management application for a solo-developer, 10-hour hackathon. Built with HTML5, CSS3, vanilla JavaScript, and localStorage; no backend, external database, build process, or package installation.

Huma uses a forest-green sidebar with a restrained layered gradient, mint active states, neutral content surfaces, Inter typography, accessible forms, and responsive tables. Authentication and company pages pair the form-first layout with a quiet dark-green visual panel; phones prioritize the form and keep the logo visible. The original logo artwork is unchanged; the sidebar uses a white CSS treatment for contrast.

The shared visual system uses 32px page headings, 20px section headings, 14px body/table text, 13px labels, 12px metadata, and 30–36px metrics. Sage actions, soft selected navigation, subtle table dividers, compact status pills, and 6/10/12/16px radius tokens follow the supplied huma style guide. Mobile layouts stack wide metrics and use comfortable touch targets.

The supplied green Human H logo appears on the main page, sidebar, payslips, and all favicons. `assets/huma-logo.png` is the original artwork copied without modification. `assets/huma-logo.svg` embeds that same PNG and uses an SVG viewBox to frame the mark without its large transparent margins; it is self-contained for static hosting and favicon use. No external image URL or generated replacement is used.

## Run

Open the project folder in VS Code and use **Live Server → Open with Live Server** on `index.html`. Any static HTTP server works. Keep the same origin and port to retain the same browser data.

Opening `index.html` directly may work, but `file://` localStorage behavior differs between browsers; use HTTP for a reliable multi-page demonstration. An internet connection loads Inter from Google Fonts; system fonts work offline. Icons and favicon are local SVGs. No external JavaScript libraries are required.

## First-run setup

A fresh origin shows the company setup form and creates **no data until submitted**. Enter a fictional company, Admin name, email, password, and matching confirmation. Setup creates only the company, Admin, and session, then opens the Admin overview. Initial policies are shown explicitly: **09:00–17:00 shift, 15 grace minutes, 20 annual paid leave days**, editable in Settings. Password and confirmation fields have accessible show/hide controls. Employee accounts are still created only by Admin; there is no public employee signup.

The first page always offers **Create company**, **Manage companies**, **Admin login**, and **Employee login**. Login includes a company selector and verifies credentials against only that company. Employee login uses credentials created by that company’s Admin; before any company exists, the form explains that setup and an employee account are required. The selected login checks the account’s actual stored role. Emails are case-insensitive and unique across both roles within a company; the same email can belong to separate accounts in different companies. Passwords require 6–128 characters and are preserved exactly; editing an employee with a blank password keeps the old one.

Every authenticated sidebar includes **Manage companies** and **Create company**. The profile at the bottom opens a floating menu with **Employee Login**, **Admin Login**, and **Log Out**. Desktop supports hover and click; mobile supports tap. Arrow keys, Home/End, Escape, and outside-click dismissal are supported. Settings also links to company management. Switching account signs out the current session and opens the existing login form, preserving all company records. Opening the normal home URL with a valid session shows the company directory, where **Open workspace** returns to the current workspace. Other companies offer **Switch workspace**, which requires their own valid credentials. Secondary and destructive actions are grouped under More; company employee counts appear only for the authenticated company's Admin.

At widths up to 800px, protected pages have fixed bottom navigation. Admin gets Overview, Employees, Leaves, Payroll, and More. Employee gets Home, Attendance, Leaves, Payslip, and More; Attendance and Leaves link to sections of the existing dashboard. More opens a native bottom sheet with role-appropriate navigation, Account, Smart Helper, and Log Out. Account retains both existing role-login flows. Safe-area padding reserves space below content. Smart Helper is available from More and opens above the navigation, replacing its floating launcher on phones. Desktop keeps the left sidebar.

## Multiple companies

Use **Create company** from the main page or the app sidebar to register another independent company and its Admin. Creation signs into the new company with an empty employee directory; it never replaces an existing company. Company names must be unique within this browser, ignoring casing and surrounding whitespace.

**Manage companies** lists company names and company-specific login links. A valid company login activates that workspace only after credentials and role are checked; failed login preserves the current session and company. Each company has separate employees, attendance, leave, policies, holiday/extra-day calendar, and calculated payroll. There is one active company/account per browser origin, shared across tabs. Other tabs refresh on a switch; stale protected pages cannot submit work into the newly selected company.

Only the signed-in Admin of the current company sees **Rename**, **Settings**, and **Delete company**. Sign into another company as its own Admin before managing it. Renaming preserves its records. Deletion requires typing the exact company name into a confirmation dialog and permanently removes that company and its records; other companies are preserved and the session is cleared. Deleting the last company returns to an empty company list, from which a new one can be created. Company names are visible in the directory before login, but no employee records or workspace statistics are listed there.

Existing single-company data remains readable without a reset or startup writes. When a second company is created, the original company and all its records are preserved in the new registry, including existing IDs, calendars, and leave decisions. Use the same browser origin/profile to see the same companies.

## Features and workflows

All select fields use the shared Huma dropdown component: white floating menus, soft mint selection, checkmarks, comfortable spacing, constrained scrolling, and positioning that stays inside the viewport, including native dialogs. Keyboard support includes arrows, Home/End, prefix typing, Enter/Space, Tab, Escape cancellation, and outside-click dismissal. Native select values remain the source for FormData and existing change handlers; required selection errors stay associated with the visible control. Login companies, employee filters, leave types/statuses, calendar day types, and payroll payment filters share the same control.

Employee creation/editing requires choosing a department. Six starter choices are **Human Resources, Finance, Operations, Sales & Marketing, Technology, and Design**. Existing employee department names, including legacy custom names, remain available without renaming or startup writes. Admin can choose **Add department** below the selector, enter a name, and press Add or Enter. The category is saved for that company, selected immediately, and added to the directory filter. Escape cancels the inline editor; unfinished category entry cannot accidentally submit an employee. Explicitly added categories persist even if the employee dialog is subsequently canceled. Blank, over-80-character and case-insensitive duplicate names are rejected. Custom names are stored in optional company `departments: string[]` metadata using the existing company key and snapshots; other companies retain their own catalog. Employees cannot manage departments.

**Admin:** Live workforce statistics; attendance by date; recent leave requests; employee creation, editing, deletion, search, and department filtering; company policies; holidays and extra working days; leave approval or rejection with optional comments; employee/month payroll selection; printable payslips; company-level Smart Helper.

**Employee:** A personalized daily workspace, check-in/out with a saved-timestamp live timer, interactive monthly attendance calendar, compact monthly insights, leave balance and requests, selected-month payroll preview, personal payslips, and Smart Helper.

The calendar starts on Monday and supports previous/next month, Today, date selection, and arrow-key date navigation. Date details show saved times, completed or live duration, approved leave and decision comments, and company calendar exceptions. Future dates are never absent. Monthly hours include completed working-day records and today's active check-in; old missing checkouts do not invent worked hours. Present days include late arrivals and half days, matching payroll. Refreshing preserves the timer through its stored check-in timestamp. The leave dialog reuses the existing request workflow, and View Payslip carries the eligible selected month into the existing payroll screen. Current-month and open-record previews are labeled as estimates.

Product screens use Huma branding without development labels. The main page's **About your data** dialog retains the browser-storage and credential limitations described below.

Employees are redirected away from Admin URLs. Normal application features scope their queries to the signed-in employee, including leave, attendance, payroll, and chatbot responses. Admin passwords and employee passwords are never displayed in directory tables.

## Business rules and documented assumptions

- Dates use local `YYYY-MM-DD` calendar dates. Attendance timestamps are ISO instants; displays use local browser time. Saturday and Sunday are non-working by default; the company calendar can override individual dates. Real calendar dates, month boundaries, and leap years are validated.
- Check in and check out once per working day. Check-in must be within the effective daytime shift: the exact start and end instants are inclusive, and times after the configured end (including seconds) are closed. Late means strictly after the saved shift start plus grace, including seconds. Fewer than five completed hours is a half day; exactly five is a full day. A missing checkout remains an open check-in and does not automatically become a half day. An already-open record can be checked out after shift end, subject to the existing same-local-calendar-day model.
- Each check-in saves `wasLate` and the office-policy snapshot, so a late half day retains both facts and later start-time/grace changes do not reclassify recorded attendance. Calendar edits preserve attendance records and their classifications, while recalculating which dates count toward payroll.
- Missing attendance is absence only after a working day ends. Today’s unrecorded attendance remains “Not checked in.” Future dates never become absences. Admin’s “Absent today” therefore stays zero while today is still in progress.
- Leave ranges are inclusive and count only company working days: holidays and regular weekends are excluded, and extra working days are included. New requests start today or later. Pending and approved dates cannot overlap. Requests cannot conflict with recorded attendance; approved paid leave blocks check-in.
- Both offered leave types, **Annual** and **Personal**, are paid and share the annual allowance. Unpaid leave is not offered: the brief defines no unpaid-leave deduction policy. Imported recognized paid types (`paid`, `sick`) also count as paid leave.
- Allowances reset by calendar year with no carryover or proration. Cross-year requests allocate working days to each year. Only approved leave reduces the displayed balance; pending requests reserve capacity for new applications, preventing overbooking. Rejected requests consume nothing. Approval rechecks current quota and conflicts; a decided request cannot be processed twice.
- Lowering the company quota preserves existing requests and approvals. The remaining balance floors at zero; an approval that would exceed the updated quota is blocked. Reject other pending requests or adjust the quota when needed.
- New employees receive a `createdOn` joining date. Payroll does not invent absences before joining. Records from an earlier schema without this metadata are assumed to have been employed for the selected month. Salary is **not prorated**: the specified monthly-base formula is retained. Months before joining or in the future have no available payslip.
- Deleting an employee requires confirmation and removes their attendance and leave records together. Other employees and company data remain. Deletion cannot be undone.
- Currency is **PKR**, consistently formatted through one shared helper. Amounts are rounded only for display; calculations retain precision.

### Company calendar

**Admin → Settings** uses General, Attendance & Leave, and Company Calendar tabs within the same page. The current company is identified beside the tabs. Desktop uses vertical navigation; phones use a horizontally scrolling tab bar, with matching arrow-key navigation and Home/End support. Each form has its own Save Changes action and unsaved indicator. Drafts remain intact when switching tabs, and a before-unload guard requests confirmation when leaving with unsaved form changes.

General saves only the company name; Attendance & Leave saves only policy fields. Both merge with the latest stored company inside the existing mutation queue, preserving the other section, calendar, and payment metadata. Saving updates the company name in the page context. Working hours include a live late-cutoff preview, including next-day rollover. Existing attendance policy snapshots and approved leave records remain unchanged.

In **Company Calendar**, the Monday-first monthly grid supports previous/next month, Today, and arrow-key date selection. Selected-day details show the classification and saved title, with Add holiday/extra working day or Edit/Remove actions. **Add Date** opens the date/title/day-type dialog. Upcoming exceptions appear below the calendar, with Show all for more than six; historical entries remain accessible by navigating to their month. No example events are created by the application.

Choose **Holiday** or **Extra working day** when adding a date. Each date has one exception; edit an existing entry to change its type, title, or date. Removing an exception requires confirmation and restores the default Monday–Friday schedule. A holiday on a weekday prevents new check-ins and creates no absence, paid leave usage, or payroll deduction. An extra working day enables check-in on a regular day off and is included in monthly working-day and leave calculations.

The calendar is company-wide, saved within `hcm_company`, and initially empty. Changes update stored leave-day counts and calculated balances together. They also recalculate past payroll reports; there is no frozen payroll ledger. A leave request that becomes entirely non-working consumes zero days; a pending request with no remaining working days must be rejected or replaced rather than approved. Changes that create overlapping active requests, new attendance/leave conflicts, or increased leave usage beyond quota are blocked with an explanation. Existing attendance remains visible in history, and an open record can still be checked out if its date later becomes a holiday; it contributes no holiday deduction.

### Working hours and custom shifts

In **Settings → Attendance & Leave → Working Hours & Shifts**, set default Shift start time, Shift end time, and grace minutes. The live preview shows the working/check-in window and late cutoff. This version supports daytime shifts only: both times are required and end must be later than start; grace remains 0–240 whole minutes. Saving never reclassifies existing attendance.

**Shift Exceptions → Add custom shift** sets a date, start/end, and optional note. Entries are sorted by date and support Edit and confirmed Remove. They are also visible from Company Calendar: a distinct custom-shift dot/legend and selected-day details show effective hours and provide timing actions. A custom shift changes hours only: holidays and regular weekends remain non-working unless explicitly changed in the company calendar. Extra working days can use custom hours. Timing changes do not change leave-day counts or payroll working-day denominators.

`HCMAttendance.getEffectiveShift(companyId, date)` authorizes the active company and delegates to the shared resolver. It returns date, working-day status, start/end, grace, custom flag, calendar classification, and note. Both attendance validation and UI use this logic; `checkInWindow` derives before/open/after/non-working states. The employee action updates while the page is open, with a live duration after check-in, and checkout remains available after closing. Attendance calendar details show the saved shift snapshot when present; Smart Helper can explain today's effective shift.

Existing companies keep their saved start and grace; missing end time reads as 17:00 without a migration or startup write. A legacy start at/after 17:00 is preserved but cannot form a valid daytime shift with that fallback; Admin must explicitly choose a valid start/end before new check-ins. New companies use 09:00–17:00. Optional company metadata is `endTime` and `shiftExceptions: [{ date, startTime, endTime, note }]`. New attendance records snapshot `startTime`, `endTime`, `graceMinutes`, `customShift`, and `shiftNote`. No storage key was added, no existing records reset, and company snapshots include the optional fields.

Shift restrictions run entirely in the browser and trust the device clock. They are not tamper-proof; production enforcement would require a trusted server clock and authorization.

### Payroll formula

**Admin → Payroll** is a month-based workspace with a compact header, Export payroll, and totals for net payroll, recorded paid amounts, pending salary payments, and employees paid. Search the employee table by name, filter Paid/Unpaid, and select a row or **View payslip** to open the contextual detail drawer. The table shows employee/department, right-aligned salary amounts, and one action. Payment dates and amounts live in the detail view. Paid and Estimated remain separate indicators; pending totals sum eligible unpaid salaries rather than subtracting historical payments from recalculated payroll.

The drawer takes approximately half a desktop viewport and becomes full screen on phones, with a fixed header and independently scrolling details. Print, Download PDF, and More actions are grouped in its header; its month selector stays synchronized with the workspace. Unpaid slips offer Mark as Paid, while paid slips offer Mark as Unpaid in More actions. Both require confirmation; Cancel and Escape preserve the payment. Native dialogs contain focus, Escape closes the drawer, and focus returns to the selected employee. The employee-facing page shows only the employee's own statement, month, Print, and Download PDF.

Payment tracking is a manual record, not a bank transfer. Status is stored separately for each employee and month inside the active company's optional `payrollPayments` metadata, using the existing company storage key and workspace snapshots. Older workspaces default to Unpaid without startup writes.

Mark paid records the current calculated net amount, Admin ID, and timestamp. Repeating the same status preserves the original record. Mark not paid reverses the status. Salary or attendance changes do not overwrite a previously recorded paid amount; the register and payslip flag a difference from the latest calculation. Future months and months before joining cannot be marked paid. Deleting an employee also removes their payment metadata. Employees see only their own payment status and cannot change payment records.

**Export payroll** downloads the selected month's complete register as CSV, including calculation and payment amounts/statuses. Formula-like text is escaped for spreadsheet safety. **Download PDF**, beside Print in the detail header, downloads the selected employee/month as an A4 statement, including the Huma logo, attendance, salary breakdown, payment status, and estimate notes. Downloads are generated locally with no external library or service. The PDF uses a high-resolution rendered page, so its text is not selectable; native Print remains available. Printing uses a separate document containing only the selected statement, with the workspace, drawer, backdrop, and controls excluded.

```text
Daily rate = Monthly base salary / Working days in selected month
Deduction = Daily rate × (Absent days + 0.5 × Half days)
Net salary = Monthly base salary − Deduction
```

Approved paid leave is not absence. Lateness creates **no additional deduction**. Duplicate attendance or overlapping imported leave never creates multiple deductions for the same day: attendance takes precedence, and approved leave dates are deduplicated. Days attended include full and half days; late check-ins and half days are explicitly marked as included subsets.

Past months evaluate the complete month. The current month is **provisional**, evaluating records to date and absences on completed working days only. Future approved leave is already reserved in annual balance but appears in payroll’s attendance summary only once its date is reached. The full monthly base is shown; provisional net salary is not an earned-to-date payment. A zero working-day denominator is guarded.

## Smart Helper

The floating widget uses normalization and keyword intent matching, reading live browser data for every answer. No external AI API or API key is used.

Employee examples: “What is my salary?”, “How many leaves are remaining?”, “What is my attendance today?”, “Was I late today?”, “How many days was I absent?”, “What is my leave request status?”, “Show my payslip information.”

Admin examples: “How many employees are there?”, “How many are present today?”, “How many employees are late today?”, “How many leave requests are pending?”, “What is the company name?”, “What is the office start time?” Unknown questions show supported examples. Employee mode never looks up another person and rejects obvious requests for someone else’s records. Chat history is temporary and is not stored.

## Project architecture

Exactly seven application pages are preserved:

```text
index.html                 Company directory, creation and company-specific login
admin.html                 Company overview and attendance
employees.html             Employee directory and CRUD
leaves.html                Admin leave decisions
settings.html              Company policies and calendar exceptions
employee.html              Employee self-service
payslip.html               Role-aware payroll and print view
css/style.css              huma tokens, shell and reusable components
css/responsive.css         Responsive breakpoints and print stylesheet
js/utils.js                Date, time, formatting and validation functions
js/storage.js              Workspace registry, active data, transactions and write queue
js/auth.js                 Company creation/management, login and role checks
js/employees.js            Employee CRUD, search and cascade deletion
js/settings.js             Policies, calendar management and conflict validation
js/attendance.js           Check-in/out and working-day classification
js/leaves.js               Requests, quota accounting and decisions
js/payroll.js              Monthly attendance and payroll calculations
js/admin.js                Live dashboard aggregation
js/helper.js               Role-specific keyword assistant
js/app.js                  Shared safe DOM components and screen rendering
js/employee-dashboard.js   Scoped monthly calendar and saved-duration view model
js/payroll-export.js       Local PDF payslips and monthly payroll CSV downloads
js/payroll-workspace.js    Payroll table, summary, filters, detail drawer and print document
js/settings-workspace.js   Section forms, dirty state and interactive company calendar
js/select-control.js       Accessible shared dropdown presentation over native form values
assets/huma-logo.png       Original supplied transparent Human H logo
assets/huma-logo.svg       Self-contained logo display asset and favicon
tests/foundation.test.cjs   Static structure, storage and guard checks
tests/application.test.cjs  Authentication, workflow and calculation checks
tests/MANUAL_QA.md          Browser results and repeatable manual checks
```

Classic scripts work without a bundler. Storage and guards load in the head before protected content becomes visible; feature services and shared UI load in deferred order. Domain services contain business logic; `app.js` renders shared components and the seven screens. User-provided content uses text nodes, never HTML interpolation. The only `innerHTML` consists of fixed SVG icon paths.

Dialogs use native `<dialog>` focus containment and Escape. The mobile drawer supports Escape, keyboard focus containment, focus restoration, and inert background content. Toasts, inline errors, processing states, honest empty states, and a brief loading skeleton provide feedback. Reduced motion and keyboard focus are supported.

## Persistence

| localStorage key | Required fields |
| --- | --- |
| `hcm_company` | `name`, `startTime`, `graceMinutes`, `leaveQuota` |
| `hcm_users` | array of `id`, `name`, `email`, `password`, `role`, `department`, `salary` |
| `hcm_attendance` | array of `employeeId`, `date`, `checkIn`, `checkOut`, `status` |
| `hcm_leaves` | array of `id`, `employeeId`, `type`, `from`, `to`, `days`, `reason`, `status`, `comment` |
| `hcm_session` | `currentUserId`, `role` |
| `hcm_companies` | `{ version: 1, activeCompanyId, workspaces: [{ id, company, users, attendance, leaves }] }` |

Additional metadata: company `id` and `calendarExceptions: [{ date, type, name }]`, where type is `holiday` or `working`; session `companyId`; user `createdOn`; attendance `wasLate`, `startTime`, `graceMinutes`; leave `createdAt`, `decidedAt`. Missing calendar metadata means the default Monday–Friday schedule. Older company/session records without company IDs remain compatible and receive a stable company identity when selected or migrated. IDs use `crypto.randomUUID()` where available, with a timestamp/random fallback.

The original five keys remain the active-workspace data used by every feature. The added `hcm_companies` registry stores isolated company snapshots; transactions synchronize the active snapshot whenever records or settings change, and a successful company login replaces the active keys from the selected snapshot. The registry is written only after an explicit multi-company action; merely loading a legacy workspace creates no extra key. No seed routine, migration reset, or automatic company creation exists.

All persistence goes through `HCMStorage`. Getters validate shapes and return `null` / `[]` on missing or malformed data without resetting stored bytes. Malformed business data or a malformed registry blocks mutations to avoid replacing unreadable records. A corrupt session can be replaced by a valid login. Multi-key changes validate first and attempt rollback after storage failures. Write operations serialize through Web Locks when available, with a per-tab promise queue fallback. The registry duplicates active workspace records for switching, so browser quota can be reached sooner with many companies; failed writes report an error rather than silently dropping a workspace.

## Security and limitations

This is a **fictional-data hackathon prototype**, not a secure HR or payroll service. Credentials follow the required schema and are stored in plain text in localStorage. JavaScript and localStorage are visible and editable to the browser user; client-side guards do not protect real personnel, payroll, or credential data. Use fictional credentials only.

Data belongs to one browser origin/profile, is not synchronized across devices, and can be lost when browser data is cleared. There is no server, password recovery, production audit trail, backup service, or tax/payroll compliance engine. Web Locks require browser support; without them, avoid simultaneous writes from multiple tabs. localStorage has no crash-atomic multi-key transactions; rollback is best effort. Other tabs refresh on application storage changes and may discard unsaved form edits. Dates and times trust the device clock. Physical printing depends on browser/printer settings.

## Tests

With an optional installed Node.js runtime, run:

```sh
node tests/foundation.test.cjs
node tests/application.test.cjs
```

These are development-only scripts with no dependencies, not an application backend. **12 foundation checks and 70 application checks passed**. Fixtures run in isolated memory; they do not seed browser storage. Coverage includes syntax and all page links, zero startup writes, malformed/blocked storage, transaction rollback, setup/login, explicit role login and account switching, multi-company migration and isolation, duplicate emails across companies, company renaming/deletion, stale-tab protection, failed switch rollback, employee CRUD, settings, calendar add/edit/remove and overrides, holiday/workday effects on attendance/leave/payroll, calendar conflict protection, zero-working-day months, attendance boundaries and duplicates, leave overlap/quota/approval, leap years and cross-year balance, payroll formulas, current/future dates, cascade deletion, chatbot answers, and employee isolation.

Browser QA used a separate test origin with manually entered fictional accounts, preserving a clean first-run preview. Setup, employee create/edit/search, settings persistence, invalid and valid login, leave submission/approval/comment/balance, role redirects, payroll selection, personal payslip, and live Smart Helper answers were exercised. Authenticated pages were checked at 1440, 1024, 768, 390, and 320 CSS pixels without horizontal document overflow. Mobile drawer/Escape, the small-phone dialog, and chat were inspected. Details and remaining manual checks are in `tests/MANUAL_QA.md`.

## Static deployment

**GitHub Pages:** Push these files, open the repository’s Settings → Pages, select deployment from the branch containing `index.html`, and choose the repository root. No build command is needed. Relative assets work under a repository subpath.

**Netlify:** Drop the project folder into a manual static deployment, or connect the repository. Leave the build command empty and set publish directory to the repository root (`.`). Vercel also supports the folder as an “Other” static project without a build step.

Deployment has **not** been performed. A deployed origin begins with its own empty localStorage; local test data does not travel with the source files.

## Three-minute judges’ walkthrough

1. Open a fresh origin and create a fictional company and Admin. Show the live empty overview.
2. Save company policies, then create an employee with a fictional email, password, department, and salary. Search and edit the employee.
3. Sign out and sign in as the employee. Show the personal dashboard and attempt an Admin URL to demonstrate the redirect.
4. During the configured shift on a working day, check in and check out. Immediate checkout correctly demonstrates a half day; do not alter the device clock to fabricate an eight-hour shift. On a weekend, explain the disabled controls and show the executed attendance tests instead.
5. Request two future weekdays of paid leave. Sign in as Admin, approve with a comment, then return as Employee to show the updated balance and decision.
6. Open the payslip, explain the provisional calculation and exact deduction formula, and use Print payslip for preview or Save as PDF.
7. Ask Smart Helper about salary, leave, and attendance; refresh to demonstrate persistence. Resize to a phone to show the drawer and stacked layout.

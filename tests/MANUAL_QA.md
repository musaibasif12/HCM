# Browser QA and repeatable acceptance checks

## Multi-company follow-up — 25 October 2026

- Opened Manage companies on the isolated QA origin and verified the existing company was listed with its signed-in Admin controls.
- Used Create company to register a second company and Admin. Its dashboard and employee directory began empty, with no records copied from the original.
- Renamed the new company and confirmed the updated name after reload. Inspected the typed-name deletion confirmation and canceled; deletion, including last-company deletion, was verified in isolated automated tests instead of deleting browser data.
- Used the original company’s login link to sign back in. Its employee, half-day attendance record, approved leave/comment, custom holiday, and extra working day were preserved during migration.
- Attempted the original Admin credentials against the second company; an inline company-specific credential error appeared and the original session remained active. Correct second-company credentials opened the second company, whose employee directory remained empty.
- Checked the company directory at 1440, 1024, 768, 390, and 320 CSS pixels with no document overflow. Verified the mobile drawer contains company management/creation links and that Create company opens the correct form at 320px.
- All 52 automated checks passed, including scoped duplicate emails, company/session mismatches, stale-page write protection, legacy migration, malformed registry preservation, and rollback after failed creation or switching.

## Company calendar follow-up — 25 October 2026

- Opened Admin Settings and added a weekday holiday and an extra Sunday working day, using the actual forms on the isolated QA origin. Both persisted after reload.
- Edited the working-day title and verified the saved name. Opened the remove confirmation and canceled; service-level removal and restoration of default working-day behavior passed automated checks.
- Signed in as the employee: the Sunday shift was labeled with its custom title, Check in became available, and the holiday reduced a two-day approved request to one charged day. The remaining balance increased from 18 to 19.
- Checked in and checked out on the real Sunday extra shift without changing the device clock. The immediate checkout produced a half day and disabled both attendance buttons. The payslip showed one attended day, one half day, zero absences, a PKR 2,045.45 deduction, and PKR 87,954.55 net from a PKR 90,000 salary and 22 working days.
- Checked the updated Settings screen at 1440, 1024, 768, 390, and 320 CSS pixels with no horizontal document overflow. Inspected the add-date dialog at 320px and dismissed it with Escape.
- Browser console showed no warnings or errors. All 44 automated checks passed, including malformed/duplicate exceptions, quota/overlap prevention, failed-write rollback, holiday checkout preservation, and the zero-working-day case.

## Account access follow-up — 25 October 2026

- Verified the first-run page shows Company setup, Admin login, and Employee login navigation.
- Opened Employee login before setup and verified the form explains that Admin must first configure the company and create the employee account.
- Verified both signed-in sidebars expose a Switch account section with Employee login and Admin login buttons.
- Switched from Employee to Admin login, signed in as Admin, switched to Employee login, and signed in successfully as Employee. Existing salary, leave balance, and approval comments remained intact.
- Verified the account controls remain available inside the navigation drawer at 320px width.
- Added an automated check for role mismatches, role-specific redirects, and workspace preservation when switching accounts. All 35 checks passed.

## Executed browser checks — 24 October 2026

Tests used a separate origin on port 4174 with fictional accounts created through the application forms. Port 4173 was kept as a fresh first-run preview; there is no seeded data in the application source.

- Company and Admin setup redirected to the overview with zero employees and actual zero statistics.
- Employee creation displayed the account in the directory; salary editing persisted without changing its password.
- Searching a nonexistent name showed “No matching employees”; searching the real test name restored the row.
- Company grace period saved as 10 and remained 10 after navigating and reloading.
- Sign-out opened login. Wrong password showed an inline error. Employee and Admin logins opened the correct dashboards.
- Employee requested two future working days; status was pending and the approved balance stayed 20.
- Admin approved with a comment; the review action disappeared and pending count became zero.
- Employee’s reloaded dashboard showed 18 remaining days, 2 used, and the approval comment.
- Employee opening `admin.html` was redirected to `employee.html`.
- Employee payslip had no employee picker. Admin payslip had an employee picker and month input. Current-month figures matched the newly created employee’s zero attended/absent days and displayed the edited base salary.
- Smart Helper returned the employee’s actual edited salary from current data.
- Admin overview, employee directory, leave management, settings, employee dashboard, and payslip were checked at exactly 1440, 1024, 768, 390, and 320 CSS-pixel viewports. No horizontal document overflow was found; tables use internal scrolling.
- Mobile navigation opened and Escape closed it with focus returning to the opener. The 320px employee dialog fit the viewport and Escape dismissed it. The phone chat panel fit the viewport.
- Browser console inspection returned no warnings or errors.

## Remaining manual checks and exact steps

The browser date during QA was Saturday. Weekend attendance controls were verified disabled. Working-day check-in/out, duplicate checks, grace cutoff, saved policy snapshots, and five-hour classification were executed against the real service functions in controlled in-memory tests, rather than changing the live device clock. Repeat the following UI steps on a real working day:

1. Create a fictional employee who has no approved leave today. Sign in as them on Monday–Friday.
2. Check out before checking in: the button should be disabled.
3. Check in, refresh, and verify the timestamp remains and Check in stays disabled.
4. Compare with office start plus grace; the record should say On time or Late as appropriate.
5. Check out immediately: hours should be below five and status should become Half day. Both buttons should remain disabled after refresh.
6. With a separate account on another working day, complete at least five hours and verify On time/Late remains. Do not adjust the device clock to simulate a full shift.

Print is wired to native `window.print()` with an A4 print stylesheet. Physical printer output and browser Save as PDF remain manual checks:

1. Open a valid payslip; click Print payslip.
2. Verify the preview includes only the statement, salary/attendance breakdown, and calculation notes, with no sidebar, navigation, or chat.
3. Select A4 portrait and Save as PDF or a printer; inspect text wrapping and pagination before saving/printing.

Additional regression checks:

- In Admin’s employee dialog, try an existing email with different casing. Expect an inline duplicate-email error and no new row.
- Filter employees by department; combine the filter with search.
- Open Delete on a disposable employee and verify the confirmation explains attendance/leave deletion. Cancel first; then confirm only if the account is intentionally disposable. Verify other employees remain.
- Submit leave with reversed dates, weekend-only dates, too many days, and an overlapping pending request. Each must be rejected without adding a record.
- Reject a pending request with a comment; verify no quota is consumed. Try reviewing an already-decided request: no review action should remain.
- Select a future payslip month or a month before joining; expect no available payslip and printing disabled.
- As Employee, ask Smart Helper for another person’s salary; expect a privacy response. Ask an unsupported question; expect supported examples.
- Use Tab/Shift+Tab through dialogs and the mobile drawer, then Escape; focus must return to the trigger when it still exists.
- Open the same origin in a second tab, then sign out in one. The other protected page should return to login after the storage event.
- In a disposable test browser profile only, block localStorage or corrupt an `hcm_*` collection. Expect a clear error, blocked writes, and no automatic data reset.

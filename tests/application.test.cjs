const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const files = ['utils', 'storage', 'auth', 'employees', 'settings', 'leaves', 'attendance', 'payroll', 'admin', 'helper'];
let passed = 0;
async function test(name, callback) {
  await callback();
  passed += 1;
  console.log(`PASS ${name}`);
}
function environment(initialBytes = new Map()) {
  const bytes = initialBytes;
  let writes = 0;
  let failKey = null;
  const window = {
    crypto,
    location: { replace() {} },
    localStorage: {
      get length() { return bytes.size; },
      getItem(key) { return bytes.get(key) ?? null; },
      setItem(key, value) { if (key === failKey) throw new Error('Quota exceeded'); writes++; bytes.set(key, value); },
      removeItem(key) { writes++; bytes.delete(key); },
    },
  };
  const context = vm.createContext({ window, document: { documentElement: { dataset: {} } }, Date, console });
  for (const file of files) vm.runInContext(fs.readFileSync(path.resolve(__dirname, `../js/${file}.js`), 'utf8'), context, { filename: file });
  return { window, bytes, get writes() { return writes; }, failOn: (key) => { failKey = key; }, reloadAuth: (roles) => {
    context.document.documentElement.dataset = { roles, auth: 'pending' };
    vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../js/auth.js'), 'utf8'), context);
  } };
}
async function workspace() {
  const env = environment();
  const w = env.window;
  const admin = await w.HCMAuth.setup({ companyName: 'Memory test company', name: 'Admin', email: 'Admin@example.test', password: 'Example42', confirmPassword: 'Example42' });
  const employee = await w.HCMEmployees.save({ name: 'Employee One', email: 'one@example.test', password: 'Example42', department: 'Operations', salary: '22000' });
  const other = await w.HCMEmployees.save({ name: 'Employee Two', email: 'two@example.test', password: 'Example42', department: 'Design', salary: '44000' });
  return { ...env, w, admin, employee, other, as: (user) => w.HCMStorage.setSession({ currentUserId: user.id, role: user.role }) };
}
const record = (id, date, start, end, late = false) => ({ employeeId: id, date, checkIn: new Date(`${date}T${start}:00`).toISOString(), checkOut: end ? new Date(`${date}T${end}:00`).toISOString() : null, status: end && Number(end.slice(0, 2)) - Number(start.slice(0, 2)) < 5 ? 'half-day' : late ? 'late' : 'present', wasLate: late });
const leave = (id, employeeId, from, to, status = 'approved') => ({ id, employeeId, from, to, type: 'annual', days: 1, reason: 'Test', status, comment: '' });

(async () => {
  await test('All domain modules load with zero initial storage writes', () => {
    const env = environment();
    assert.equal(env.bytes.size, 0);
    assert.equal(env.writes, 0);
  });
  await test('Setup creates only company, admin and session; refuses a second setup', async () => {
    const env = environment();
    const w = env.window;
    const input = { companyName: ' Test ', name: ' Admin ', email: 'A@Example.test', password: 'Example42', confirmPassword: 'Wrong' };
    await assert.rejects(w.HCMAuth.setup(input), /match/);
    assert.equal(env.bytes.size, 0);
    const user = await w.HCMAuth.setup({ ...input, confirmPassword: 'Example42' });
    assert.equal(user.email, 'a@example.test');
    assert.equal(w.HCMStorage.getCompany().name, 'Test');
    assert.equal(env.bytes.size, 3);
    assert.equal(w.HCMStorage.getAttendance().length, 0);
    await assert.rejects(w.HCMAuth.setup({ ...input, confirmPassword: 'Example42' }), /replace existing/);
  });
  await test('Transactional setup rolls back after storage quota failure', async () => {
    const env = environment();
    env.failOn('hcm_users');
    await assert.rejects(env.window.HCMAuth.setup({ companyName: 'Test', name: 'Admin', email: 'a@example.test', password: 'Example42', confirmPassword: 'Example42' }), /rolled back/);
    assert.equal(env.bytes.size, 0);
  });
  await test('Login normalizes email, rejects bad credentials and repairs malformed session', async () => {
    const { w, admin, employee, bytes } = await workspace();
    w.HCMAuth.signOut();
    assert.equal(w.HCMAuth.getCurrentUser(), null);
    await assert.rejects(w.HCMAuth.login({ email: admin.email, password: 'wrong' }), /incorrect/);
    bytes.set('hcm_session', '{invalid');
    await w.HCMAuth.login({ email: ` ${employee.email.toUpperCase()} `, password: employee.password });
    assert.equal(w.HCMAuth.getCurrentUser().id, employee.id);
    assert.equal(w.HCMAuth.hasRole('admin'), false);
  });
  await test('Explicit role login rejects mismatches; switching accounts preserves workspace records', async () => {
    const { w, employee, admin } = await workspace();
    const before = JSON.stringify(w.HCMStorage.getSession());
    await assert.rejects(w.HCMAuth.login({ email: employee.email, password: employee.password, role: 'admin' }), /Employee login/);
    assert.equal(JSON.stringify(w.HCMStorage.getSession()), before);
    await w.HCMAuth.login({ email: employee.email, password: employee.password, role: 'employee' });
    assert.equal(w.HCMAuth.getCurrentUser().id, employee.id);
    await assert.rejects(w.HCMAuth.login({ email: admin.email, password: admin.password, role: 'employee' }), /Admin login/);
    let destination;
    w.location.replace = (url) => { destination = url; };
    w.HCMAuth.switchAccount('admin');
    assert.equal(destination, 'index.html?view=admin');
    assert.equal(w.HCMStorage.getSession(), null);
    assert.equal(w.HCMStorage.getUsers().length, 3);
    assert.ok(w.HCMStorage.getCompany());
    assert.throws(() => w.HCMAuth.switchAccount('owner'), /Choose/);
    w.HCMAuth.switchAccount('employee');
    assert.equal(destination, 'index.html?view=employee');
  });
  await test('Employee add/edit/search/filter validation and role boundaries', async () => {
    const { w, employee, as } = await workspace();
    await assert.rejects(w.HCMEmployees.save({ ...employee, email: 'ONE@EXAMPLE.TEST' }), /already in use/);
    await assert.rejects(w.HCMEmployees.save({ ...employee, email: 'new@example.test', salary: 0 }), /greater than zero/);
    const changed = await w.HCMEmployees.save({ ...employee, name: 'Renamed Employee', password: '', salary: 30000 }, employee.id);
    assert.equal(changed.password, employee.password);
    assert.equal(w.HCMEmployees.list('renamed', 'Operations').length, 1);
    assert.equal(w.HCMEmployees.list('missing').length, 0);
    as(employee);
    await assert.rejects(w.HCMEmployees.save(employee), /session/);
    assert.throws(() => w.HCMEmployees.list(), /session/);
  });
  await test('Settings persist without changing user records; invalid values rejected', async () => {
    const { w } = await workspace();
    const before = JSON.stringify(w.HCMStorage.getUsers());
    await w.HCMSettings.save({ name: 'Changed', startTime: '10:00', graceMinutes: '5', leaveQuota: '12' });
    assert.equal(w.HCMStorage.getCompany().startTime, '10:00');
    assert.equal(JSON.stringify(w.HCMStorage.getUsers()), before);
    await assert.rejects(w.HCMSettings.save({ name: 'Changed', startTime: '25:00', graceMinutes: 5, leaveQuota: 12 }), /start time/);
    await assert.rejects(w.HCMSettings.save({ name: 'Changed', startTime: '09:00', graceMinutes: -1, leaveQuota: 12 }), /Grace/);
  });
  await test('Local dates, leap years, weekend exclusion and invalid calendar ranges', () => {
    const { HCMUtils: U } = environment().window;
    assert.equal(U.countWorkingDays('2026-10-23', '2026-10-26'), 2);
    assert.equal(U.getWorkingDaysInMonth(2024, 2), 21);
    assert.equal(U.localDate(new Date(2026, 0, 1, 0, 1)), '2026-01-01');
    assert.equal(U.isWorkingDay('2026-10-24'), false);
    assert.throws(() => U.parseDate('2026-02-29'), /valid calendar/);
    assert.throws(() => U.countWorkingDays('2026-11-02', '2026-10-30'), /end date/);
    assert.throws(() => U.parseMonth('2026-13'), /valid month/);
  });
  await test('Attendance precision at grace cutoff; exact five-hour rule and missing checkout', () => {
    const U = environment().window.HCMUtils;
    const company = { startTime: '09:00', graceMinutes: 15 };
    assert.equal(U.calculateAttendanceStatus('2026-10-26T09:15:00', null, company).status, 'present');
    assert.equal(U.calculateAttendanceStatus('2026-10-26T09:15:01', null, company).status, 'late');
    assert.equal(U.calculateAttendanceStatus('2026-10-26T09:20:00', '2026-10-26T14:20:00', company).status, 'late');
    assert.equal(U.calculateAttendanceStatus('2026-10-26T09:00:00', '2026-10-26T13:59:59', company).status, 'half-day');
    assert.equal(U.calculateWorkedHours('2026-10-26T09:00:00', null), null);
    assert.throws(() => U.calculateWorkedHours('2026-10-26T10:00:00', '2026-10-26T09:00:00'), /invalid/);
  });
  await test('Check-in/out persists; duplicate operations, weekend and missing check-in are blocked', async () => {
    const { w, employee, as } = await workspace();
    as(employee);
    await assert.rejects(w.HCMAttendance.checkIn(new Date(2026, 9, 24, 9)), /Monday/);
    await assert.rejects(w.HCMAttendance.checkOut(new Date(2026, 9, 26, 15)), /Check in/);
    const start = await w.HCMAttendance.checkIn(new Date(2026, 9, 26, 9, 20));
    assert.equal(start.status, 'late');
    const duplicates = await Promise.allSettled([w.HCMAttendance.checkIn(new Date(2026, 9, 26, 9, 21)), w.HCMAttendance.checkIn(new Date(2026, 9, 26, 9, 22))]);
    assert.ok(duplicates.every((result) => result.status === 'rejected'));
    const end = await w.HCMAttendance.checkOut(new Date(2026, 9, 26, 13, 20));
    assert.equal(end.status, 'half-day');
    assert.equal(end.wasLate, true);
    assert.equal(w.HCMStorage.getAttendance().length, 1);
    await assert.rejects(w.HCMAttendance.checkOut(new Date(2026, 9, 26, 15)), /already/);
  });
  await test('Saved office policy is used for new check-ins and preserved after changes', async () => {
    const { w, employee, admin, as } = await workspace();
    await w.HCMSettings.save({ name: 'Test', startTime: '10:00', graceMinutes: 0, leaveQuota: 20 });
    as(employee);
    await w.HCMAttendance.checkIn(new Date(2026, 9, 26, 9, 30));
    as(admin);
    await w.HCMSettings.save({ name: 'Test', startTime: '08:00', graceMinutes: 0, leaveQuota: 20 });
    as(employee);
    const result = await w.HCMAttendance.checkOut(new Date(2026, 9, 26, 15, 30));
    assert.equal(result.status, 'present');
  });
  await test('Leave application, overlap, pending quota, approval, comment and duplicate decision', async () => {
    const { w, employee, admin, as } = await workspace();
    as(employee);
    const request = await w.HCMLeaves.apply({ type: 'annual', from: '2027-01-01', to: '2027-01-04', reason: 'Annual break' });
    assert.equal(request.days, 2);
    assert.equal(w.HCMLeaves.balance(employee.id, 2027).remaining, 20);
    await assert.rejects(w.HCMLeaves.apply({ type: 'annual', from: '2027-01-04', to: '2027-01-05', reason: 'Overlap' }), /overlap/);
    await assert.rejects(w.HCMLeaves.apply({ type: 'annual', from: '2027-01-02', to: '2027-01-03', reason: 'Weekend' }), /working day/);
    as(admin);
    await w.HCMLeaves.decide(request.id, 'approved', ' Enjoy your break ');
    assert.equal(w.HCMLeaves.balance(employee.id, 2027).remaining, 18);
    assert.equal(w.HCMLeaves.list()[0].comment, 'Enjoy your break');
    await assert.rejects(w.HCMLeaves.decide(request.id, 'rejected'), /already/);
    as(employee);
    await assert.rejects(w.HCMLeaves.apply({ type: 'annual', from: '2027-02-01', to: '2027-03-15', reason: 'Too long' }), /Not enough/);
  });
  await test('Rejected leave restores request capacity without reducing approved balance', async () => {
    const { w, employee, admin, as } = await workspace();
    as(employee);
    const request = await w.HCMLeaves.apply({ type: 'personal', from: '2027-02-01', to: '2027-02-01', reason: 'Personal' });
    as(admin);
    await w.HCMLeaves.decide(request.id, 'rejected', 'Please choose a different date.');
    as(employee);
    assert.equal(w.HCMLeaves.balance(employee.id, 2027).remaining, 20);
    await w.HCMLeaves.apply({ type: 'annual', from: '2027-02-01', to: '2027-02-01', reason: 'Reapply' });
    assert.equal(w.HCMLeaves.list().length, 2);
  });
  await test('Cross-year leave quota splits correctly and duplicate approved dates count once', () => {
    const { HCMLeaves: L } = environment().window;
    const leaves = [leave('a', 'one', '2026-12-31', '2027-01-04'), leave('b', 'one', '2027-01-01', '2027-01-04')];
    assert.equal(L.calculateLeaveBalance('one', 2026, leaves, 20).used, 1);
    assert.equal(L.calculateLeaveBalance('one', 2027, leaves, 20).used, 2);
  });
  await test('Pending requests reserve quota and lowered quota is revalidated at approval', async () => {
    const { w, employee, admin, as } = await workspace();
    await w.HCMSettings.save({ name: 'Test', startTime: '09:00', graceMinutes: 15, leaveQuota: 2 });
    as(employee);
    const pending = await w.HCMLeaves.apply({ type: 'annual', from: '2027-01-04', to: '2027-01-05', reason: 'Two days' });
    await assert.rejects(w.HCMLeaves.apply({ type: 'annual', from: '2027-01-06', to: '2027-01-06', reason: 'Reserved' }), /Not enough/);
    assert.equal(w.HCMLeaves.balance(employee.id, 2027).remaining, 2);
    as(admin);
    await w.HCMSettings.save({ name: 'Test', startTime: '09:00', graceMinutes: 15, leaveQuota: 1 });
    await assert.rejects(w.HCMLeaves.decide(pending.id, 'approved'), /Not enough/);
  });
  await test('Approved leave blocks attendance; attendance blocks conflicting leave approval', async () => {
    const { w, employee, as } = await workspace();
    w.HCMStorage.setLeaves([leave('paid', employee.id, '2026-10-26', '2026-10-26')]);
    as(employee);
    await assert.rejects(w.HCMAttendance.checkIn(new Date(2026, 9, 26, 9)), /approved paid leave/);
    assert.throws(() => w.HCMLeaves.validateRequest(leave('new', employee.id, '2026-10-27', '2026-10-27'), [], w.HCMStorage.getCompany(), [record(employee.id, '2026-10-27', '09:00', '15:00')]), /recorded attendance/);
  });
  await test('Past-month payroll: exact deductions, late + half day, approved leave and duplicates', () => {
    const w = environment().window;
    const employee = { id: 'one', salary: 22000, createdOn: '2026-10-01' };
    const attendance = [record('one', '2026-10-01', '09:00', '15:00'), record('one', '2026-10-02', '09:30', '13:30', true), record('one', '2026-10-02', '10:00', '13:00', true)];
    const leaves = [leave('paid', 'one', '2026-10-05', '2026-10-05'), leave('overlap', 'one', '2026-10-02', '2026-10-05')];
    const slip = w.HCMPayroll.calculate(employee, 2026, 10, { attendance, leaves, today: '2026-11-02' });
    assert.equal(slip.workingDays, 22);
    assert.equal(slip.presentDays, 2);
    assert.equal(slip.lateDays, 1);
    assert.equal(slip.halfDays, 1);
    assert.equal(slip.approvedLeaveDays, 1);
    assert.equal(slip.absentDays, 19);
    assert.equal(slip.dailyRate, 1000);
    assert.equal(slip.deduction, 19500);
    assert.equal(slip.netSalary, 2500);
  });
  await test('Current/future months never mark today or future dates absent', () => {
    const w = environment().window;
    const employee = { id: 'one', salary: 22000, createdOn: '2026-10-01' };
    const data = { attendance: [], leaves: [], today: '2026-10-05' };
    assert.equal(w.HCMPayroll.calculate(employee, 2026, 10, data).absentDays, 2);
    assert.equal(w.HCMPayroll.calculate(employee, 2026, 11, data).absentDays, 0);
    assert.equal(w.HCMPayroll.calculate(employee, 2026, 11, data).eligible, false);
    assert.equal(w.HCMPayroll.calculate({ ...employee, createdOn: '2026-10-05' }, 2026, 10, data).absentDays, 0);
    assert.equal(w.HCMPayroll.calculate({ ...employee, createdOn: '2026-11-01' }, 2026, 10, data).eligible, false);
  });
  await test('An open check-in is attended, not an automatic half day; no extra late deduction', () => {
    const w = environment().window;
    const slip = w.HCMPayroll.calculate({ id: 'one', salary: 22000, createdOn: '2026-10-01' }, 2026, 10, { today: '2026-10-01', attendance: [record('one', '2026-10-01', '09:30', null, true)], leaves: [] });
    assert.equal(slip.halfDays, 0);
    assert.equal(slip.lateDays, 1);
    assert.equal(slip.deduction, 0);
  });
  await test('All employee data queries enforce ownership; helper never looks up another person', async () => {
    const { w, employee, other, as } = await workspace();
    as(employee);
    assert.throws(() => w.HCMPayroll.calculatePayslip(other.id, 2026, 10), /own payslip/);
    assert.throws(() => w.HCMAttendance.records(other.id), /own attendance/);
    assert.throws(() => w.HCMLeaves.balance(other.id), /own leave/);
    assert.match(w.HCMHelper.answer('What is my salary?'), /22,000/);
    assert.doesNotMatch(w.HCMHelper.answer('What is my salary?'), /44,000/);
    assert.match(w.HCMHelper.answer('What is Employee Two salary?'), /only answer/);
    assert.match(w.HCMHelper.answer('What is Morgan’s salary?'), /only answer/);
    assert.match(w.HCMHelper.answer('How many leaves are remaining?'), /20/);
    assert.match(w.HCMHelper.answer('What is my attendance today?'), /Today:/);
    assert.match(w.HCMHelper.answer('What is my leave request status?'), /no leave requests/);
    assert.match(w.HCMHelper.answer('Show my payslip information'), /base/);
    assert.match(w.HCMHelper.answer('Unknown zebra'), /Ask about/);
  });
  await test('Admin helper reads live employee and pending leave counts', async () => {
    const { w, employee, admin, as } = await workspace();
    assert.match(w.HCMHelper.answer('How many employees are there?'), /2 active/);
    as(employee);
    await w.HCMLeaves.apply({ type: 'annual', from: '2027-05-03', to: '2027-05-03', reason: 'Test' });
    as(admin);
    assert.match(w.HCMHelper.answer('How many leave requests are pending?'), /1 leave/);
    assert.match(w.HCMHelper.answer('What is the office start time?'), /09:00/);
    assert.match(w.HCMHelper.answer('What is the company name?'), /Memory test company/);
  });
  await test('Deleting an employee cascades attendance and leave without deleting other records', async () => {
    const { w, employee, other } = await workspace();
    w.HCMStorage.setAttendance([record(employee.id, '2026-10-01', '09:00', '15:00'), record(other.id, '2026-10-01', '09:00', '15:00')]);
    w.HCMStorage.setLeaves([leave('one', employee.id, '2026-10-05', '2026-10-05'), leave('two', other.id, '2026-10-06', '2026-10-06')]);
    await w.HCMEmployees.remove(employee.id);
    assert.equal(w.HCMStorage.findById('users', employee.id), null);
    assert.equal(w.HCMStorage.getAttendance().length, 1);
    assert.equal(w.HCMStorage.getLeaves()[0].employeeId, other.id);
    assert.equal(w.HCMStorage.getUsers().length, 2);
  });
  await test('Malformed stored business data blocks writes and preserves original bytes', async () => {
    const { w, bytes } = await workspace();
    bytes.set('hcm_leaves', '{broken');
    await assert.rejects(w.HCMSettings.save({ name: 'Test', startTime: '09:00', graceMinutes: 15, leaveQuota: 20 }), /unreadable/);
    assert.equal(bytes.get('hcm_leaves'), '{broken');
  });
  await test('Calendar dates can be added, edited and removed without policy saves discarding them', async () => {
    const { w, employee, as } = await workspace();
    assert.equal(w.HCMStorage.getCompany().calendarExceptions, undefined);
    await w.HCMSettings.saveCalendarDay({ calendarDate: '2027-01-04', dayType: 'holiday', title: ' Company day off ' });
    assert.equal(w.HCMStorage.getCompany().calendarExceptions[0].name, 'Company day off');
    await w.HCMSettings.save({ name: 'Updated', startTime: '09:00', graceMinutes: 10, leaveQuota: 20 });
    assert.equal(w.HCMStorage.getCompany().calendarExceptions.length, 1);
    await w.HCMSettings.saveCalendarDay({ calendarDate: '2027-01-05', dayType: 'working', title: 'Shift day' }, '2027-01-04');
    assert.equal(w.HCMStorage.getCompany().calendarExceptions[0].date, '2027-01-05');
    await assert.rejects(w.HCMSettings.saveCalendarDay({ calendarDate: '2027-01-05', dayType: 'holiday', title: 'Duplicate' }), /already exists/);
    await assert.rejects(w.HCMSettings.saveCalendarDay({ calendarDate: '2027-02-30', dayType: 'holiday', title: 'Invalid' }), /valid calendar/);
    await assert.rejects(w.HCMSettings.saveCalendarDay({ calendarDate: '2027-01-06', dayType: 'other', title: 'Invalid' }), /Choose Holiday/);
    await w.HCMSettings.removeCalendarDay('2027-01-05');
    assert.equal(w.HCMStorage.getCompany().calendarExceptions.length, 0);
    as(employee);
    await assert.rejects(w.HCMSettings.saveCalendarDay({ calendarDate: '2027-01-04', dayType: 'holiday', title: 'Not allowed' }), /session/);
    await assert.rejects(w.HCMSettings.removeCalendarDay('2027-01-04'), /session/);
  });
  await test('Calendar overrides include weekend shifts and exclude weekday holidays in date counts', () => {
    const U = environment().window.HCMUtils;
    const holiday = { date: '2026-10-23', type: 'holiday', name: 'Holiday' };
    const extra = { date: '2026-10-24', type: 'working', name: 'Saturday shift' };
    assert.equal(U.isWorkingDay(holiday.date, [holiday]), false);
    assert.equal(U.isWorkingDay(extra.date, [extra]), true);
    assert.equal(U.calendarDay(holiday.date, [holiday]).name, 'Holiday');
    assert.equal(U.getWorkingDaysInMonth(2026, 10, [holiday]), 21);
    assert.equal(U.getWorkingDaysInMonth(2026, 10, [extra]), 23);
    assert.equal(U.countWorkingDays('2026-10-23', '2026-10-26', [holiday, extra]), 2);
  });
  await test('Company calendar controls check-in, absence and payroll for weekend shifts', async () => {
    const { w, employee, as } = await workspace();
    await w.HCMSettings.saveCalendarDay({ calendarDate: '2027-01-02', dayType: 'working', title: 'Saturday shift' });
    await w.HCMSettings.saveCalendarDay({ calendarDate: '2027-01-04', dayType: 'holiday', title: 'Company holiday' });
    const calendar = w.HCMStorage.getCompany().calendarExceptions;
    as(employee);
    await w.HCMAttendance.checkIn(new Date(2027, 0, 2, 9));
    await w.HCMAttendance.checkOut(new Date(2027, 0, 2, 15));
    await assert.rejects(w.HCMAttendance.checkIn(new Date(2027, 0, 4, 9)), /holiday/);
    assert.equal(w.HCMAttendance.dayState(employee, '2027-01-04', [], [], '2027-01-05', calendar).status, 'holiday');
    assert.equal(w.HCMAttendance.dayState(employee, '2027-01-02', [], [], '2027-01-05', calendar).status, 'absent');
    const data = { today: '2027-01-05', calendar, attendance: w.HCMStorage.getAttendance(), leaves: [] };
    const slip = w.HCMPayroll.calculate(employee, 2027, 1, data);
    assert.equal(slip.presentDays, 1);
    assert.equal(slip.absentDays, 1);
    assert.equal(slip.halfDays, 0);
    assert.equal(slip.workingDays, w.HCMUtils.getWorkingDaysInMonth(2027, 1));
  });
  await test('Calendar edits recalculate approved leave days and balances in the same transaction', async () => {
    const { w, employee, admin, as } = await workspace();
    as(employee);
    const request = await w.HCMLeaves.apply({ type: 'annual', from: '2027-01-01', to: '2027-01-04', reason: 'Calendar test' });
    as(admin);
    await w.HCMLeaves.decide(request.id, 'approved');
    await w.HCMSettings.saveCalendarDay({ calendarDate: '2027-01-02', dayType: 'working', title: 'Saturday shift' });
    assert.equal(w.HCMStorage.getLeaves()[0].days, 3);
    assert.equal(w.HCMLeaves.balance(employee.id, 2027).used, 3);
    await w.HCMSettings.saveCalendarDay({ calendarDate: '2027-01-04', dayType: 'holiday', title: 'Company holiday' });
    assert.equal(w.HCMStorage.getLeaves()[0].days, 2);
    assert.equal(w.HCMLeaves.balance(employee.id, 2027).used, 2);
    await w.HCMSettings.removeCalendarDay('2027-01-04');
    assert.equal(w.HCMStorage.getLeaves()[0].days, 3);
    as(employee);
    await assert.rejects(w.HCMAttendance.checkIn(new Date(2027, 0, 2, 9)), /approved paid leave/);
  });
  await test('New leave requests use holidays and extra working days rather than fixed weekdays', async () => {
    const { w, employee, as } = await workspace();
    await w.HCMSettings.saveCalendarDay({ calendarDate: '2027-01-02', dayType: 'working', title: 'Saturday shift' });
    await w.HCMSettings.saveCalendarDay({ calendarDate: '2027-01-04', dayType: 'holiday', title: 'Holiday' });
    as(employee);
    const request = await w.HCMLeaves.apply({ type: 'annual', from: '2027-01-02', to: '2027-01-04', reason: 'Weekend workday off' });
    assert.equal(request.days, 1);
    await assert.rejects(w.HCMLeaves.apply({ type: 'annual', from: '2027-01-04', to: '2027-01-04', reason: 'Holiday only' }), /working day/);
  });
  await test('Calendar changes cannot introduce overlapping active requests or increase over-quota leave', async () => {
    const { w, employee, admin, as } = await workspace();
    as(employee);
    await w.HCMLeaves.apply({ type: 'annual', from: '2027-01-01', to: '2027-01-02', reason: 'First request' });
    await w.HCMLeaves.apply({ type: 'annual', from: '2027-01-02', to: '2027-01-04', reason: 'Second request' });
    as(admin);
    await assert.rejects(w.HCMSettings.saveCalendarDay({ calendarDate: '2027-01-02', dayType: 'working', title: 'Conflict' }), /overlap/);
    assert.equal(w.HCMStorage.getCompany().calendarExceptions, undefined);
    const second = await workspace();
    await second.w.HCMSettings.save({ name: 'Test', startTime: '09:00', graceMinutes: 15, leaveQuota: 2 });
    second.as(second.employee);
    await second.w.HCMLeaves.apply({ type: 'annual', from: '2027-01-01', to: '2027-01-04', reason: 'Two-day request' });
    second.as(second.admin);
    await assert.rejects(second.w.HCMSettings.saveCalendarDay({ calendarDate: '2027-01-02', dayType: 'working', title: 'Over quota' }), /allowance/);
    assert.equal(second.w.HCMStorage.getLeaves()[0].days, 2);
  });
  await test('Historical holiday changes preserve attendance and allow checkout without a holiday deduction', async () => {
    const { w, employee, admin, as } = await workspace();
    as(employee);
    await w.HCMAttendance.checkIn(new Date(2027, 0, 4, 9));
    as(admin);
    await w.HCMSettings.saveCalendarDay({ calendarDate: '2027-01-04', dayType: 'holiday', title: 'Holiday' });
    as(employee);
    await w.HCMAttendance.checkOut(new Date(2027, 0, 4, 10));
    const attendance = w.HCMStorage.getAttendance();
    const calendar = w.HCMStorage.getCompany().calendarExceptions;
    assert.equal(attendance[0].status, 'half-day');
    assert.equal(w.HCMAttendance.dayState(employee, '2027-01-04', attendance, [], '2027-01-04', calendar).record.checkOut, attendance[0].checkOut);
    const slip = w.HCMPayroll.calculate(employee, 2027, 1, { attendance, leaves: [], calendar, today: '2027-01-04' });
    assert.equal(slip.halfDays, 0);
    assert.equal(slip.presentDays, 0);
    assert.equal(slip.absentDays, 1);
  });
  await test('A month with all weekdays marked as holidays has a safe zero daily rate', () => {
    const w = environment().window;
    const calendar = w.HCMUtils.workingDates('2026-10-01', '2026-10-31').map((date) => ({ date, type: 'holiday', name: 'Shutdown' }));
    const slip = w.HCMPayroll.calculate({ id: 'one', salary: 22000 }, 2026, 10, { attendance: [], leaves: [], calendar, today: '2026-11-01' });
    assert.equal(slip.workingDays, 0);
    assert.equal(slip.dailyRate, 0);
    assert.equal(slip.deduction, 0);
    assert.equal(slip.netSalary, 22000);
  });
  await test('Calendar persistence rejects malformed and duplicate dates and rolls back failed updates', async () => {
    const env = await workspace();
    const { w } = env;
    const company = w.HCMStorage.getCompany();
    const day = { date: '2027-01-04', type: 'holiday', name: 'Holiday' };
    assert.throws(() => w.HCMStorage.setCompany({ ...company, calendarExceptions: [day, day] }), /Invalid company/);
    assert.throws(() => w.HCMStorage.setCompany({ ...company, calendarExceptions: [{ ...day, date: '2027-02-30' }] }), /Invalid company/);
    env.failOn('hcm_leaves');
    await assert.rejects(w.HCMSettings.saveCalendarDay({ calendarDate: day.date, dayType: day.type, title: day.name }), /Could not save/);
    assert.equal(w.HCMStorage.getCompany().calendarExceptions, undefined);
  });
  const companyInput = (companyName, email = 'shared-admin@example.test') => ({ companyName, name: 'Company Admin', email, password: 'Company42', confirmPassword: 'Company42' });
  await test('Creating a second company preserves the first company and starts an isolated workspace', async () => {
    const { w, employee } = await workspace();
    const firstId = w.HCMStorage.getActiveCompanyId();
    w.HCMStorage.setAttendance([record(employee.id, '2026-10-23', '09:00', '15:00')]);
    w.HCMStorage.setLeaves([leave('first-leave', employee.id, '2027-01-04', '2027-01-04')]);
    await w.HCMSettings.saveCalendarDay({ calendarDate: '2027-02-01', dayType: 'holiday', title: 'First company holiday' });
    const first = JSON.stringify(w.HCMStorage.getWorkspace(firstId));
    const secondAdmin = await w.HCMAuth.createCompany(companyInput('Second company'));
    assert.equal(w.HCMStorage.listCompanies().length, 2);
    assert.notEqual(w.HCMStorage.getActiveCompanyId(), firstId);
    assert.equal(w.HCMStorage.getUsers().length, 1);
    assert.equal(w.HCMStorage.getUsers()[0].id, secondAdmin.id);
    assert.equal(w.HCMStorage.getAttendance().length, 0);
    assert.equal(w.HCMStorage.getLeaves().length, 0);
    assert.equal(w.HCMStorage.getCompany().calendarExceptions, undefined);
    assert.equal(JSON.stringify(w.HCMStorage.getWorkspace(firstId)), first);
    await assert.rejects(w.HCMAuth.createCompany(companyInput(' second COMPANY ')), /already exists/);
  });
  await test('Company-specific login validates credentials before switching and never mixes duplicate emails', async () => {
    const { w, employee, admin } = await workspace();
    const firstId = w.HCMStorage.getActiveCompanyId();
    const secondAdmin = await w.HCMAuth.createCompany(companyInput('Second company', admin.email));
    const secondId = w.HCMStorage.getActiveCompanyId();
    const secondEmployee = await w.HCMEmployees.save({ ...employee, salary: 55000, password: 'OtherPassword' });
    await assert.rejects(w.HCMAuth.login({ companyId: secondId, email: employee.email, password: employee.password, role: 'employee' }), /selected company/);
    assert.equal(w.HCMStorage.getActiveCompanyId(), secondId);
    assert.equal(w.HCMAuth.getCurrentUser().id, secondAdmin.id);
    await w.HCMAuth.login({ companyId: firstId, email: employee.email, password: employee.password, role: 'employee' });
    assert.equal(w.HCMAuth.getCurrentUser().id, employee.id);
    assert.equal(w.HCMStorage.getCompany().name, 'Memory test company');
    await assert.rejects(w.HCMAuth.login({ companyId: secondId, email: admin.email, password: admin.password, role: 'admin' }), /selected company/);
    assert.equal(w.HCMStorage.getActiveCompanyId(), firstId);
    await w.HCMAuth.login({ companyId: secondId, email: secondEmployee.email, password: secondEmployee.password, role: 'employee' });
    assert.equal(w.HCMAuth.getCurrentUser().salary, 55000);
    assert.match(w.HCMHelper.answer('What is my salary?'), /55,000/);
    assert.throws(() => w.HCMPayroll.calculatePayslip(employee.id, 2026, 10), /own payslip/);
    assert.throws(() => w.HCMAttendance.records(employee.id), /own attendance/);
  });
  await test('Company snapshots stay current across employee, calendar, policy and rename changes', async () => {
    const env = await workspace();
    const { w, employee, admin } = env;
    const firstId = w.HCMStorage.getActiveCompanyId();
    await w.HCMAuth.createCompany(companyInput('Second company'));
    const secondId = w.HCMStorage.getActiveCompanyId();
    const newEmployee = await w.HCMEmployees.save({ ...employee, salary: 61000 });
    await w.HCMSettings.saveCalendarDay({ calendarDate: '2027-02-01', dayType: 'holiday', title: 'Second holiday' });
    await w.HCMAuth.renameCompany('Renamed second', secondId);
    assert.equal(w.HCMStorage.listCompanies().find((entry) => entry.id === secondId).name, 'Renamed second');
    await assert.rejects(w.HCMSettings.save({ name: 'Memory test company', startTime: '09:00', graceMinutes: 15, leaveQuota: 20 }), /already exists/);
    await w.HCMAuth.login({ companyId: firstId, email: admin.email, password: admin.password, role: 'admin' });
    assert.equal(w.HCMEmployees.list().length, 2);
    assert.equal(w.HCMStorage.findById('users', newEmployee.id), null);
    assert.equal(w.HCMStorage.getCompany().calendarExceptions, undefined);
    await w.HCMAuth.login({ companyId: secondId, email: 'shared-admin@example.test', password: 'Company42', role: 'admin' });
    assert.equal(w.HCMEmployees.list().length, 1);
    assert.equal(w.HCMEmployees.list()[0].salary, 61000);
    assert.equal(w.HCMStorage.getCompany().calendarExceptions[0].name, 'Second holiday');
    const restored = environment(env.bytes).window;
    assert.equal(restored.HCMStorage.listCompanies().length, 2);
    assert.equal(restored.HCMAuth.getCurrentUser().role, 'admin');
    assert.equal(restored.HCMStorage.getCompany().name, 'Renamed second');
  });
  await test('Legacy company records migrate only when another company is created, preserving IDs and history', async () => {
    const env = environment();
    const w = env.window;
    const legacyAdmin = { id: 'old-admin', name: 'Old Admin', email: 'old@example.test', password: 'Example42', role: 'admin', department: '', salary: 0 };
    const oldCompany = { name: 'Existing legacy company', startTime: '08:00', graceMinutes: 5, leaveQuota: 17, calendarExceptions: [{ date: '2027-02-01', type: 'holiday', name: 'Legacy holiday' }] };
    w.HCMStorage.setCompany(oldCompany);
    w.HCMStorage.setUsers([legacyAdmin]);
    w.HCMStorage.setAttendance([record('legacy-employee', '2026-10-23', '08:00', '15:00')]);
    w.HCMStorage.setLeaves([leave('legacy-leave', 'legacy-employee', '2027-01-04', '2027-01-04')]);
    w.HCMStorage.setSession({ currentUserId: legacyAdmin.id, role: 'admin' });
    const writes = env.writes;
    assert.equal(w.HCMStorage.listCompanies()[0].id, 'legacy-company');
    assert.equal(env.writes, writes);
    assert.equal(w.HCMStorage.readJSON(w.HCMStorage.keys.companies), null);
    await w.HCMAuth.createCompany(companyInput('New company'));
    await w.HCMAuth.login({ companyId: 'legacy-company', email: legacyAdmin.email, password: legacyAdmin.password });
    assert.equal(w.HCMAuth.getCurrentUser().id, 'old-admin');
    assert.equal(w.HCMStorage.getCompany().leaveQuota, 17);
    assert.equal(w.HCMStorage.getCompany().calendarExceptions[0].name, 'Legacy holiday');
    assert.equal(w.HCMStorage.getAttendance()[0].employeeId, 'legacy-employee');
    assert.equal(w.HCMStorage.getLeaves()[0].id, 'legacy-leave');
  });
  await test('Only the active company admin can rename or delete it; deletion preserves other workspaces', async () => {
    const { w, admin } = await workspace();
    const firstId = w.HCMStorage.getActiveCompanyId();
    const first = JSON.stringify(w.HCMStorage.getWorkspace(firstId));
    await w.HCMAuth.createCompany(companyInput('Second company'));
    const secondId = w.HCMStorage.getActiveCompanyId();
    const worker = await w.HCMEmployees.save({ name: 'Second worker', email: 'worker@example.test', password: 'Example42', department: 'Design', salary: 40000 });
    await assert.rejects(w.HCMAuth.renameCompany('Wrong target', firstId), /active company changed/);
    await assert.rejects(w.HCMAuth.deleteCompany('Memory test company', firstId), /active company changed/);
    await assert.rejects(w.HCMAuth.deleteCompany('wrong name', secondId), /exactly/);
    await w.HCMAuth.login({ companyId: secondId, email: worker.email, password: worker.password });
    await assert.rejects(w.HCMAuth.renameCompany('No permission', secondId), /session/);
    await assert.rejects(w.HCMAuth.deleteCompany('Second company', secondId), /session/);
    await w.HCMAuth.login({ companyId: secondId, email: 'shared-admin@example.test', password: 'Company42' });
    await w.HCMAuth.deleteCompany('Second company', secondId);
    assert.equal(w.HCMStorage.listCompanies().length, 1);
    assert.equal(w.HCMStorage.getWorkspace(secondId), null);
    assert.equal(w.HCMStorage.getSession(), null);
    assert.equal(JSON.stringify(w.HCMStorage.getWorkspace(firstId)), first);
    await w.HCMAuth.login({ companyId: firstId, email: admin.email, password: admin.password });
    assert.equal(w.HCMEmployees.list().length, 2);
    await w.HCMAuth.deleteCompany('Memory test company', firstId);
    assert.equal(w.HCMStorage.listCompanies().length, 0);
    assert.equal(w.HCMStorage.getCompany(), null);
    assert.equal(w.HCMStorage.getUsers().length, 0);
    await w.HCMAuth.createCompany(companyInput('A fresh company'));
    assert.equal(w.HCMStorage.listCompanies().length, 1);
    assert.equal(w.HCMStorage.getCompany().name, 'A fresh company');
  });
  await test('Failed multi-company creation and switching restore the prior workspace without data loss', async () => {
    const env = await workspace();
    const { w, admin } = env;
    const firstId = w.HCMStorage.getActiveCompanyId();
    const before = JSON.stringify([...env.bytes.entries()].sort());
    env.failOn('hcm_users');
    await assert.rejects(w.HCMAuth.createCompany(companyInput('Should fail')), /Could not save/);
    assert.equal(JSON.stringify([...env.bytes.entries()].sort()), before);
    env.failOn(null);
    await w.HCMAuth.createCompany(companyInput('Second company'));
    const secondId = w.HCMStorage.getActiveCompanyId();
    const secondBefore = JSON.stringify([...env.bytes.entries()].sort());
    env.failOn('hcm_leaves');
    await assert.rejects(w.HCMAuth.login({ companyId: firstId, email: admin.email, password: admin.password }), /Could not save/);
    assert.equal(JSON.stringify([...env.bytes.entries()].sort()), secondBefore);
    assert.equal(w.HCMStorage.getActiveCompanyId(), secondId);
    env.failOn(null);
  });
  await test('Malformed company registry blocks mutations and is never silently overwritten', async () => {
    const { w, bytes } = await workspace();
    await w.HCMAuth.createCompany(companyInput('Second company'));
    bytes.set('hcm_companies', '{broken registry');
    const before = bytes.get('hcm_company');
    await assert.rejects(w.HCMAuth.createCompany(companyInput('Another company')), /unreadable/);
    assert.equal(bytes.get('hcm_companies'), '{broken registry');
    assert.equal(bytes.get('hcm_company'), before);
  });
  await test('Company-bound sessions and stale protected pages cannot operate in a switched workspace', async () => {
    const env = await workspace();
    const { w, admin } = env;
    const firstId = w.HCMStorage.getActiveCompanyId();
    await w.HCMAuth.createCompany(companyInput('Second company'));
    const secondId = w.HCMStorage.getActiveCompanyId();
    await w.HCMAuth.login({ companyId: firstId, email: admin.email, password: admin.password });
    env.reloadAuth('admin');
    await w.HCMAuth.login({ companyId: secondId, email: 'shared-admin@example.test', password: 'Company42' });
    assert.throws(() => w.HCMAuth.requireRole('admin'), /active company or account changed/);
    const session = w.HCMStorage.getSession();
    w.HCMStorage.setSession({ ...session, companyId: firstId });
    assert.equal(w.HCMAuth.getCurrentUser(), null);
  });
  console.log(`\n${passed} application checks passed. Fixtures used isolated memory only.`);
})().catch((error) => { console.error(error); process.exitCode = 1; });

(function () {
  'use strict';
  const U = window.HCMUtils;
  function calculateMonthlyAttendance(employeeId, year, month, data) {
    const [from, to] = U.monthRange(year, month);
    const employee = data.employee;
    const today = data.today || U.localDate();
    const counts = { presentDays: 0, lateDays: 0, halfDays: 0, absentDays: 0, approvedLeaveDays: 0, onTimeDays: 0, evaluatedDays: 0 };
    for (const date of U.workingDates(from, to, data.calendar || [])) {
      if (date > today || (employee.createdOn && date < employee.createdOn)) continue;
      const state = window.HCMAttendance.dayState({ ...employee, id: employeeId }, date, data.attendance, data.leaves, today, data.calendar || []);
      if (state.record) {
        const hours = U.calculateWorkedHours(state.record.checkIn, state.record.checkOut);
        const halfDay = hours !== null && hours < 5;
        const late = typeof state.record.wasLate === 'boolean' ? state.record.wasLate : state.record.status === 'late';
        counts.presentDays += 1;
        if (late) counts.lateDays += 1;
        if (halfDay) counts.halfDays += 1;
        else if (!late) counts.onTimeDays += 1;
      } else if (state.status === 'leave') counts.approvedLeaveDays += 1;
      else if (state.status === 'absent') counts.absentDays += 1;
      else continue;
      counts.evaluatedDays += 1;
    }
    return counts;
  }
  function calculate(employee, year, month, data) {
    const workingDays = U.getWorkingDaysInMonth(year, month, data.calendar || []);
    const summary = calculateMonthlyAttendance(employee.id, year, month, { ...data, employee });
    const dailyRate = workingDays > 0 ? employee.salary / workingDays : 0;
    const deduction = dailyRate * (summary.absentDays + 0.5 * summary.halfDays);
    const [from, to] = U.monthRange(year, month);
    const today = data.today || U.localDate();
    return { ...summary, workingDays, dailyRate, deduction, netSalary: employee.salary - deduction, salary: employee.salary, year, month,
      provisional: to >= today, eligible: from <= today && (!employee.createdOn || employee.createdOn <= to) };
  }
  function calculatePayslip(employeeId, year, month) {
    const actor = window.HCMAuth.requireRole(['admin', 'employee']);
    if (actor.role === 'employee' && employeeId !== actor.id) throw new Error('You can only view your own payslip.');
    const employee = window.HCMStorage.findById('users', employeeId);
    if (!employee || employee.role !== 'employee') throw new Error('Choose an active employee.');
    return calculate(employee, year, month, { attendance: window.HCMStorage.getAttendance(), leaves: window.HCMStorage.getLeaves(), calendar: window.HCMStorage.getCompany().calendarExceptions || [] });
  }
  window.HCMPayroll = Object.freeze({ calculateMonthlyAttendance, calculate, calculatePayslip });
}());

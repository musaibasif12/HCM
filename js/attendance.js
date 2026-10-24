(function () {
  'use strict';
  const S = window.HCMStorage;
  const U = window.HCMUtils;
  function checkIn(now = new Date()) {
    return S.mutate(() => {
      const user = window.HCMAuth.requireRole('employee');
      const date = U.localDate(now);
      const company = S.getCompany();
      const calendar = company.calendarExceptions || [];
      if (!U.isWorkingDay(date, calendar)) throw new Error('Today is a holiday or non-working day in your company calendar. The default workweek is Monday to Friday.');
      const attendance = S.getAttendance();
      if (attendance.some((record) => record.employeeId === user.id && record.date === date)) throw new Error('You have already checked in today.');
      if (window.HCMLeaves.approvedDates(user.id, S.getLeaves(), calendar).has(date)) throw new Error('You are on approved paid leave today.');
      const checkIn = now.toISOString();
      const result = U.calculateAttendanceStatus(checkIn, null, company);
      const record = { employeeId: user.id, date, checkIn, checkOut: null, status: result.status, wasLate: result.wasLate, startTime: company.startTime, graceMinutes: company.graceMinutes };
      S.transaction({ attendance: [...attendance, record] });
      return record;
    });
  }
  function checkOut(now = new Date()) {
    return S.mutate(() => {
      const user = window.HCMAuth.requireRole('employee');
      const date = U.localDate(now);
      const attendance = S.getAttendance();
      const matches = attendance.filter((record) => record.employeeId === user.id && record.date === date);
      if (matches.length !== 1 || !matches[0].checkIn) throw new Error('Check in before checking out.');
      const record = matches[0];
      if (record.checkOut) throw new Error('You have already checked out today.');
      const checkOut = now.toISOString();
      const workedHours = U.calculateWorkedHours(record.checkIn, checkOut);
      const wasLate = typeof record.wasLate === 'boolean' ? record.wasLate
        : U.calculateAttendanceStatus(record.checkIn, null, record.startTime ? record : S.getCompany()).wasLate;
      const updated = { ...record, checkOut, wasLate, status: workedHours < 5 ? 'half-day' : wasLate ? 'late' : 'present' };
      S.transaction({ attendance: attendance.map((entry) => entry === record ? updated : entry) });
      return updated;
    });
  }
  function records(employeeId) {
    const user = window.HCMAuth.requireRole(['admin', 'employee']);
    if (user.role === 'employee' && employeeId !== user.id) throw new Error('You can only view your own attendance.');
    return S.getAttendance().filter((record) => record.employeeId === employeeId).sort((a, b) => b.date.localeCompare(a.date));
  }
  function dayState(employee, date, attendance, leaves, today = U.localDate(), calendar = []) {
    if (employee.createdOn && date < employee.createdOn) return { status: 'not-employed', record: null };
    if (date > today) return { status: 'scheduled', record: null };
    const record = attendance.filter((entry) => entry.employeeId === employee.id && entry.date === date && entry.checkIn)
      .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn))[0];
    if (record) return { status: record.status, record };
    const day = U.calendarDay(date, calendar);
    if (!day.working) return { status: day.type === 'holiday' ? 'holiday' : 'non-working', record: null };
    if (window.HCMLeaves.approvedDates(employee.id, leaves, calendar).has(date)) return { status: 'leave', record: null };
    return { status: date < today ? 'absent' : 'not-started', record: null };
  }
  window.HCMAttendance = Object.freeze({ checkIn, checkOut, records, dayState });
}());

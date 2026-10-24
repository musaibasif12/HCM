(function () {
  'use strict';
  const S = window.HCMStorage;
  const U = window.HCMUtils;
  function save(input, employeeId = null) {
    return S.mutate(() => {
      window.HCMAuth.requireRole('admin');
      const users = S.getUsers();
      const existing = employeeId ? users.find((user) => user.id === employeeId && user.role === 'employee') : null;
      if (employeeId && !existing) throw new Error('Employee no longer exists.');
      const email = U.email(input.email);
      if (users.some((user) => user.id !== employeeId && user.email.toLowerCase() === email)) throw new Error('This email address is already in use.');
      const salary = Number(input.salary);
      if (!Number.isFinite(salary) || salary <= 0 || salary > 1e12) throw new Error('Salary must be greater than zero and no more than 1 trillion.');
      const user = {
        ...existing, id: existing?.id || U.id(), name: U.required(input.name, 'Full name'), email,
        password: existing && !input.password ? existing.password : U.password(input.password), role: 'employee',
        department: U.required(input.department, 'Department', 80), salary,
        createdOn: existing?.createdOn || U.localDate(),
      };
      S.transaction({ users: existing ? users.map((entry) => entry.id === employeeId ? user : entry) : [...users, user] });
      return user;
    });
  }
  function remove(employeeId) {
    return S.mutate(() => {
      window.HCMAuth.requireRole('admin');
      const user = S.findById('users', employeeId);
      if (!user || user.role !== 'employee') throw new Error('Employee no longer exists.');
      S.transaction({ users: S.getUsers().filter((entry) => entry.id !== employeeId), attendance: S.getAttendance().filter((entry) => entry.employeeId !== employeeId), leaves: S.getLeaves().filter((entry) => entry.employeeId !== employeeId) });
    });
  }
  function list(search = '', department = '') {
    window.HCMAuth.requireRole('admin');
    const query = search.trim().toLowerCase();
    return S.getUsers().filter((user) => user.role === 'employee' && (!department || user.department === department)
      && `${user.name} ${user.email}`.toLowerCase().includes(query)).sort((a, b) => a.name.localeCompare(b.name));
  }
  window.HCMEmployees = Object.freeze({ save, remove, list });
}());

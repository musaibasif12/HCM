(function () {
  'use strict';
  const S = window.HCMStorage;
  const A = window.HCMAuth;
  const U = window.HCMUtils;
  const page = document.documentElement.dataset.page;
  let renderCurrent = () => {};
  const iconPaths = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-13 5h2m4 0h2"/>',
    settings: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M8 13h8m-8 4h5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    building: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 21v-4h6v4M8 7h1m6 0h1M8 11h1m6 0h1"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8Z"/>',
    print: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/>',
  };
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs)) {
      if (value === undefined || value === null || value === false) continue;
      if (name === 'class') node.className = value;
      else if (name === 'text') node.textContent = value;
      else if (name.startsWith('on')) node.addEventListener(name.slice(2).toLowerCase(), value);
      else if (name === 'value') node.value = value;
      else if (value === true) node.setAttribute(name, '');
      else node.setAttribute(name, value);
    }
    for (const child of children.flat(Infinity)) {
      if (child !== null && child !== undefined && child !== false) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) svg.setAttribute(key, value);
    // These paths are fixed application assets. User content is always a text node.
    svg.innerHTML = iconPaths[name] || iconPaths.grid;
    return svg;
  }
  function brand() {
    return el('a', { class: 'brand', href: 'index.html', 'aria-label': 'huma home' }, el('span', { class: 'brand-symbol', 'aria-hidden': 'true' }, 'h'), el('span', {}, 'huma', el('span', { class: 'brand-dot' }, '.')));
  }
  function button(text, action, variant = 'primary', iconName) {
    return el('button', { type: 'button', class: `button button-${variant}`, onClick: action }, iconName && icon(iconName), text);
  }
  function iconButton(name, label, action, className = '') {
    return el('button', { type: 'button', class: `icon-button ${className}`, 'aria-label': label, title: label, onClick: action }, icon(name));
  }
  function link(text, href, primary = false) { return el('a', { class: primary ? 'button button-primary' : 'text-link', href }, text, icon('arrow')); }
  function badge(status) { return el('span', { class: `badge badge-${status}` }, U.statusLabels[status] || status); }
  function empty(title, text, iconName = 'users', action) {
    return el('div', { class: 'empty-state' }, el('span', { class: 'empty-icon' }, icon(iconName)), el('h3', {}, title), el('p', {}, text), action);
  }
  function card(title, description, content, action) {
    return el('section', { class: 'card' }, el('div', { class: 'card-header' }, el('div', {}, el('h2', {}, title), description && el('p', { class: 'muted' }, description)), action), content);
  }
  function heading(title, description, action) {
    return el('div', { class: 'page-header' }, el('div', {}, el('h1', {}, title), el('p', { class: 'page-description' }, description)), action);
  }
  function metric(label, value, detail, iconName = 'grid') {
    return el('div', { class: 'metric' }, el('div', { class: 'metric-top' }, el('span', {}, label), icon(iconName)), el('div', { class: 'metric-value' }, value), el('p', {}, detail));
  }
  function table(headers, rows, emptyContent) {
    if (!rows.length) return emptyContent || empty('Nothing here yet', 'New activity will appear here.');
    return el('div', { class: 'table-scroll', tabindex: '0', 'aria-label': `${headers.join(', ')} table` }, el('table', {}, el('thead', {}, el('tr', {}, headers.map((header) => el('th', { scope: 'col' }, header)))), el('tbody', {}, rows.map((row) => el('tr', {}, row.map((cell) => el('td', {}, cell)))))));
  }
  function toast(message, error = false) {
    const node = el('div', { class: `toast ${error ? 'toast-error' : ''}`, role: error ? 'alert' : 'status' }, icon(error ? 'close' : 'check'), el('span', {}, message));
    node.append(iconButton('close', 'Dismiss notification', () => node.remove()));
    document.getElementById('toasts').append(node);
    window.setTimeout(() => node.remove(), error ? 12000 : 6000);
  }
  function errorMessage(form, message) {
    const target = form.querySelector('.form-error');
    target.textContent = message;
    target.hidden = false;
    target.focus();
  }
  function submit(form, callback, success) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (form.dataset.busy) return;
      if (!form.reportValidity()) return;
      const error = form.querySelector('.form-error');
      error.hidden = true;
      form.dataset.busy = 'true';
      form.setAttribute('aria-busy', 'true');
      const submitButton = form.querySelector('[type="submit"]');
      const label = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.textContent = 'Saving…';
      try { const result = await callback(Object.fromEntries(new FormData(form))); if (success) success(result); }
      catch (failure) { errorMessage(form, failure.message || 'Something went wrong. Please try again.'); }
      finally { delete form.dataset.busy; form.removeAttribute('aria-busy'); submitButton.disabled = false; submitButton.textContent = label; }
    });
  }
  function field(label, name, options = {}) {
    const { type = 'text', value = '', required = true, hint, ...attributes } = options;
    const id = `field-${name}`;
    const hintId = `${id}-hint`;
    const input = el(type === 'textarea' ? 'textarea' : 'input', { id, name, type: type === 'textarea' ? undefined : type, required, value, 'aria-describedby': hint ? hintId : undefined, ...attributes });
    return el('div', { class: 'field' }, el('label', { for: id }, label), input, hint && el('small', { class: 'field-hint', id: hintId }, hint));
  }
  function select(label, name, options, value = '') {
    const input = el('select', { id: `field-${name}`, name }, options.map(([val, text]) => el('option', { value: val, selected: val === value }, text)));
    return el('div', { class: 'field' }, el('label', { for: `field-${name}` }, label), input);
  }
  function formError() { return el('p', { class: 'form-error', role: 'alert', tabindex: '-1', hidden: true }); }
  function submitButton(label) { return el('button', { class: 'button button-primary', type: 'submit' }, label); }
  function dialog(title, description, content) {
    const previous = document.activeElement;
    const node = el('dialog', { class: 'dialog', 'aria-labelledby': 'dialog-title', 'aria-describedby': 'dialog-description' });
    const close = () => node.close();
    node.append(el('div', { class: 'dialog-header' }, el('div', {}, el('h2', { id: 'dialog-title' }, title), el('p', { id: 'dialog-description', class: 'muted' }, description)), iconButton('close', 'Close dialog', close)), content);
    node.addEventListener('close', () => { node.remove(); if (previous?.isConnected) previous.focus(); });
    node.addEventListener('click', (event) => { if (event.target === node && !node.querySelector('[aria-busy="true"]')) close(); });
    document.body.append(node);
    node.showModal();
    return { node, close };
  }
  function person(user) {
    const initials = user.name.trim().split(/\s+/).map((part) => Array.from(part)[0]).slice(0, 2).join('').toUpperCase();
    return el('div', { class: 'person' }, el('span', { class: 'avatar', 'aria-hidden': 'true' }, initials), el('div', { class: 'person-details' }, el('strong', {}, user.name), el('span', {}, user.email)));
  }
  function initShell(user) {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const workspace = document.querySelector('.workspace');
    const media = window.matchMedia('(max-width: 800px)');
    let opened = false;
    let toggle;
    function setOpen(value, focus = true) {
      opened = value && media.matches;
      document.body.classList.toggle('nav-open', opened);
      sidebar.inert = media.matches && !opened;
      workspace.inert = opened;
      backdrop.hidden = !opened;
      toggle?.setAttribute('aria-expanded', String(opened));
      if (focus) { if (opened) close.focus(); else if (media.matches) toggle.focus(); }
    }
    const close = iconButton('close', 'Close navigation', () => setOpen(false), 'sidebar-close');
    sidebar.append(el('div', { class: 'sidebar-brand' }, brand(), close), el('p', { class: 'nav-label' }, user.role === 'admin' ? 'WORKSPACE' : 'SELF SERVICE'));
    const items = user.role === 'admin'
      ? [['admin.html', 'Overview', 'grid'], ['employees.html', 'Employees', 'users'], ['leaves.html', 'Leave requests', 'calendar'], ['payslip.html', 'Payroll', 'file'], ['settings.html', 'Settings', 'settings']]
      : [['employee.html', 'My dashboard', 'grid'], ['payslip.html', 'My payslip', 'file']];
    const nav = el('nav', { 'aria-label': 'Main navigation' }, el('ul', { class: 'nav-list' }, items.map(([href, name, iconName]) => el('li', {}, el('a', { class: 'nav-link', href, 'aria-current': href === page ? 'page' : undefined }, icon(iconName), name)))));
    const accountAccess = el('div', { class: 'account-access' }, el('p', { class: 'nav-label' }, 'SWITCH ACCOUNT'));
    for (const [role, label] of [['employee', 'Employee login'], ['admin', 'Admin login']]) {
      accountAccess.append(button(label, () => { try { A.switchAccount(role); } catch (error) { toast(error.message, true); } }, 'secondary', role === 'employee' ? 'users' : 'building'));
    }
    const companyAccess = el('div', { class: 'company-access' }, el('p', { class: 'nav-label' }, 'COMPANIES'), el('a', { class: 'nav-link', href: 'index.html?view=companies' }, icon('building'), 'Manage companies'), el('a', { class: 'nav-link', href: 'index.html?view=setup' }, icon('plus'), 'Create company'));
    sidebar.append(nav, companyAccess, el('div', { class: 'sidebar-bottom' }, accountAccess, el('div', { class: 'account' }, person(user), iconButton('logout', 'Sign out', () => { try { A.signOut(); } catch (error) { toast(error.message, true); } })), el('span', { class: 'prototype-label' }, 'HCM Lite · Browser prototype')));
    toggle = iconButton('menu', 'Open navigation', () => setOpen(true), 'menu-toggle');
    toggle.setAttribute('aria-controls', 'sidebar');
    const company = S.getCompany();
    document.getElementById('topbar').append(el('div', { class: 'topbar-context' }, toggle, icon('building'), el('span', { class: 'company-name' }, company.name), el('span', { class: 'breadcrumb-separator' }, '/'), el('span', { class: 'breadcrumb-current' }, document.title.split(' · ')[0])), el('div', { class: 'topbar-right' }, el('span', { class: 'topbar-date' }, U.formatDate(new Date(), { weekday: 'short' })), el('span', { class: 'badge' }, user.role === 'admin' ? 'Admin' : 'Employee')));
    backdrop.addEventListener('click', () => setOpen(false));
    media.addEventListener('change', () => setOpen(false, false));
    document.addEventListener('keydown', (event) => {
      if (!opened) return;
      if (event.key === 'Escape') { setOpen(false); return; }
      if (event.key !== 'Tab') return;
      const focusable = sidebar.querySelectorAll('a,button');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    setOpen(false, false);
  }
  function initAuth() {
    const current = A.getCurrentUser();
    const requestedView = new URLSearchParams(window.location.search).get('view');
    const requestedCompanyId = new URLSearchParams(window.location.search).get('company');
    document.querySelector('[data-brand]').append(brand());
    const main = document.getElementById('auth-content');
    const configured = Boolean(S.getCompany());
    const view = ['admin', 'employee', 'setup', 'companies'].includes(requestedView) ? requestedView : current ? 'companies' : configured ? 'admin' : 'setup';
    const isSetup = view === 'setup';
    const accessNav = el('nav', { class: 'auth-access-nav', 'aria-label': 'Account access' });
    const choices = [['setup', 'Create company'], ['companies', 'Manage companies'], ['admin', 'Admin login'], ['employee', 'Employee login']];
    for (const [mode, label] of choices) accessNav.append(el('a', { href: `index.html?view=${mode}${['admin', 'employee'].includes(mode) && requestedCompanyId ? `&company=${encodeURIComponent(requestedCompanyId)}` : ''}`, 'aria-current': mode === view ? 'page' : undefined }, label));
    main.append(accessNav);
    if (view === 'companies') { renderCompanies(main, current); return; }
    main.append(el('p', { class: 'eyebrow' }, isSetup ? 'YOUR NEXT CHAPTER' : view === 'employee' ? 'EMPLOYEE ACCESS' : 'ADMIN ACCESS'), el('h1', {}, isSetup ? 'Make room for your people.' : view === 'employee' ? 'Welcome to your workspace.' : 'Welcome back, Admin.'), el('p', { class: 'auth-description' }, isSetup ? 'Create a separate company workspace and its first admin account. Existing companies and their records are preserved.' : view === 'employee' ? 'Choose your company and use the employee credentials provided by your admin.' : 'Choose your company and sign in with its admin account.'));
    const form = el('form', { class: 'auth-form' });
    if (isSetup) form.append(field('Company name', 'companyName', { autocomplete: 'organization', maxlength: 160 }), field('Your full name', 'name', { autocomplete: 'name', maxlength: 160 }));
    else {
      form.append(el('input', { type: 'hidden', name: 'role', value: view }));
      const companies = S.listCompanies();
      const selected = companies.some((entry) => entry.id === requestedCompanyId) ? requestedCompanyId : S.getActiveCompanyId();
      const companyField = select('Company', 'companyId', companies.length ? companies.map((entry) => [entry.id, entry.name]) : [['', 'No companies available']], selected);
      companyField.addEventListener('change', () => {
        const companyId = companyField.querySelector('select').value;
        for (const anchor of accessNav.querySelectorAll('a')) {
          const target = new URL(anchor.href);
          if (['admin', 'employee'].includes(target.searchParams.get('view'))) { target.searchParams.set('company', companyId); anchor.href = target.href; }
        }
      });
      form.append(companyField);
    }
    form.append(field('Email address', 'email', { type: 'email', autocomplete: 'username', maxlength: 254 }), field('Password', 'password', { type: 'password', autocomplete: isSetup ? 'new-password' : 'current-password', minlength: isSetup ? 6 : 1, maxlength: 128, hint: isSetup ? 'At least 6 characters. Use fictional credentials for this prototype.' : undefined }));
    if (isSetup) form.append(field('Confirm password', 'confirmPassword', { type: 'password', autocomplete: 'new-password', minlength: 6, maxlength: 128 }), el('div', { class: 'notice' }, el('strong', {}, 'A sensible starting point'), el('p', {}, 'Office starts at 09:00 · 15-minute grace period · 20 paid leave days per year. You can edit these in Settings.')));
    form.append(formError(), submitButton(isSetup ? 'Create company' : view === 'employee' ? 'Sign in as employee' : 'Sign in as admin'));
    submit(form, isSetup ? A.createCompany : A.login, (user) => window.location.replace(A.getHomePage(user.role)));
    if (!isSetup && !S.listCompanies().length) {
      form.prepend(el('p', { class: 'notice auth-login-notice' }, 'No company has been set up in this browser yet. Your admin must create the workspace and your employee account first.', el('a', { href: 'index.html?view=setup' }, 'Create a company')));
      form.querySelector('[type="submit"]').disabled = true;
    }
    if (current) main.append(el('p', { class: 'notice auth-login-notice' }, `You are signed in as ${current.name} at ${S.getCompany().name}. ${isSetup ? 'Creating a company will open its new admin account.' : 'Signing in below switches this browser to the selected company and account.'}`, link('Continue to my dashboard', A.getHomePage(current.role))));
    main.append(form, el('div', { class: 'prototype-notice' }, 'Hackathon prototype. localStorage and client-side role checks do not protect real credentials or HR data. Use fictional information only.'));
    if (!S.isAvailable() || S.getIssues().some((key) => key !== S.keys.session)) {
      errorMessage(form, 'Browser data is unavailable or malformed. Allow storage or repair the existing hcm_* data before continuing. Nothing has been reset.');
      form.querySelector('[type="submit"]').disabled = true;
    }
  }

  function renderCompanies(main, current) {
    main.append(el('p', { class: 'eyebrow' }, 'YOUR WORKSPACES'), el('h1', {}, 'Your companies.'), el('p', { class: 'auth-description' }, 'Choose a company to sign in. Each company has its own accounts, policies, calendar, and HR records.'));
    const directory = el('div', { class: 'company-list' });
    const activeId = S.getActiveCompanyId();
    const companies = S.listCompanies();
    if (!companies.length) directory.append(empty('No companies yet', 'Create your first company to start managing your team.', 'building', link('Create company', 'index.html?view=setup', true)));
    for (const company of companies) {
      const isCurrent = Boolean(current && company.id === activeId);
      const loginUrl = (role) => `index.html?view=${role}&company=${encodeURIComponent(company.id)}`;
      const actions = el('div', { class: 'company-actions' });
      if (isCurrent) actions.append(link('Open dashboard', A.getHomePage(current.role), true));
      else actions.append(link('Admin login', loginUrl('admin')), link('Employee login', loginUrl('employee')));
      if (isCurrent && current.role === 'admin') actions.append(button('Rename', () => renameCompanyDialog(company), 'secondary'), link('Settings', 'settings.html'), button('Delete company', () => deleteCompanyDialog(company), 'danger-quiet'));
      directory.append(el('section', { class: 'company-tile', 'aria-label': company.name }, el('div', { class: 'company-tile-heading' }, el('span', { class: 'empty-icon' }, icon('building')), el('h2', {}, company.name), isCurrent && el('span', { class: 'badge badge-active' }, 'Current company')), el('p', { class: 'muted small' }, isCurrent ? `Signed in as ${current.role === 'admin' ? 'Admin' : 'Employee'}.` : 'Sign in to access this company’s workspace.'), actions));
    }
    main.append(directory, el('div', { class: 'company-directory-footer' }, link('Create another company', 'index.html?view=setup', true)), el('p', { class: 'prototype-notice' }, 'Companies are saved in this browser only. Sign in as a company’s admin to rename, configure, or delete it. Employee records are never listed here.'));
    if (S.getIssues().length || !S.isAvailable()) main.prepend(el('p', { class: 'form-error', role: 'alert' }, 'Some browser data is unavailable or malformed. Changes are blocked to preserve existing records.'));
    function renameCompanyDialog(company) {
      const form = el('form', {}, field('Company name', 'name', { value: company.name, maxlength: 160 }), formError());
      const modal = dialog('Rename company', 'Your company’s employees, policies, calendar, and records will be preserved.', form);
      form.append(el('div', { class: 'form-actions' }, button('Cancel', modal.close, 'secondary'), submitButton('Save company name')));
      submit(form, (input) => A.renameCompany(input.name, company.id), () => { modal.close(); window.location.reload(); });
    }
    function deleteCompanyDialog(company) {
      const form = el('form', {}, el('p', { class: 'notice notice-danger' }, `Permanently delete ${company.name}, its accounts, attendance, leave, settings, and calendar? Other companies will be preserved. This cannot be undone.`), field('Type the company name to confirm', 'confirmation', { autocomplete: 'off', maxlength: 160 }), formError());
      const modal = dialog('Delete company?', 'Only the signed-in admin can delete the current company.', form);
      const remove = submitButton('Delete company');
      remove.classList.replace('button-primary', 'button-danger');
      form.append(el('div', { class: 'form-actions' }, button('Keep company', modal.close, 'secondary'), remove));
      submit(form, (input) => A.deleteCompany(input.confirmation, company.id), () => { modal.close(); window.location.replace('index.html?view=companies'); });
    }
  }
  function attendanceRows(rows) {
    return rows.map(({ employee, record, status }) => [person(employee), employee.department, U.formatTime(record?.checkIn), U.formatTime(record?.checkOut), badge(status === 'not-employed' ? 'not-started' : status)]);
  }
  function leaveRows(leaves, admin = false, actions = false) {
    const users = admin ? S.getUsers() : [];
    return leaves.map((leave) => [
      ...(admin ? [person(users.find((user) => user.id === leave.employeeId) || { name: 'Deleted employee', email: '' })] : []),
      el('span', { class: 'capitalize' }, `${leave.type} · Paid`), `${U.formatDate(leave.from)} – ${U.formatDate(leave.to)}`,
      `${U.countWorkingDays(leave.from, leave.to, S.getCompany().calendarExceptions || [])} day(s)`,
      el('div', { class: 'reason-cell' }, el('span', {}, leave.reason), leave.comment && el('small', { class: 'muted' }, `Comment: ${leave.comment}`)), badge(leave.status),
      ...(actions ? [leave.status === 'pending' ? button('Review', () => reviewLeave(leave), 'secondary') : el('span', { class: 'muted' }, 'Decided')] : []),
    ]);
  }
  function renderAdmin() {
    const main = document.getElementById('page-content');
    const user = A.getCurrentUser();
    const stats = window.HCMAdmin.summary();
    const today = U.localDate();
    const working = U.isWorkingDay(today, S.getCompany().calendarExceptions || []);
    main.replaceChildren(heading(`Welcome back, ${user.name.split(' ')[0]}.`, 'A little clarity for the day ahead.', link('Add employee', 'employees.html', true)));
    main.append(el('div', { class: 'metrics-grid' }, metric('Total employees', stats.employees, 'People in your workspace', 'users'), metric('Present today', stats.present, working ? 'Including late and half-day check-ins' : 'Today is a non-working day', 'check'), metric('Late today', stats.late, 'After the saved grace period', 'clock'), metric('Absent today', stats.absent, 'Absence is final after the day ends', 'calendar'), metric('Pending requests', stats.pending, 'Ready for your review', 'file')));
    const attendanceContent = el('div');
    const dateField = field('Attendance date', 'attendance-date', { type: 'date', value: today, max: today });
    const dateToolbar = el('div', { class: 'toolbar' }, dateField, el('p', { class: 'muted small' }, 'Attendance follows your company calendar, including holidays and extra working days. Today’s missing check-ins remain open until the day ends.'));
    const grid = el('div');
    function renderDate() {
      try {
        const date = dateField.querySelector('input').value;
        U.parseDate(date);
        const selected = window.HCMAdmin.summary(date);
        grid.replaceChildren(table(['Employee', 'Department', 'Check-in', 'Check-out', 'Status'], attendanceRows(selected.rows), empty('Your team starts here', 'Add your first employee to bring this workspace to life.', 'users', link('Add employee', 'employees.html', true))));
      } catch (error) { toast(error.message, true); }
    }
    dateField.addEventListener('change', renderDate);
    attendanceContent.append(dateToolbar, grid);
    renderDate();
    main.append(card('Attendance overview', 'A daily view of your team’s working day.', attendanceContent));
    const pending = window.HCMLeaves.list().slice(0, 5);
    main.append(card('Recent leave requests', 'Time away, thoughtfully coordinated.', table(['Employee', 'Type', 'Dates', 'Days', 'Reason / comment', 'Status'], leaveRows(pending, true), empty('No leave requests yet', 'Requests from your team will appear here.', 'calendar')), link('View requests', 'leaves.html')));
    if (stats.employees) {
      const tracked = stats.rows.filter((row) => row.record || row.status === 'leave').length;
      main.append(el('section', { class: 'activity-strip', 'aria-label': 'Today’s activity coverage' }, el('div', {}, el('strong', {}, 'Today, at a glance'), el('p', { class: 'muted' }, `${tracked} of ${stats.employees} employees have a check-in or approved leave.`)), el('progress', { max: stats.employees, value: tracked, 'aria-label': 'Employees with check-in or approved leave' })));
    }
  }
  function employeeDialog(existing = null) {
    const form = el('form', {}, el('div', { class: 'form-grid' }, field('Full name', 'name', { value: existing?.name || '', maxlength: 160 }), field('Email address', 'email', { type: 'email', value: existing?.email || '', maxlength: 254 }), field(existing ? 'New password (optional)' : 'Temporary password', 'password', { type: 'password', required: !existing, minlength: 6, maxlength: 128, autocomplete: 'new-password', hint: existing ? 'Leave blank to keep the current password.' : 'At least 6 characters. Share fictional credentials for this demo.' }), field('Department', 'department', { value: existing?.department || '', maxlength: 80 }), field('Monthly salary (PKR)', 'salary', { type: 'number', min: '0.01', max: '1000000000000', step: '0.01', value: existing?.salary || '' })), formError());
    const modal = dialog(existing ? 'Edit employee' : 'Add a new employee', 'Their account gives them access to their own attendance, leave, and payslips.', form);
    form.append(el('div', { class: 'form-actions' }, button('Cancel', modal.close, 'secondary'), submitButton(existing ? 'Save changes' : 'Create employee')));
    submit(form, (input) => window.HCMEmployees.save(input, existing?.id), () => { modal.close(); toast(existing ? 'Employee updated.' : 'Employee account is ready. They can now sign in.'); renderCurrent(); });
  }
  function deleteEmployee(user) {
    const form = el('form', {}, el('p', { class: 'notice notice-danger' }, `Delete ${user.name} and all of their attendance and leave records? This action cannot be undone.`), formError());
    const modal = dialog('Delete employee?', 'Associated records are removed together to avoid broken references.', form);
    const remove = el('button', { type: 'submit', class: 'button button-danger' }, 'Delete employee');
    form.append(el('div', { class: 'form-actions' }, button('Keep employee', modal.close, 'secondary'), remove));
    submit(form, () => window.HCMEmployees.remove(user.id), () => { modal.close(); toast('Employee and associated records deleted.'); renderCurrent(); });
  }
  function renderEmployees() {
    const main = document.getElementById('page-content');
    const employees = window.HCMEmployees.list();
    main.replaceChildren(heading('Your people.', 'A well-organized team starts with the essentials.', button('Add employee', () => employeeDialog(), 'primary', 'plus')));
    const searchField = field('Search employees', 'search', { type: 'search', required: false, placeholder: 'Search by name or email…', maxlength: 160 });
    const departmentField = select('Department', 'department-filter', [['', 'All departments'], ...[...new Set(employees.map((user) => user.department))].sort().map((name) => [name, name])]);
    const results = el('div');
    const count = el('span', { class: 'muted small', role: 'status' });
    const toolbar = el('div', { class: 'toolbar directory-toolbar' }, searchField, departmentField, count);
    function update() {
      const users = window.HCMEmployees.list(searchField.querySelector('input').value, departmentField.querySelector('select').value);
      count.textContent = `${users.length} employee${users.length === 1 ? '' : 's'}`;
      results.replaceChildren(table(['Employee', 'Department', 'Monthly salary', 'Status', 'Actions'], users.map((user) => [person(user), user.department, U.formatCurrency(user.salary), badge('active'), el('div', { class: 'row-actions' }, button('Edit', () => employeeDialog(user), 'secondary'), button('Delete', () => deleteEmployee(user), 'danger-quiet'))]), empty(employees.length ? 'No matching employees' : 'Your first teammate belongs here', employees.length ? 'Try another name, email, or department.' : 'Create an employee account to get started.', 'users', !employees.length && button('Add employee', () => employeeDialog(), 'primary', 'plus'))));
    }
    searchField.addEventListener('input', update);
    departmentField.addEventListener('change', update);
    main.append(el('section', { class: 'card' }, toolbar, results));
    update();
  }
  function renderSettings() {
    const main = document.getElementById('page-content');
    const company = S.getCompany();
    main.replaceChildren(heading('Company settings.', 'Set the shared rhythm for your working day.', link('Manage companies', 'index.html?view=companies')));
    const form = el('form', { class: 'settings-form' }, el('div', { class: 'settings-section' }, el('div', {}, el('h2', {}, 'Workspace details'), el('p', { class: 'muted' }, 'The company name shown across your workspace.')), field('Company name', 'name', { value: company.name, maxlength: 160 })),
      el('div', { class: 'settings-section' }, el('div', {}, el('h2', {}, 'Attendance & leave'), el('p', { class: 'muted' }, 'New check-ins use these policies. Recorded attendance keeps its original classification.')), el('div', {}, field('Office start time', 'startTime', { type: 'time', value: company.startTime }), field('Grace period (minutes)', 'graceMinutes', { type: 'number', min: 0, max: 240, step: 1, value: company.graceMinutes, hint: 'A check-in after start time plus grace is late.' }), field('Annual paid leave quota', 'leaveQuota', { type: 'number', min: 0, max: 366, step: 1, value: company.leaveQuota, hint: 'Calendar-year allowance. Existing approvals are preserved; new requests use the saved quota.' }))), formError(), el('div', { class: 'form-actions' }, submitButton('Save settings')));
    submit(form, window.HCMSettings.save, () => { toast('Company settings saved.'); document.querySelector('.company-name').textContent = S.getCompany().name; });
    main.append(form);
    const calendarContent = el('div');
    function refreshCalendar() {
      const calendar = S.getCompany().calendarExceptions || [];
      const rows = calendar.map((entry) => [U.formatDate(entry.date, { weekday: 'short' }), entry.name,
        el('span', { class: `badge badge-${entry.type}` }, entry.type === 'holiday' ? 'Holiday' : 'Extra working day'),
        el('div', { class: 'row-actions' }, button('Edit', () => editCalendarDay(entry), 'secondary'), button('Remove', () => removeCalendarDay(entry), 'danger-quiet'))]);
      calendarContent.replaceChildren(table(['Date', 'Title', 'Day type', 'Actions'], rows, empty('No calendar exceptions', 'Your default workweek is Monday to Friday. Add a holiday or make a weekend an extra working day.', 'calendar')));
    }
    function editCalendarDay(entry = null) {
      const calendarForm = el('form', {}, field('Title', 'title', { value: entry?.name || '', maxlength: 100, placeholder: 'e.g. Company holiday or weekend shift' }),
        el('div', { class: 'form-grid' }, field('Date', 'calendarDate', { type: 'date', value: entry?.date || '' }), select('Day type', 'dayType', [['holiday', 'Holiday — non-working'], ['working', 'Extra working day']], entry?.type || 'holiday')), formError());
      const modal = dialog(entry ? 'Edit calendar date' : 'Add calendar date', 'Holidays are days off. Extra working days override the usual weekend schedule. Attendance, leave counts, and payroll use this calendar.', calendarForm);
      calendarForm.append(el('div', { class: 'form-actions' }, button('Cancel', modal.close, 'secondary'), submitButton(entry ? 'Save calendar date' : 'Add calendar date')));
      submit(calendarForm, (input) => window.HCMSettings.saveCalendarDay(input, entry?.date || null), () => { modal.close(); toast('Company calendar saved. Leave and payroll totals now use the updated dates.'); refreshCalendar(); });
    }
    function removeCalendarDay(entry) {
      const removalForm = el('form', {}, el('p', { class: 'notice' }, `Remove “${entry.name}” on ${U.formatDate(entry.date)}? This date will return to the default Monday–Friday schedule. Leave and payroll totals will recalculate.`), formError());
      const modal = dialog('Remove calendar exception?', 'Recorded attendance and leave requests are preserved.', removalForm);
      removalForm.append(el('div', { class: 'form-actions' }, button('Keep date', modal.close, 'secondary'), submitButton('Remove exception')));
      submit(removalForm, () => window.HCMSettings.removeCalendarDay(entry.date), () => { modal.close(); toast('Calendar exception removed. The default schedule applies to this date.'); refreshCalendar(); });
    }
    const calendarSection = card('Company calendar', 'Holidays and extra working days for the whole team.', el('div', {}, el('div', { class: 'card-body calendar-note' }, el('p', { class: 'notice' }, 'Saturday and Sunday are off unless you add an extra working day. Holidays do not count toward attendance requirements, leave days, or payroll working days. Changes recalculate leave balances and payroll, including past periods. Recorded attendance is kept.')), calendarContent), button('Add calendar date', () => editCalendarDay(), 'primary', 'plus'));
    calendarSection.classList.add('calendar-settings');
    main.append(calendarSection);
    refreshCalendar();
  }
  function reviewLeave(leave) {
    const user = S.findById('users', leave.employeeId);
    const form = el('form', {}, el('div', { class: 'request-summary' }, el('strong', {}, user?.name || 'Employee'), el('p', {}, `${U.formatDate(leave.from)} – ${U.formatDate(leave.to)} · ${leave.days} working day(s)`), el('p', { class: 'muted' }, leave.reason)), select('Decision', 'decision', [['approved', 'Approve paid leave'], ['rejected', 'Reject request']], 'approved'), field('Comment (optional)', 'comment', { type: 'textarea', required: false, maxlength: 1000, rows: 3 }), formError());
    const modal = dialog('Review leave request', 'The employee can see your decision and comment.', form);
    form.append(el('div', { class: 'form-actions' }, button('Cancel', modal.close, 'secondary'), submitButton('Save decision')));
    submit(form, (input) => window.HCMLeaves.decide(leave.id, input.decision, input.comment), () => { modal.close(); toast('Leave decision saved.'); renderCurrent(); });
  }
  function renderLeaves() {
    const main = document.getElementById('page-content');
    const leaves = window.HCMLeaves.list();
    main.replaceChildren(heading('Time away, in order.', 'Review requests and help your team plan ahead.'));
    main.append(el('div', { class: 'metrics-grid metrics-three' }, metric('Pending review', leaves.filter((leave) => leave.status === 'pending').length, 'Requests awaiting a decision', 'clock'), metric('Approved', leaves.filter((leave) => leave.status === 'approved').length, 'Paid leave requests', 'check'), metric('Rejected', leaves.filter((leave) => leave.status === 'rejected').length, 'Requests not approved', 'calendar')));
    const filter = select('Request status', 'status-filter', [['', 'All requests'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']]);
    const results = el('div');
    function update() {
      const selected = filter.querySelector('select').value;
      const filtered = leaves.filter((leave) => !selected || leave.status === selected);
      results.replaceChildren(table(['Employee', 'Type', 'Dates', 'Days', 'Reason / comment', 'Status', 'Action'], leaveRows(filtered, true, true), empty('No requests to show', selected ? 'There are no requests with this status.' : 'Employee requests will appear here when submitted.', 'calendar')));
    }
    filter.addEventListener('change', update);
    main.append(el('section', { class: 'card' }, el('div', { class: 'toolbar' }, filter), results));
    update();
  }
  function leaveForm(user) {
    const form = el('form', { class: 'card-body leave-form' }, select('Leave type', 'type', [['annual', 'Annual leave (paid)'], ['personal', 'Personal leave (paid)']], 'annual'), el('div', { class: 'form-grid' }, field('From date', 'from', { type: 'date', min: U.localDate() }), field('To date', 'to', { type: 'date', min: U.localDate() })), field('Reason', 'reason', { type: 'textarea', maxlength: 1000, rows: 3, placeholder: 'A brief note for your admin…' }), el('p', { class: 'field-hint', 'data-leave-preview': true }, 'Only company working days count. Holidays are excluded and extra working days are included. Both types use your annual paid leave allowance.'), formError(), submitButton('Submit leave request'));
    const from = form.elements.from;
    const to = form.elements.to;
    function preview() {
      const target = form.querySelector('[data-leave-preview]');
      try {
        if (!from.value || !to.value) return;
        const days = U.countWorkingDays(from.value, to.value, S.getCompany().calendarExceptions || []);
        target.textContent = `${days} working day(s). Pending requests reserve allowance for new applications. Approved leave reduces your displayed balance.`;
      } catch (error) { target.textContent = error.message; }
    }
    from.addEventListener('change', preview);
    to.addEventListener('change', preview);
    submit(form, window.HCMLeaves.apply, () => { toast('Leave request sent to your admin.'); renderCurrent(); });
    return form;
  }
  function renderEmployee() {
    const main = document.getElementById('page-content');
    const user = A.getCurrentUser();
    const today = U.localDate();
    const records = window.HCMAttendance.records(user.id);
    const leaves = window.HCMLeaves.list();
    const balance = window.HCMLeaves.balance(user.id);
    const calendar = S.getCompany().calendarExceptions || [];
    const dayInfo = U.calendarDay(today, calendar);
    const state = window.HCMAttendance.dayState(user, today, records, leaves, today, calendar);
    main.replaceChildren(heading(`Hello, ${user.name.split(' ')[0]}.`, `${user.department} · ${U.formatDate(today, { weekday: 'long' })}`, link('View my payslip', 'payslip.html')));
    main.append(el('div', { class: 'metrics-grid metrics-three' }, metric('Monthly salary', U.formatCurrency(user.salary), 'Your base salary · PKR', 'file'), metric('Paid leave remaining', `${balance.remaining} days`, `${balance.used} used of ${balance.quota} this year`, 'calendar'), metric('Today’s status', U.statusLabels[state.status] || state.status, state.record?.checkIn ? `Checked in at ${U.formatTime(state.record.checkIn)}` : 'Your attendance for today', 'clock')));
    const record = state.record;
    const action = async (kind, target) => {
      target.disabled = true;
      try { await window.HCMAttendance[kind](); toast(kind === 'checkIn' ? 'You’re checked in. Have a good day.' : 'Checked out. Your working hours have been saved.'); renderCurrent(); }
      catch (error) { toast(error.message, true); target.disabled = false; }
    };
    const checkIn = button('Check in', (event) => action('checkIn', event.currentTarget), 'primary', 'clock');
    const checkOut = button('Check out', (event) => action('checkOut', event.currentTarget), 'secondary', 'arrow');
    checkIn.disabled = Boolean(record) || ['non-working', 'holiday', 'leave'].includes(state.status);
    checkOut.disabled = !record || Boolean(record.checkOut);
    const hours = record ? U.calculateWorkedHours(record.checkIn, record.checkOut) : null;
    main.append(el('section', { class: 'attendance-action' }, el('div', {}, el('p', { class: 'eyebrow' }, 'YOUR WORKING DAY'), el('h2', {}, state.status === 'holiday' ? 'Enjoy your company holiday.' : state.status === 'non-working' ? 'A little room to recharge.' : state.status === 'leave' ? 'Enjoy your approved time away.' : record?.checkOut ? 'Your day is recorded.' : record ? 'You’re on the clock.' : 'Ready when you are.'), el('p', { class: 'muted' }, state.status === 'holiday' ? dayInfo.name : state.status === 'non-working' ? 'Today is a non-working day in your company calendar.' : record ? `Check-in ${U.formatTime(record.checkIn)} · Check-out ${U.formatTime(record.checkOut)}${hours !== null ? ` · ${hours.toFixed(2)} hours` : ''}` : `${dayInfo.type === 'working' ? `Extra working day: ${dayInfo.name} · ` : ''}Office starts ${S.getCompany().startTime} · ${S.getCompany().graceMinutes}-minute grace period.`)), el('div', { class: 'row-actions' }, checkIn, checkOut)));
    const historyMonth = field('Attendance month', 'history-month', { type: 'month', value: today.slice(0, 7), max: today.slice(0, 7) });
    const history = el('div');
    function updateHistory() {
      try {
        const { year, month } = U.parseMonth(historyMonth.querySelector('input').value);
        const [from, to] = U.monthRange(year, month);
        const historyDates = [...new Set([...U.workingDates(from, to, calendar), ...records.filter((record) => record.date >= from && record.date <= to).map((record) => record.date)])].sort().reverse();
        const rows = historyDates.filter((date) => date <= today && (!user.createdOn || date >= user.createdOn)).map((date) => {
          const day = window.HCMAttendance.dayState(user, date, records, leaves, today, calendar);
          const worked = day.record ? U.calculateWorkedHours(day.record.checkIn, day.record.checkOut) : null;
          return [U.formatDate(date), U.formatTime(day.record?.checkIn), U.formatTime(day.record?.checkOut), worked === null ? '—' : `${worked.toFixed(2)} h`, badge(day.status)];
        });
        history.replaceChildren(table(['Date', 'Check-in', 'Check-out', 'Hours', 'Status'], rows, empty('No attendance records', 'Your working-day history will appear here.', 'clock')));
      } catch (error) { toast(error.message, true); }
    }
    historyMonth.addEventListener('change', updateHistory);
    updateHistory();
    main.append(card('Attendance history', 'Your own records, one working day at a time.', el('div', {}, el('div', { class: 'toolbar' }, historyMonth), history)));
    main.append(el('div', { class: 'content-grid' }, card('Plan some time away', 'Working days follow your company calendar. Your admin will review the request.', leaveForm(user)), card('Your leave requests', 'Decisions and comments from your admin.', table(['Type', 'Dates', 'Days', 'Reason / comment', 'Status'], leaveRows(leaves), empty('No leave requests yet', 'Apply for paid leave using the form.', 'calendar')))));
  }
  function renderPayslip() {
    const main = document.getElementById('page-content');
    const actor = A.getCurrentUser();
    main.replaceChildren(heading(actor.role === 'admin' ? 'Payroll, made clear.' : 'Your payslip.', 'Every working day, every adjustment, in one transparent view.'));
    const employees = actor.role === 'admin' ? window.HCMEmployees.list() : [actor];
    if (!employees.length) { main.append(card('Monthly payslip', 'There are no employee accounts yet.', empty('No payslip data', 'Add an employee with a monthly salary to generate a payslip.', 'file', link('Add employee', 'employees.html', true)))); return; }
    const month = field('Pay period', 'pay-month', { type: 'month', value: U.localDate().slice(0, 7), max: U.localDate().slice(0, 7) });
    const employeeField = actor.role === 'admin' ? select('Employee', 'pay-employee', employees.map((user) => [user.id, user.name]), employees[0].id) : null;
    const print = button('Print payslip', () => window.print(), 'secondary', 'print');
    const toolbar = el('div', { class: 'toolbar payroll-toolbar no-print' }, employeeField, month, print);
    const content = el('div', { class: 'payslip-container' });
    function update() {
      try {
        const { year, month: number } = U.parseMonth(month.querySelector('input').value);
        const employeeId = actor.role === 'admin' ? employeeField.querySelector('select').value : actor.id;
        const employee = employees.find((user) => user.id === employeeId);
        const slip = window.HCMPayroll.calculatePayslip(employeeId, year, number);
        if (!slip.eligible) { print.disabled = true; content.replaceChildren(empty('No payslip data for this period', 'Choose a current or past month on or after the employee joined.', 'file')); return; }
        print.disabled = false;
        const company = S.getCompany();
        const period = U.formatDate(U.monthRange(year, number)[0], { day: undefined, month: 'long' });
        const breakdown = [
          ['Working days in month', slip.workingDays], ['Days attended', slip.presentDays], ['Late check-ins (included in attended days)', slip.lateDays], ['Half days (included in attended days)', slip.halfDays], ['Absent days', slip.absentDays], ['Approved paid leave days', slip.approvedLeaveDays],
        ];
        const sheet = el('article', { class: 'payslip', 'aria-label': 'Salary payslip' }, el('div', { class: 'payslip-heading' }, el('div', {}, el('div', { class: 'payslip-brand' }, 'huma.'), el('p', {}, company.name)), el('div', { class: 'align-right' }, el('p', { class: 'eyebrow' }, 'SALARY STATEMENT'), el('h2', {}, period), badge(slip.provisional ? 'Provisional' : 'Final calculation'))),
          el('div', { class: 'payslip-identity' }, el('div', {}, el('span', { class: 'muted small' }, 'EMPLOYEE'), el('h2', {}, employee.name), el('p', { class: 'muted' }, employee.department)), el('div', {}, el('span', { class: 'muted small' }, 'EMAIL'), el('p', {}, employee.email)), el('div', {}, el('span', { class: 'muted small' }, 'GENERATED'), el('p', {}, U.formatDate(new Date())))),
          el('div', { class: 'payslip-columns' }, el('section', {}, el('h3', {}, 'Attendance summary'), el('dl', { class: 'breakdown' }, breakdown.map(([label, value]) => el('div', {}, el('dt', {}, label), el('dd', {}, value))))), el('section', {}, el('h3', {}, 'Salary breakdown'), el('dl', { class: 'breakdown' }, [['Monthly base salary', U.formatCurrency(slip.salary)], ['Daily rate', U.formatCurrency(slip.dailyRate)], ['Deduction days', slip.absentDays + 0.5 * slip.halfDays], ['Total deductions', U.formatCurrency(slip.deduction)]].map(([label, value]) => el('div', {}, el('dt', {}, label), el('dd', {}, value)))), el('div', { class: 'net-salary' }, el('span', {}, 'Net salary'), el('strong', {}, U.formatCurrency(slip.netSalary))))),
          el('div', { class: 'payslip-notes' }, el('strong', {}, 'A transparent calculation'), el('p', {}, 'Daily rate = monthly salary ÷ working days. Deduction = daily rate × (absent days + 0.5 × half days). Late check-ins add no separate deduction. Approved paid leave is not absence.'), el('p', {}, slip.provisional ? 'Provisional: future dates and today’s missing check-in are not counted as absences. The base salary is the full monthly salary; this is not an earned-to-date payment.' : 'Calculated from the full completed month and stored records.'), el('p', {}, 'Working days follow the company calendar: holidays and regular weekends are excluded; extra working days are included. Absences before joining are excluded. Currency: PKR. Browser-only demonstration; not a production payroll document.')));
        content.replaceChildren(sheet);
      } catch (error) { print.disabled = true; content.replaceChildren(empty('Unable to generate payslip', error.message, 'file')); }
    }
    month.addEventListener('change', update);
    employeeField?.addEventListener('change', update);
    main.append(toolbar, content);
    update();
  }
  function initHelper() {
    const panel = el('section', { class: 'helper-panel', id: 'helper-panel', hidden: true, 'aria-label': 'Smart Helper' });
    const messages = el('div', { class: 'helper-messages', role: 'log', 'aria-live': 'polite', 'aria-relevant': 'additions text' });
    messages.append(el('p', { class: 'chat-message chat-assistant' }, 'A little help, right here. Ask about attendance, leave, salary, or your workspace. I use keyword matching and your current browser data.'));
    const input = el('input', { id: 'helper-question', name: 'question', placeholder: 'Ask an HR question…', required: true, maxlength: 300, autocomplete: 'off' });
    const send = el('button', { class: 'icon-button', type: 'submit', 'aria-label': 'Send question' }, icon('arrow'));
    const form = el('form', { class: 'helper-form' }, el('label', { class: 'sr-only', for: 'helper-question' }, 'Your HR question'), input, send);
    const launcher = button('Smart Helper', () => open(true), 'primary', 'chat');
    launcher.classList.add('helper-launcher');
    launcher.setAttribute('aria-controls', 'helper-panel');
    launcher.setAttribute('aria-expanded', 'false');
    function open(value) { panel.hidden = !value; launcher.hidden = value; launcher.setAttribute('aria-expanded', String(value)); if (value) input.focus(); else launcher.focus(); }
    panel.append(el('div', { class: 'helper-header' }, el('div', {}, el('strong', {}, 'Smart Helper'), el('span', {}, 'A simpler answer to everyday HR')), iconButton('close', 'Close Smart Helper', () => open(false))), messages, form);
    panel.addEventListener('keydown', (event) => { if (event.key === 'Escape') open(false); });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      messages.append(el('p', { class: 'chat-message chat-user' }, text));
      input.value = '';
      try { messages.append(el('p', { class: 'chat-message chat-assistant' }, window.HCMHelper.answer(text))); }
      catch (error) { messages.append(el('p', { class: 'chat-message chat-assistant' }, error.message)); }
      while (messages.children.length > 40) messages.firstElementChild.remove();
      messages.scrollTop = messages.scrollHeight;
    });
    document.body.append(launcher, panel);
  }
  try {
    if (page === 'index.html') initAuth();
    else if (document.documentElement.dataset.auth === 'ready' && A.guardPage(document.documentElement.dataset.roles.split(','))) {
      initShell(A.getCurrentUser());
      const renders = { 'admin.html': renderAdmin, 'employees.html': renderEmployees, 'settings.html': renderSettings, 'employee.html': renderEmployee, 'leaves.html': renderLeaves, 'payslip.html': renderPayslip };
      renderCurrent = renders[page];
      renderCurrent();
      initHelper();
      if (S.getIssues().length) toast('Some browser data is malformed. Readable records are shown, but changes are blocked to preserve existing data.', true);
    }
  } catch (error) {
    const main = document.querySelector('main');
    main.querySelector('.loading-state')?.remove();
    main.append(el('div', { class: 'notice notice-danger', role: 'alert' }, `Unable to load this workspace: ${error.message}`));
  }
  function recheck() {
    if (page === 'index.html') { window.location.reload(); return; }
    document.documentElement.dataset.auth = 'pending';
    if (A.guardPage(document.documentElement.dataset.roles.split(','))) window.location.reload();
  }
  window.addEventListener('storage', (event) => { if (event.key === null || Object.values(S.keys).includes(event.key)) recheck(); });
  window.addEventListener('pageshow', (event) => { if (event.persisted) recheck(); });
  let date = U.localDate();
  window.setInterval(() => { if (U.localDate() !== date) { date = U.localDate(); recheck(); } }, 30000);
}());

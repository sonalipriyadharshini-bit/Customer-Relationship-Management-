/* ---------- small view helpers ---------- */
function kpi(a) { return '<div class="kpis">' + a.map(function (k) { return '<div class="kpi"><span>' + k[0] + '</span><b>' + k[1] + '</b><em class="' + (k[3] || 'up') + '">' + k[2] + '</em></div>'; }).join('') + '</div>'; }
function tg(t, c) { return '<span class="tag ' + c + '">' + t + '</span>'; }
function tbl(h, rows) {
  return '<div class="card flush"><div class="tw"><table class="tbl"><thead><tr>' + h.map(function (x) { return '<th>' + x + '</th>'; }).join('') +
    '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></div>';
}
function can(y, n) {
  return '<div class="card"><h2>Your access</h2><ul class="acc">' + y.map(function (x) { return '<li class="y">' + x + '</li>'; }).join('') +
    n.map(function (x) { return '<li class="n">' + x + '</li>'; }).join('') + '</ul></div>';
}
var soon = function () { return '<div class="card soon">This section is built in the next step.</div>'; };
var btn = function (t) { return '<button class="btn sm alt">' + t + '</button> '; };



if (!S.get()) { location.href = 'login.html'; throw new Error('Please sign in'); }
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');
const lab = (x) => x.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const day = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const COLOR = { placed: 'bl', shipped: 'bl', out_for_delivery: 'md', delivered: 'lo', cancelled: 'gr', requested: 'bl', approved: 'md', refunded: 'lo', rejected: 'gr',
  open: 'bl', in_progress: 'md', resolved: 'lo', low: 'lo', medium: 'md', high: 'hi', prime: 'bl', standard: 'gr', at_risk: 'hi', new: 'lo' };
const st = (x) => tg(lab(x), COLOR[x] || 'gr');
const act = (a, id, t, cls = 'alt') => `<button class="btn sm ${cls}" data-act="${a}" data-id="${id}">${t}</button> `;
const bar = (q, ph, a, label) => `<div class="bar2">${q === null ? '' : `<input class="srch" id="q" placeholder="${ph}" value="${esc(q)}">`}${a ? act(a, 0, label, 'teal') : ''}</div>`;
const TBL = (h, rows, msg) => (rows.length ? tbl(h, rows) : `<div class="card soon">${msg || 'Nothing here yet.'}</div>`);
const qs = (q) => (q ? '?search=' + encodeURIComponent(q) : '');
const sel = (kind, id, cur, opts) => `<select class="stsel" data-st="${kind}" data-id="${id}">${opts.map(([v, t]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
const OPT = {
  segment: [['new', 'New'], ['standard', 'Standard'], ['prime', 'Prime'], ['at_risk', 'At risk']],
  order: [['placed', 'Placed'], ['shipped', 'Shipped'], ['out_for_delivery', 'Out for delivery'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled']],
  case: [['open', 'Open'], ['in_progress', 'In progress'], ['resolved', 'Resolved']],
  priority: [['medium', 'Medium'], ['high', 'High'], ['low', 'Low']],
  role: [['sales', 'Sales person'], ['admin', 'Admin']],
  yesno: [['true', 'Yes'], ['false', 'No']],
};

const session = S.get();
const ROLE = session.role, STAFF = ROLE !== 'customer', ADMIN = ROLE === 'admin';
const CTX = {};
const LOGIN = { admin: 'admin-login.html', sales: 'sales-login.html', customer: 'customer-login.html' }[ROLE];
const MENU = {
  admin: [['dashboard', 'Dashboard'], ['customers', 'Customers'], ['products', 'Products'], ['orders', 'Orders'], ['returns', 'Returns'], ['cases', 'Support cases'], ['team', 'Team']],
  sales: [['dashboard', 'Dashboard'], ['customers', 'My customers'], ['products', 'Products'], ['orders', 'Orders'], ['returns', 'Returns'], ['cases', 'Support cases']],
  customer: [['dashboard', 'Dashboard'], ['shop', 'Shop'], ['orders', 'My orders'], ['returns', 'Returns'], ['cases', 'Support']],
}[ROLE];
const PAGE_ACTION = {
  customers: STAFF && ['add-customer', '+ Add customer'],
  products: ADMIN && ['add-product', '+ Add product'],
  orders: STAFF && ['add-order', '+ Add order'],
  cases: STAFF && ['add-case', '+ Add case'],
  team: ADMIN && ['add-user', '+ Add team member'],
};
const byId = (rows) => Object.fromEntries(rows.map((r) => [r.id, r]));

/* ---------------- views ---------------- */
const V = {
  async dashboard() {
    const d = await api('/dashboard/');
    const K = {
      admin: [['Customers', d.customers, d.at_risk + ' at risk'], ['Orders', d.orders, d.in_transit + ' in transit'], ['Open cases', d.open_cases, d.open_returns + ' open returns', 'down'], ['Revenue', inr(d.revenue), inr(d.refunds_pending) + ' refunds pending']],
      sales: [['My customers', d.customers, 'Assigned to you'], ['At risk', d.at_risk, 'Needs a call', 'down'], ['Open cases', d.open_cases, d.open_returns + ' open returns'], ['Revenue influenced', inr(d.revenue), d.orders + ' orders']],
      customer: [['My orders', d.orders, d.in_transit + ' in transit'], ['Open returns', d.open_returns, inr(d.refunds_pending) + ' refund pending'], ['Open cases', d.open_cases, 'We will reply soon'], ['Total spent', inr(d.revenue), 'Excluding cancelled']],
    }[ROLE];
    const max = Math.max(1, ...d.by_status.map((x) => x.n));
    return kpi(K) + '<div class="card" style="max-width:560px"><h2>Orders by status</h2><p class="sub">Only the orders you are allowed to see</p>' +
      (d.by_status.map((x) => `<div class="why"><div><span>${lab(x.status)}</span><span>${x.n}</span></div><div class="meter"><i style="width:${(x.n / max) * 100}%"></i></div></div>`).join('') || '<p class="sub">No orders yet.</p>') + '</div>' +
      (ROLE === 'customer' ? '<div class="card" style="max-width:560px"><h2>Ready to order?</h2><p class="sub">Browse our products and place an order in one click.</p>' + act('go-shop', 0, 'Open Shop', 'teal') + '</div>' : '');
  },

  async customers(q = '') {
    const [rows, team] = await Promise.all([api('/customers/' + qs(q)), ADMIN ? api('/users/') : []]);
    CTX.customers = byId(rows);
    CTX.team = team.filter((u) => u.role === 'sales' && u.is_active);
    return bar(q, 'Search name or email...') + TBL(['Customer', 'Segment', 'Email', 'Phone', 'Lifetime value', 'Sales person', 'Actions'],
      rows.map((c) => [esc(c.name), st(c.segment), esc(c.email), esc(c.phone) || '-', inr(c.lifetime_value), esc(c.assigned_to_name) || 'Unassigned',
        act('edit-customer', c.id, 'Edit', 'ed') + (ADMIN ? act('del-customer', c.id, 'Delete', 'del') : '')]),
      'No customers yet. Add one here, or customers will appear when they register.');
  },

  async products(q = '') {
    const rows = await api('/products/' + qs(q));
    CTX.products = byId(rows);
    return (ADMIN ? '' : '<p class="sub">Only an admin can add, edit or delete products.</p>') + bar(q, 'Search products...') + TBL(['Product', 'Price', 'Available', ...(ADMIN ? ['Actions'] : [])],
      rows.map((p) => [esc(p.name), inr(p.price), p.active ? tg('Yes', 'lo') : tg('No', 'gr'), ...(ADMIN ? [act('edit-product', p.id, 'Edit', 'ed') + act('del-product', p.id, 'Delete', 'del')] : [])]),
      'No products yet.' + (ADMIN ? ' Add the first product.' : ''));
  },

  async shop(q = '') {
    const rows = await api('/products/' + qs(q));
    return bar(q, 'Search products...') + TBL(['Product', 'Price', ''], rows.map((p) => [esc(p.name), inr(p.price), act('buy', p.id, 'Buy now', 'teal')]), 'No products are available yet. Please check back soon.');
  },

  async orders(q = '') {
    const rows = await api('/orders/' + qs(q));
    const head = STAFF ? ['Order', 'Customer', 'Item', 'Total', 'Status', 'Placed', ''] : ['Order', 'Item', 'Total', 'Status', 'Placed', ''];
    return bar(q, 'Search item or customer...') + TBL(head, rows.map((o) => STAFF
      ? [`#${o.id}`, esc(o.customer_name), esc(o.item), inr(o.total), sel('orders', o.id, o.status, OPT.order), day(o.placed_at), ADMIN ? act('del-order', o.id, 'Delete', 'del') : '']
      : [`#${o.id}`, esc(o.item), inr(o.total), st(o.status), day(o.placed_at), o.status === 'placed' ? act('cancel-order', o.id, 'Cancel') : '']),
      STAFF ? 'No orders yet.' : 'You have no orders yet. Open Shop to buy something.');
  },

  async returns() {
    const rows = await api('/returns/');
    let form = '';
    if (ROLE === 'customer') {
      const ords = await api('/orders/?status=delivered');
      form = ords.length ? `<div class="card" style="max-width:520px"><h2>Start a return</h2><p class="sub">Only delivered orders can be returned.</p>
        <form id="rf"><div class="f"><label for="ro">Order</label><select id="ro">${ords.map((o) => `<option value="${o.id}">#${o.id} ${esc(o.item)}</option>`).join('')}</select></div>
        <div class="f"><label for="rr">Reason</label><select id="rr"><option>Damaged on arrival</option><option>Wrong item</option><option>Not as described</option><option>No longer needed</option></select></div>
        <button class="btn teal" type="submit">Request return</button></form></div>` : '<div class="card soon">You have no delivered orders to return yet.</div>';
    }
    const head = STAFF ? ['Return', 'Customer', 'Item', 'Reason', 'Refund', 'Status', 'Action'] : ['Return', 'Item', 'Reason', 'Refund', 'Status'];
    return form + (rows.length || ROLE !== 'customer' ? TBL(head, rows.map((r) => {
      const a = ADMIN ? (r.status === 'requested' ? act('approve', r.id, 'Approve', 'teal') + act('reject', r.id, 'Reject') : r.status === 'approved' ? act('refund', r.id, 'Mark refunded', 'teal') : '') : '';
      return [`RT-${r.id}`, ...(STAFF ? [esc(r.customer_name)] : []), esc(r.item), esc(r.reason), inr(r.refund_amount), st(r.status), ...(STAFF ? [a] : [])];
    }), 'No return requests yet.') : '');
  },

  async cases(q = '') {
    const rows = await api('/cases/' + qs(q));
    const form = ROLE === 'customer' ? `<div class="card" style="max-width:520px"><h2>Contact support</h2><p class="sub">Tell us what went wrong.</p>
      <form id="cf"><div class="f"><label for="cs">Subject</label><input id="cs"></div><div class="f"><label for="cd">Details</label><textarea id="cd" rows="3"></textarea></div>
      <div class="f"><label for="cp">Priority</label><select id="cp">${OPT.priority.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></div>
      <button class="btn teal" type="submit">Send request</button></form></div>` : '';
    const head = STAFF ? ['Case', 'Customer', 'Subject', 'Details', 'Priority', 'Status', 'Opened', ''] : ['Case', 'Subject', 'Details', 'Priority', 'Status', 'Opened'];
    return form + (STAFF ? bar(q, 'Search subject or customer...') : '') + (rows.length || STAFF ? TBL(head, rows.map((c) => STAFF
      ? [`C-${c.id}`, esc(c.customer_name), esc(c.subject), esc(c.details) || '-', st(c.priority), sel('cases', c.id, c.status, OPT.case), day(c.created_at), ADMIN ? act('del-case', c.id, 'Delete', 'del') : '']
      : [`C-${c.id}`, esc(c.subject), esc(c.details) || '-', st(c.priority), st(c.status), day(c.created_at)]), 'No support cases yet.') : '');
  },

  async team() {
    const rows = await api('/users/');
    CTX.users = byId(rows);
    return TBL(['Name', 'Username', 'Role', 'Status', 'Action'], rows.map((u) =>
      [esc(u.name), esc(u.username), tg(lab(u.role), u.role === 'admin' ? 'bl' : 'gr'), u.is_active ? tg('Active', 'lo') : tg('Inactive', 'hi'),
        u.username === session.username ? 'You' : act('toggle-user', u.id, u.is_active ? 'Deactivate' : 'Activate')]));
  },
};

/* ---------------- popup form ---------------- */
function flash(t, ok) { const e = $('#flash'); e.textContent = t; e.className = 'err' + (ok ? ' ok' : ''); e.hidden = !t; }

function form(title, fields, values, onSave) {
  const m = $('#mod');
  const input = (f) => {
    const v = values[f.k], id = 'f_' + f.k;
    if (f.type === 'select') return `<select id="${id}">${f.opts.map(([o, t]) => `<option value="${esc(o)}"${String(v ?? '') === String(o) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
    if (f.type === 'textarea') return `<textarea id="${id}" rows="3">${esc(v)}</textarea>`;
    return `<input id="${id}" type="${f.type || 'text'}"${f.step ? ` step="${f.step}"` : ''} value="${esc(v)}">`;
  };
  m.innerHTML = `<div class="mbox" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><div class="err" id="me" hidden></div><form id="mf" novalidate>` +
    fields.map((f) => `<div class="f"><label for="f_${f.k}">${f.label}</label>${input(f)}</div>`).join('') +
    '<div class="acts"><button class="btn teal" type="submit">Save</button><button class="btn alt" type="button" id="mc">Cancel</button></div></form></div>';
  m.hidden = false;
  m.querySelector('input,select,textarea').focus();
  const close = () => { m.hidden = true; m.innerHTML = ''; };
  m.onclick = (e) => { if (e.target === m) close(); };
  $('#mc').onclick = close;
  $('#mf').onsubmit = async (e) => {
    e.preventDefault();
    const v = {}, err = $('#me');
    for (const f of fields) {
      const el = $('#f_' + f.k);
      v[f.k] = f.type === 'password' ? el.value : el.value.trim();
      if (f.req && !v[f.k]) { err.textContent = f.label + ' is required.'; err.hidden = false; return; }
    }
    try { const msg = await onSave(v); close(); flash(msg, true); await show(cur); } catch (x) { err.textContent = x.message; err.hidden = false; }
  };
}

const send = (method, path, body) => api(path, { method, body });
const ask = (text, fn) => (confirm(text) ? fn() : false);

function customerForm(c) {
  const f = [{ k: 'name', label: 'Full name', req: 1 }, { k: 'email', label: 'Email', type: 'email', req: 1 }, { k: 'phone', label: 'Phone' }, { k: 'segment', label: 'Segment', type: 'select', opts: OPT.segment }];
  if (ADMIN) f.push({ k: 'assigned_to', label: 'Sales person', type: 'select', opts: [['', c ? 'Unassigned' : 'Auto-assign'], ...CTX.team.map((u) => [u.id, u.name])] });
  form(c ? 'Edit customer' : 'Add customer', f, c ? { ...c, assigned_to: c.assigned_to ?? '' } : { segment: 'new' }, async (v) => {
    const body = { name: v.name, email: v.email, phone: v.phone, segment: v.segment };
    if (ADMIN) body.assigned_to = v.assigned_to ? +v.assigned_to : null;
    await send(c ? 'PATCH' : 'POST', c ? `/customers/${c.id}/` : '/customers/', body);
    return 'Customer saved.';
  });
  return false;
}

function productForm(p) {
  form(p ? 'Edit product' : 'Add product', [{ k: 'name', label: 'Product name', req: 1 }, { k: 'price', label: 'Price (₹)', type: 'number', step: '0.01', req: 1 }, { k: 'active', label: 'Available to customers', type: 'select', opts: OPT.yesno }],
    p ? { ...p, active: String(p.active) } : { active: 'true' }, async (v) => {
      await send(p ? 'PATCH' : 'POST', p ? `/products/${p.id}/` : '/products/', { name: v.name, price: v.price, active: v.active === 'true' });
      return 'Product saved.';
    });
  return false;
}

async function orderForm() {
  const [cs, ps] = await Promise.all([api('/customers/'), api('/products/')]);
  const live = ps.filter((p) => p.active);
  if (!cs.length) { flash('Add a customer first.'); return false; }
  if (!live.length) { flash('No products yet. An admin must add products first.'); return false; }
  form('Add order', [{ k: 'customer', label: 'Customer', type: 'select', opts: cs.map((c) => [c.id, c.name]) }, { k: 'product', label: 'Product', type: 'select', opts: live.map((p) => [p.id, `${p.name} (${inr(p.price)})`]) }], {},
    async (v) => { await send('POST', '/orders/', { customer: +v.customer, product: +v.product }); return 'Order added.'; });
  return false;
}

async function caseForm() {
  const cs = await api('/customers/');
  if (!cs.length) { flash('Add a customer first.'); return false; }
  form('Add support case', [{ k: 'customer', label: 'Customer', type: 'select', opts: cs.map((c) => [c.id, c.name]) }, { k: 'subject', label: 'Subject', req: 1 }, { k: 'details', label: 'Details', type: 'textarea' }, { k: 'priority', label: 'Priority', type: 'select', opts: OPT.priority }],
    { priority: 'medium' }, async (v) => { await send('POST', '/cases/', { customer: +v.customer, subject: v.subject, details: v.details, priority: v.priority }); return 'Case added.'; });
  return false;
}

function userForm() {
  form('Add team member', [{ k: 'name', label: 'Full name', req: 1 }, { k: 'username', label: 'Username', req: 1 }, { k: 'password', label: 'Password (6+ characters)', type: 'password', req: 1 }, { k: 'role', label: 'Role', type: 'select', opts: OPT.role }],
    { role: 'sales' }, async (v) => { await send('POST', '/users/', v); return 'Team member added. Share the username and password with them.'; });
  return false;
}

/* ---------------- button actions (return a message, or false when nothing more to do) ---------------- */
const ACT = {
  'go-shop': () => { show('shop'); return false; },
  'add-customer': () => customerForm(),
  'edit-customer': (id) => customerForm(CTX.customers[id]),
  'del-customer': (id) => ask('Delete this customer with all their orders, returns and cases?', () => send('DELETE', `/customers/${id}/`).then(() => 'Customer deleted.')),
  'add-product': () => productForm(),
  'edit-product': (id) => productForm(CTX.products[id]),
  'del-product': (id) => ask('Delete this product?', () => send('DELETE', `/products/${id}/`).then(() => 'Product deleted.')),
  buy: (id) => ask('Place an order for this product?', () => send('POST', '/orders/', { product: +id }).then(() => { cur = 'orders'; return 'Order placed. You can follow it under My orders.'; })),
  'add-order': () => orderForm(),
  'del-order': (id) => ask('Delete this order?', () => send('DELETE', `/orders/${id}/`).then(() => 'Order deleted.')),
  'cancel-order': (id) => ask('Cancel this order?', () => send('POST', `/orders/${id}/cancel/`).then(() => 'Order cancelled.')),
  approve: (id) => send('POST', `/returns/${id}/approve/`).then(() => 'Return approved.'),
  reject: (id) => send('POST', `/returns/${id}/reject/`).then(() => 'Return rejected.'),
  refund: (id) => send('POST', `/returns/${id}/refund/`).then(() => 'Marked as refunded.'),
  'add-case': () => caseForm(),
  'del-case': (id) => ask('Delete this case?', () => send('DELETE', `/cases/${id}/`).then(() => 'Case deleted.')),
  'add-user': () => userForm(),
  'toggle-user': (id) => send('PATCH', `/users/${id}/`, { is_active: !CTX.users[id].is_active }).then(() => 'Team member updated.'),
};

/* ---------------- page wiring ---------------- */
let cur = 'dashboard';
async function show(k, q = '') {
  cur = k;
  $$('.nav[data-s]').forEach((b) => b.classList.toggle('on', b.dataset.s === k));
  $('#vt').textContent = MENU.find((m) => m[0] === k)[1];
  const pa = PAGE_ACTION[k];
  $('#pa').innerHTML = pa ? act(pa[0], 0, pa[1], 'teal') : '';
  $('#view').innerHTML = '<div class="card soon">Loading...</div>';
  try { $('#view').innerHTML = await V[k](q); } catch (e) { $('#view').innerHTML = ''; flash(e.message); }
  const s = $('#q');
  if (s) s.onkeydown = (e) => e.key === 'Enter' && show(k, s.value.trim());
}

$('#who').textContent = session.name.split(' ')[0];
$('#pill').textContent = { admin: 'Admin', sales: 'Sales person', customer: 'Customer' }[ROLE];
$('#nav').innerHTML = MENU.map((m) => `<button class="nav" data-s="${m[0]}">${m[1]}</button>`).join('');
$$('.nav[data-s]').forEach((b) => (b.onclick = () => { flash(''); show(b.dataset.s); }));

document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  try {
    const msg = await ACT[b.dataset.act](b.dataset.id);
    if (msg === false) return;
    flash(msg, true);
    await show(cur);
  } catch (x) { flash(x.message); }
});

$('#view').addEventListener('change', async (e) => {
  const s = e.target.closest('[data-st]');
  if (!s) return;
  try { await send('PATCH', `/${s.dataset.st}/${s.dataset.id}/`, { status: s.value }); flash('Status updated.', true); } catch (x) { flash(x.message); }
  await show(cur);
});

$('#view').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    let msg;
    if (e.target.id === 'rf') {
      await send('POST', '/returns/', { order: +$('#ro').value, reason: $('#rr').value });
      msg = 'Return requested. Our team will review it shortly.';
    } else if (e.target.id === 'cf') {
      if ($('#cs').value.trim().length < 3) return flash('Subject must be at least 3 characters.');
      await send('POST', '/cases/', { subject: $('#cs').value, details: $('#cd').value, priority: $('#cp').value });
      msg = 'Your request was sent to our support team.';
    } else return;
    await show(cur);
    flash(msg, true);
  } catch (x) { flash(x.message); }
});

addEventListener('keydown', (e) => { if (e.key === 'Escape') { const m = $('#mod'); m.hidden = true; m.innerHTML = ''; } });
$('#out').onclick = async () => { try { await send('POST', '/auth/logout/'); } catch (e) {} S.clear(); location.href = LOGIN; };

show('dashboard');

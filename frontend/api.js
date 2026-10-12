// Shared by every page: session storage + a small wrapper around fetch.
const S = {
  get: () => JSON.parse(localStorage.getItem('crm') || 'null'),
  set: (v) => localStorage.setItem('crm', JSON.stringify(v)),
  clear: () => localStorage.removeItem('crm'),
};

function errText(d) {
  if (!d) return '';
  if (typeof d === 'string') return d;
  if (d.detail) return d.detail;
  return Object.entries(d).map(([k, v]) => k + ': ' + (Array.isArray(v) ? v.join(' ') : v)).join(' | ');
}

async function api(path, opts = {}) {
  const s = S.get();
  const headers = { 'Content-Type': 'application/json' };
  if (s) headers.Authorization = 'Token ' + s.token;
  let r;
  try {
    r = await fetch('/api' + path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  } catch (e) {
    throw new Error('Cannot reach the server. Is it running?');
  }
  if (r.status === 401 && s) { S.clear(); location.href = 'login.html'; throw new Error('Session expired'); }
  const d = r.status === 204 ? null : await r.json().catch(() => null);
  if (!r.ok) throw new Error(errText(d) || 'Request failed (' + r.status + ')');
  return d;
}

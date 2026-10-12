const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const ROLE = document.body.dataset.role;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (S.get()) location.href = 'app.html?v=4';

function say(t) { const m = $('#msg'); m.textContent = t; m.hidden = !t; }

$$('.tabs button').forEach((b) => (b.onclick = () => {
  $$('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
  $('#in').hidden = b.dataset.t !== 'in';
  $('#up').hidden = b.dataset.t !== 'up';
  say('');
}));

$$('.pwrap button').forEach((b) => (b.onclick = () => {
  const i = b.previousElementSibling;
  i.type = i.type === 'password' ? 'text' : 'password';
  b.textContent = i.type === 'password' ? 'Show' : 'Hide';
}));

async function enter(path, body) {
  try {
    S.set(await api(path, { method: 'POST', body }));
    location.href = 'app.html?v=4';
  } catch (e) { say(e.message); }
}

$('#in').onsubmit = (e) => {
  e.preventDefault(); say('');
  const username = $('#u1').value.trim(), password = $('#p1').value;
  if (!username || !password) return say('Enter your username and password.');
  enter('/auth/login/', { username, password, role: ROLE });
};

if ($('#up')) $('#up').onsubmit = (e) => {
  e.preventDefault(); say('');
  const name = $('#n2').value.trim(), email = $('#e2').value.trim(), password = $('#p2').value;
  if (!name) return say('Enter your full name.');
  if (!EMAIL.test(email)) return say('Enter a valid email address.');
  if (password.length < 6) return say('Password must be at least 6 characters.');
  if (password !== $('#c2').value) return say('Passwords do not match.');
  enter('/auth/register/', { name, email, password });
};

const { Router } = require("express");

const router = Router();

router.get("/voter-picker", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Voter Picker — Dev Tool</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh}
  header{background:#1e293b;padding:18px 24px;border-bottom:1px solid #334155;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
  header h1{font-size:1.25rem;font-weight:700;color:#f1f5f9}header span{font-size:.8rem;background:#334155;padding:3px 10px;border-radius:9999px}
  .stats{display:flex;gap:12px;margin:20px 24px 0;flex-wrap:wrap}
  .stat{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px 20px;min-width:130px}
  .stat .n{font-size:1.8rem;font-weight:700;line-height:1}
  .stat .l{font-size:.75rem;color:#94a3b8;margin-top:4px}
  .stat.green .n{color:#4ade80} .stat.red .n{color:#f87171} .stat.blue .n{color:#60a5fa}
  .controls{display:flex;gap:10px;margin:16px 24px;flex-wrap:wrap;align-items:center}
  input[type=search]{background:#1e293b;border:1px solid #475569;border-radius:8px;padding:8px 14px;color:#e2e8f0;font-size:.9rem;width:260px}
  input[type=search]::placeholder{color:#64748b}
  .filters{display:flex;gap:6px;flex-wrap:wrap}
  .btn{border:1px solid #475569;background:transparent;color:#94a3b8;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:.85rem;transition:all .15s}
  .btn:hover{border-color:#60a5fa;color:#60a5fa}
  .btn.active{background:#3b82f6;border-color:#3b82f6;color:#fff;font-weight:600}
  .table-wrap{margin:0 24px 40px;overflow-x:auto;border-radius:10px;border:1px solid #334155}
  table{width:100%;border-collapse:collapse;font-size:.85rem}
  thead tr{background:#1e293b;border-bottom:2px solid #334155}
  th{padding:10px 14px;text-align:left;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;white-space:nowrap}
  td{padding:10px 14px;border-bottom:1px solid #1e293b;white-space:nowrap}
  tr:last-child td{border-bottom:none}
  tr.available:hover{background:#172033} tr.taken{opacity:.55} tr.taken:hover{background:#1a1427}
  .badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:9999px;font-size:.75rem;font-weight:600}
  .badge.avail{background:#14532d;color:#4ade80} .badge.taken{background:#2d1515;color:#f87171}
  .role-badge{padding:2px 8px;border-radius:4px;font-size:.75rem}
  .role-badge.student{background:#1e3a5f;color:#60a5fa}
  .role-badge.teacher{background:#2d1b69;color:#a78bfa}
  .role-badge.staff{background:#1a3327;color:#34d399}
  .copy-btn{background:none;border:1px solid #334155;border-radius:4px;color:#94a3b8;padding:2px 7px;font-size:.75rem;cursor:pointer;margin-left:4px}
  .copy-btn:hover{border-color:#60a5fa;color:#60a5fa}
  .pagination{display:flex;gap:8px;align-items:center;justify-content:center;margin:0 24px 24px}
  .pager{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:6px 14px;cursor:pointer;color:#e2e8f0;font-size:.85rem}
  .pager:disabled{opacity:.4;cursor:default} .pager:not(:disabled):hover{border-color:#60a5fa;color:#60a5fa}
  #pageInfo{color:#94a3b8;font-size:.85rem}
  .register-url{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:10px 16px;margin:0 24px 16px;font-size:.8rem;color:#64748b}
  .register-url a{color:#60a5fa;text-decoration:none} .register-url a:hover{text-decoration:underline}
  #status-msg{position:fixed;bottom:20px;right:20px;background:#1e293b;border:1px solid #334155;padding:10px 16px;border-radius:8px;font-size:.85rem;opacity:0;transition:opacity .3s;pointer-events:none}
  #status-msg.show{opacity:1}
</style>
</head>
<body>
<header>
  <h1>&#127939; Voter Picker</h1>
  <span>Dev Tool</span>
  <span style="color:#94a3b8;font-size:.8rem">Pick an unused row to register in the voting app</span>
</header>

<div class="stats" id="stats"></div>

<div class="register-url">
  Register at: <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/register" target="_blank">${process.env.FRONTEND_URL || "http://localhost:5173"}/register</a>
  &nbsp;|&nbsp; Admin panel: <a href="${process.env.ADMIN_PANEL_URL || "http://localhost:5174"}" target="_blank">${process.env.ADMIN_PANEL_URL || "http://localhost:5174"}</a>
</div>

<div class="controls">
  <input type="search" id="search" placeholder="Search name or ID…" />
  <div class="filters">
    <button class="btn active" data-role="">All</button>
    <button class="btn" data-role="student">Students</button>
    <button class="btn" data-role="teacher">Teachers</button>
    <button class="btn" data-role="staff">Staff</button>
    <button class="btn" data-voter="false" id="availBtn">Available only</button>
  </div>
</div>

<div class="table-wrap">
  <table>
    <thead><tr>
      <th>Status</th><th>Institution ID</th><th>Full Name</th>
      <th>Email</th><th>Role</th><th>Department</th><th>Year</th>
    </tr></thead>
    <tbody id="tbody"><tr><td colspan="7" style="text-align:center;padding:40px;color:#64748b">Loading…</td></tr></tbody>
  </table>
</div>

<div class="pagination">
  <button class="pager" id="firstBtn" onclick="goToPage(1)">&#8676; First</button>
  <button class="pager" id="prevBtn" onclick="changePage(-1)">&#8592; Prev</button>
  <span id="pageInfo"></span>
  <button class="pager" id="nextBtn" onclick="changePage(1)">Next &#8594;</button>
  <button class="pager" id="lastBtn" onclick="goToPage(state.lastPage)">Last &#8677;</button>
</div>

<div id="status-msg"></div>

<script>
function h(s) { return String(s).replace(/[&<>"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'}[c]; }); }
const LIMIT = 20;
let state = { page: 1, role: '', voterFilter: null, search: '', lastPage: 1 };
let debounceTimer;

async function load() {
  const params = new URLSearchParams({ page: state.page, limit: LIMIT });
  if (state.role)        params.set('role',  state.role);
  if (state.voterFilter !== null) params.set('voter', state.voterFilter);
  if (state.search)     params.set('q', state.search);
  const url = state.search && state.search.length >= 2
    ? '/api/search?' + new URLSearchParams({ q: state.search })
    : '/api/members?' + params;

  let data;
  try {
    const r = await fetch(url);
    data = await r.json();
  } catch (err) {
    const td = document.createElement('td');
    td.colSpan = 7;
    td.style.cssText = 'text-align:center;padding:40px;color:#f87171';
    td.textContent = '⚠ Failed to load: ' + err.message;
    const tr = document.createElement('tr');
    tr.appendChild(td);
    const tbody = document.getElementById('tbody');
    tbody.textContent = '';
    tbody.appendChild(tr);
    return;
  }
  const members = state.search && state.search.length >= 2 ? data.results : data.members;

  if (data.stats) {
    document.getElementById('stats').innerHTML =
      '<div class="stat blue"><div class="n">' + data.stats.total + '</div><div class="l">Total members</div></div>' +
      '<div class="stat green"><div class="n">' + data.stats.available + '</div><div class="l">Available</div></div>' +
      '<div class="stat red"><div class="n">' + data.stats.voters + '</div><div class="l">Registered voters</div></div>';
  }

  if (data.pagination) {
    state.lastPage = data.pagination.pages;
    document.getElementById('pageInfo').textContent = 'Page ' + data.pagination.page + ' of ' + data.pagination.pages + ' (' + data.pagination.total + ' rows)';
    const atFirst = data.pagination.page <= 1;
    const atLast  = data.pagination.page >= data.pagination.pages;
    document.getElementById('firstBtn').disabled = atFirst;
    document.getElementById('prevBtn').disabled  = atFirst;
    document.getElementById('nextBtn').disabled  = atLast;
    document.getElementById('lastBtn').disabled  = atLast;
  } else {
    document.getElementById('pageInfo').textContent = (members || []).length + ' result(s)';
    ['firstBtn','prevBtn','nextBtn','lastBtn'].forEach(id => document.getElementById(id).disabled = true);
  }

  const tbody = document.getElementById('tbody');
  if (!members || members.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#64748b">No results found</td></tr>';
    return;
  }
  tbody.innerHTML = members.map(m => {
    const taken = m.is_voter == 1 || m.is_voter === true;
    return '<tr class="' + (taken ? 'taken' : 'available') + '">' +
      '<td><span class="badge ' + (taken ? 'taken' : 'avail') + '">' +
        (taken ? '&#10005; Registered' : '&#10003; Available') + '</span></td>' +
      '<td><code>' + h(m.institution_id) + '</code><button class="copy-btn" data-id="' + h(m.institution_id) + '" onclick="copy(this.dataset.id)" title="Copy ID">copy</button></td>' +
      '<td>' + h(m.full_name) + '</td>' +
      '<td style="color:#94a3b8">' + h(m.email) + '</td>' +
      '<td><span class="role-badge ' + h(m.role) + '">' + h(m.role) + '</span></td>' +
      '<td style="color:#94a3b8">' + h(m.department || '') + '</td>' +
      '<td style="color:#94a3b8">' + h(m.year_level || '—') + '</td>' +
      '</tr>';
  }).join('');
}

function changePage(dir) {
  state.page = Math.max(1, Math.min(state.lastPage, state.page + dir));
  load();
}

function goToPage(n) {
  state.page = Math.max(1, Math.min(state.lastPage, n));
  load();
}

document.getElementById('search').addEventListener('input', function() {
  clearTimeout(debounceTimer);
  state.search = this.value.trim();
  state.page = 1;
  debounceTimer = setTimeout(load, 300);
});

document.querySelectorAll('.btn[data-role]').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.btn[data-role]').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    state.role = this.dataset.role;
    state.page = 1;
    load();
  });
});

const availBtn = document.getElementById('availBtn');
availBtn.addEventListener('click', function() {
  if (state.voterFilter === 'false') {
    state.voterFilter = null;
    this.classList.remove('active');
  } else {
    state.voterFilter = 'false';
    this.classList.add('active');
  }
  state.page = 1;
  load();
});

function copy(text) {
  navigator.clipboard.writeText(text).then(() => showMsg('Copied: ' + text));
}

function showMsg(msg) {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}

load();
setInterval(load, 10000);
</script>
</body>
</html>`);
});

module.exports = router;

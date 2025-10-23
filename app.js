// app.js - frontend behavior (pure js)
const API = "http://127.0.0.1:8000/api";

function el(id){ return document.getElementById(id); }
function setActive(pageId){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  el(pageId).classList.add('active');
}
function token(){ return localStorage.getItem('sc_token') || ""; }
function setToken(t){ localStorage.setItem('sc_token', t); }
function clearToken(){ localStorage.removeItem('sc_token'); }

// nav buttons
document.addEventListener('click', (e)=>{
  if(e.target.matches('#nav-dashboard')) { setActive('page-dashboard'); loadDashboard(); }
  if(e.target.matches('#nav-upload') || e.target.matches('#goto-upload')) { setActive('page-upload'); }
  if(e.target.matches('#nav-reports') || e.target.matches('#goto-reports')) { setActive('page-reports'); loadReports(); }
  if(e.target.matches('#nav-admin')) { setActive('page-admin'); loadAdmin(); }
  if(e.target.matches('#logout')) { clearToken(); setActive('page-login'); }
});

// initial load
window.addEventListener('DOMContentLoaded', ()=> {
  if(token()) { setActive('page-dashboard'); loadDashboard(); }
  else { setActive('page-login'); }
  // attach handlers
  const loginForm = document.getElementById('login-form');
  if(loginForm) loginForm.addEventListener('submit', handleLogin);
  const uploadForm = document.getElementById('upload-form');
  if(uploadForm) uploadForm.addEventListener('submit', handleUpload);
  document.getElementById('goto-reports')?.addEventListener('click', ()=> { setActive('page-reports'); loadReports(); });
});

// LOGIN
async function handleLogin(evt){
  evt.preventDefault();
  const form = evt.target;
  const fd = new FormData(form);
  try {
    const res = await fetch(`${API}/login`, { method:'POST', body: fd });
    const j = await res.json();
    if(res.ok){ setToken(j.access_token); setActive('page-dashboard'); loadDashboard(); }
    else { el('login-msg').textContent = j.detail || 'Login failed'; }
  } catch(e){ el('login-msg').textContent = 'Server unreachable'; }
}

// DASHBOARD
async function loadDashboard(){
  try {
    const res = await fetch(`${API.replace('/api','')}/health`);
    const j = await res.json();
    el('api-status').textContent = j.status;
    // also load recent reports into small area
    loadReports(true);
  } catch(e){ el('api-status').textContent = 'down'; }
}

// UPLOAD
async function handleUpload(evt){
  evt.preventDefault();
  const f = el('file-input').files[0];
  if(!f){ el('upload-msg').textContent = 'Choose a file first'; return; }
  const fd = new FormData();
  fd.append('file', f);
  try {
    const res = await fetch(`${API}/scan`, { method:'POST', headers: { 'Authorization': `Bearer ${token()}` }, body: fd });
    const j = await res.json();
    if(res.ok){
      // navigate to result page
      loadReport(j.report_id);
      setActive('page-result');
    } else {
      el('upload-msg').textContent = j.detail || 'Scan failed';
    }
  } catch(e){ el('upload-msg').textContent = 'Server unreachable'; }
}

// REPORTS
async function loadReports(short=false){
  try {
    const res = await fetch(`${API}/reports`, { headers: { 'Authorization': `Bearer ${token()}` } });
    if(!res.ok){ el('reports-list').innerHTML = '<p class="muted">Unable to load</p>'; return; }
    const arr = await res.json();
    if(!arr.length){ el('reports-list').innerHTML = '<p class="muted">No reports</p>'; return; }
    if(short){
      // show up to 3
      const recent = arr.slice(0,3);
      el('reports-list').innerHTML = recent.map(r => `<div>${r.id} — ${r.filename} — ${r.timestamp} — <a href="#" onclick="loadReport(${r.id});setActive('page-result');return false;">View</a></div>`).join('<hr/>');
      return;
    }
    // full listing
    el('reports-list').innerHTML = arr.map(r => `<div><b>#${r.id}</b> ${r.filename} <span class="muted">by ${r.uploader} at ${r.timestamp}</span> — <a href="#" onclick="loadReport(${r.id});setActive('page-result');return false;">View</a> | <a href="${API}/export/${r.id}" target="_blank">Export</a> | <a href="#" onclick="deleteReport(${r.id});return false;">Delete</a></div>`).join('<hr/>');
  } catch(e){ el('reports-list').innerHTML = '<p class="muted">Server unreachable</p>'; }
}

// LOAD REPORT DETAILS
async function loadReport(id){
  try {
    const res = await fetch(`${API}/reports/${id}`, { headers: { 'Authorization': `Bearer ${token()}` }});
    if(!res.ok){ el('vulnerabilities').innerHTML = '<p class="muted">Unable to load report</p>'; return; }
    const r = await res.json();
    el('result-title').textContent = `Report #${r.id} — ${r.filename}`;
    const vulns = r.vulnerabilities || [];
    if(!vulns.length){
      el('vulnerabilities').innerHTML = '<p class="muted">No vulnerabilities found.</p>';
    } else {
      el('vulnerabilities').innerHTML = vulns.map(v => {
        const sev = (v.severity || '').toUpperCase();
        const cls = sev === 'HIGH' ? 'vuln-high' : (sev === 'MEDIUM' ? 'vuln-med' : 'vuln-low');
        return `<div class="${cls}"><b>${v.test_name||''}</b> — Line ${v.line} — <span class="muted">${v.issue}</span></div>`;
      }).join('');
    }
    el('raw-output').textContent = (r.raw_output || []).join('\n');
  } catch(e){ el('vulnerabilities').innerHTML = '<p class="muted">Server unreachable</p>'; }
}

// DELETE
async function deleteReport(id){
  if(!confirm('Delete report #' + id + '?')) return;
  try {
    const res = await fetch(`${API}/reports/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token()}` }});
    if(res.ok){ alert('Deleted'); loadReports(); }
    else { alert('Delete failed'); }
  } catch(e){ alert('Server unreachable'); }
}

// ADMIN (simple)
function loadAdmin(){ loadReports(); el('admin-list').innerHTML = el('reports-list').innerHTML; }

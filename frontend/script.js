/* ============================================================
   DYNAMIC MULTI-SERVICE AGENT — script.js
   Data source: data.json
   ============================================================ */

// RAG Integration Functions

// For streaming
let activeAssistant = null;

function setActiveAssistant(button, assistant) {
  if (activeAssistant === assistant) {
    activeAssistant = null;
    button.classList.remove("active-assistant");
    return;
  }

  document.querySelectorAll(".suggest-chip").forEach(btn => {
    btn.classList.remove("active-assistant");
  });

  activeAssistant = assistant;
  button.classList.add("active-assistant");
}

hrBtn.addEventListener("click", () => {
  setActiveAssistant(hrBtn, "hr");
});

healthcareBtn.addEventListener("click", () => {
  setActiveAssistant(healthcareBtn, "healthcare");
});


function createStreamingBotMessage() {

  const wrap = $('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.innerHTML = `
    <div class="chat-avatar bot">
      <i class="fa-solid fa-robot"></i>
    </div>
    <div class="chat-bubble"></div>
  `;

  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
  return div.querySelector('.chat-bubble');
}


async function askHRStream(question) {

  const response = await fetch(
    "http://localhost:8000/ask-HR-Policy",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: question
      })
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.body.getReader();
}


async function askHealthCareStream(question) {

  const response = await fetch(
    "http://localhost:8000/ask-Healthcare-Policy",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: question
      })
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.body.getReader();
}


// Code
  
'use strict';

const STATE = {
  data: null,
  uploadedDocs: [],
  activeDocIndex: null,
  history: [],
  selectedProjects: new Set()
};

// ── Utilities ────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function toast(msg, type = 'info', icon = 'fa-circle-info') {
  const wrap = $('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fa-solid ${icon}"></i> ${msg}`;
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity .4s'; setTimeout(() => t.remove(), 400); }, 3200);
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes/1024).toFixed(1)+' KB';
  return (bytes/1048576).toFixed(1)+' MB';
}

function now() {
  return new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
}

function statusBadge(s) {
  const map = {
    'Active':'badge-green','Open':'badge-green','Approved':'badge-green',
    'On Leave':'badge-blue','Pending':'badge-yellow','Processing':'badge-yellow',
    'Closed':'badge-gray','Rejected':'badge-red','Inactive':'badge-red',
    'On-Hold':'badge-yellow','Paused':'badge-gray'
  };
  return `<span class="badge ${map[s]||'badge-gray'}">${esc(s)}</span>`;
}

// ── Inline fallback data (used when fetch fails e.g. file:// protocol) ──────
const FALLBACK_DATA = {
  "projects":[
    {"id":"ALL","name":"All Projects","env":"Global","color":"#6b7280","status":"Active","lead":"—","team":0},
    {"id":"ETISALAT","name":"Ethisalat","env":"Pnprod","color":"#3b82f6","status":"Active","lead":"Usman Tariq","team":12},
    {"id":"SYS","name":"System Limited","env":"Pnprod4","color":"#7c3aed","status":"Active","lead":"Sara Malik","team":18},
    {"id":"CELCOM","name":"CelcomDigi","env":"Preprod5","color":"#10b981","status":"Active","lead":"Ali Hassan","team":15},
    {"id":"STZA","name":"STZA","env":"SIT3","color":"#f59e0b","status":"Active","lead":"Fatima Noor","team":9},
    {"id":"GLAPPLUS","name":"Glap-Plus","env":"UATPP","color":"#ef4444","status":"Active","lead":"Bilal Ahmed","team":7},
    {"id":"HEC","name":"HEC","env":"SIT","color":"#ec4899","status":"Active","lead":"Nadia Rehman","team":6},
    {"id":"PTCL","name":"PTCL","env":"Prod1","color":"#06b6d4","status":"Active","lead":"Imran Khan","team":20},
    {"id":"JAZZ","name":"Jazz Telecom","env":"UAT2","color":"#8b5cf6","status":"Active","lead":"Mehwish Ali","team":14},
    {"id":"NETSOL","name":"NetSol Tech","env":"Dev3","color":"#059669","status":"Active","lead":"Fahad Malik","team":11},
    {"id":"FBR","name":"FBR Portal","env":"Preprod2","color":"#d97706","status":"On-Hold","lead":"Sana Javed","team":8},
    {"id":"NADRA","name":"NADRA Connect","env":"SIT5","color":"#dc2626","status":"Active","lead":"Omar Farooq","team":10},
    {"id":"OGDCL","name":"OGDCL Energy","env":"Prod2","color":"#78716c","status":"Active","lead":"Rabia Nasir","team":13},
    {"id":"PMSA","name":"PMSA Health","env":"UAT3","color":"#0ea5e9","status":"Active","lead":"Dr. Adil Raza","team":16},
    {"id":"NLC","name":"NLC Logistics","env":"Dev5","color":"#a3e635","status":"Paused","lead":"Tariq Hussain","team":5}
  ],
  "employees":[
    {"id":"EMP001","name":"Ali Hassan","department":"Engineering","project":"CELCOM","position":"Senior Developer","email":"ali.hassan@system.com","phone":"0311-1234567","joinDate":"2021-03-15","status":"Active","salary":180000,"attendance":{"present":22,"absent":1,"leave":0,"total":23}},
    {"id":"EMP002","name":"Sara Malik","department":"HR","project":"SYS","position":"HR Manager","email":"sara.malik@system.com","phone":"0312-2345678","joinDate":"2019-07-01","status":"Active","salary":210000,"attendance":{"present":20,"absent":0,"leave":3,"total":23}},
    {"id":"EMP003","name":"Usman Tariq","department":"Finance","project":"ETISALAT","position":"Finance Analyst","email":"usman.tariq@system.com","phone":"0313-3456789","joinDate":"2020-11-20","status":"Active","salary":155000,"attendance":{"present":18,"absent":2,"leave":3,"total":23}},
    {"id":"EMP004","name":"Hina Akhtar","department":"Operations","project":"STZA","position":"Operations Lead","email":"hina.akhtar@system.com","phone":"0314-4567890","joinDate":"2022-01-10","status":"Active","salary":165000,"attendance":{"present":23,"absent":0,"leave":0,"total":23}},
    {"id":"EMP005","name":"Bilal Ahmed","department":"IT","project":"GLAPPLUS","position":"Network Engineer","email":"bilal.ahmed@system.com","phone":"0315-5678901","joinDate":"2018-05-05","status":"Active","salary":145000,"attendance":{"present":19,"absent":3,"leave":1,"total":23}},
    {"id":"EMP006","name":"Nadia Rehman","department":"Marketing","project":"HEC","position":"Marketing Executive","email":"nadia.rehman@system.com","phone":"0316-6789012","joinDate":"2023-02-14","status":"Active","salary":130000,"attendance":{"present":21,"absent":1,"leave":1,"total":23}},
    {"id":"EMP007","name":"Kamran Shah","department":"Engineering","project":"CELCOM","position":"QA Engineer","email":"kamran.shah@system.com","phone":"0317-7890123","joinDate":"2021-09-01","status":"On Leave","salary":140000,"attendance":{"present":15,"absent":0,"leave":8,"total":23}},
    {"id":"EMP008","name":"Ayesha Siddiqui","department":"Admin","project":"SYS","position":"Admin Officer","email":"ayesha.siddiqui@system.com","phone":"0318-8901234","joinDate":"2020-06-22","status":"Active","salary":120000,"attendance":{"present":22,"absent":1,"leave":0,"total":23}},
    {"id":"EMP009","name":"Zubair Qureshi","department":"Engineering","project":"ETISALAT","position":"Backend Developer","email":"zubair.qureshi@system.com","phone":"0319-9012345","joinDate":"2022-08-11","status":"Active","salary":160000,"attendance":{"present":20,"absent":2,"leave":1,"total":23}},
    {"id":"EMP010","name":"Fatima Noor","department":"HR","project":"STZA","position":"Recruitment Officer","email":"fatima.noor@system.com","phone":"0310-0123456","joinDate":"2023-05-30","status":"Active","salary":115000,"attendance":{"present":17,"absent":0,"leave":6,"total":23}},
    {"id":"EMP011","name":"Imran Khan","department":"Engineering","project":"PTCL","position":"Project Manager","email":"imran.khan@system.com","phone":"0320-1234568","joinDate":"2017-04-10","status":"Active","salary":260000,"attendance":{"present":21,"absent":2,"leave":0,"total":23}},
    {"id":"EMP012","name":"Mehwish Ali","department":"Design","project":"JAZZ","position":"UI/UX Designer","email":"mehwish.ali@system.com","phone":"0321-2345679","joinDate":"2022-03-05","status":"Active","salary":135000,"attendance":{"present":23,"absent":0,"leave":0,"total":23}},
    {"id":"EMP013","name":"Fahad Malik","department":"Engineering","project":"NETSOL","position":"Full Stack Developer","email":"fahad.malik@system.com","phone":"0322-3456780","joinDate":"2020-09-15","status":"Active","salary":175000,"attendance":{"present":20,"absent":1,"leave":2,"total":23}},
    {"id":"EMP014","name":"Sana Javed","department":"Compliance","project":"FBR","position":"Tax Consultant","email":"sana.javed@system.com","phone":"0323-4567891","joinDate":"2019-11-20","status":"Active","salary":190000,"attendance":{"present":19,"absent":3,"leave":1,"total":23}},
    {"id":"EMP015","name":"Omar Farooq","department":"IT","project":"NADRA","position":"Database Administrator","email":"omar.farooq@system.com","phone":"0324-5678902","joinDate":"2021-06-01","status":"Active","salary":170000,"attendance":{"present":22,"absent":1,"leave":0,"total":23}},
    {"id":"EMP016","name":"Rabia Nasir","department":"Engineering","project":"OGDCL","position":"Petroleum Engineer","email":"rabia.nasir@system.com","phone":"0325-6789013","joinDate":"2020-01-15","status":"Active","salary":225000,"attendance":{"present":21,"absent":0,"leave":2,"total":23}},
    {"id":"EMP017","name":"Dr. Adil Raza","department":"Healthcare","project":"PMSA","position":"Health IT Specialist","email":"adil.raza@system.com","phone":"0326-7890124","joinDate":"2023-01-01","status":"Active","salary":200000,"attendance":{"present":18,"absent":2,"leave":3,"total":23}},
    {"id":"EMP018","name":"Tariq Hussain","department":"Logistics","project":"NLC","position":"Logistics Coordinator","email":"tariq.hussain@system.com","phone":"0327-8901235","joinDate":"2022-07-20","status":"Active","salary":125000,"attendance":{"present":16,"absent":4,"leave":3,"total":23}},
    {"id":"EMP019","name":"Mariam Butt","department":"Finance","project":"JAZZ","position":"Financial Controller","email":"mariam.butt@system.com","phone":"0328-9012346","joinDate":"2018-10-10","status":"Active","salary":195000,"attendance":{"present":22,"absent":1,"leave":0,"total":23}},
    {"id":"EMP020","name":"Shahzad Iqbal","department":"Engineering","project":"PTCL","position":"Cloud Architect","email":"shahzad.iqbal@system.com","phone":"0329-0123457","joinDate":"2019-03-25","status":"Active","salary":280000,"attendance":{"present":23,"absent":0,"leave":0,"total":23}}
  ],
  "jobs":[
    {"id":"JOB001","title":"Senior React Developer","department":"Engineering","project":"CELCOM","type":"Full-Time","location":"Islamabad","posted":"2026-06-28","deadline":"2026-07-31","status":"Open","description":"5+ years experience with React, TypeScript, REST APIs."},
    {"id":"JOB002","title":"HR Business Partner","department":"HR","project":"SYS","type":"Full-Time","location":"Lahore","posted":"2026-07-01","deadline":"2026-07-25","status":"Open","description":"HR strategy, talent acquisition, employee relations."},
    {"id":"JOB003","title":"Network Operations Engineer","department":"IT","project":"ETISALAT","type":"Contract","location":"Karachi","posted":"2026-07-02","deadline":"2026-07-20","status":"Open","description":"Manage telecom network infrastructure and monitoring."},
    {"id":"JOB004","title":"Data Analyst","department":"Finance","project":"STZA","type":"Full-Time","location":"Islamabad","posted":"2026-07-03","deadline":"2026-08-05","status":"Open","description":"SQL, Python, Power BI reporting and data insights."},
    {"id":"JOB005","title":"DevOps Engineer","department":"Engineering","project":"GLAPPLUS","type":"Full-Time","location":"Remote","posted":"2026-07-04","deadline":"2026-07-28","status":"Open","description":"CI/CD, Docker, Kubernetes, AWS cloud infrastructure."},
    {"id":"JOB006","title":"Marketing Manager","department":"Marketing","project":"HEC","type":"Full-Time","location":"Lahore","posted":"2026-07-05","deadline":"2026-07-30","status":"Closed","description":"Lead digital marketing campaigns and brand strategy."},
    {"id":"JOB007","title":"Cloud Solutions Architect","department":"Engineering","project":"PTCL","type":"Full-Time","location":"Islamabad","posted":"2026-07-01","deadline":"2026-08-10","status":"Open","description":"AWS/Azure architecture, microservices, high availability systems."},
    {"id":"JOB008","title":"UI/UX Designer","department":"Design","project":"JAZZ","type":"Full-Time","location":"Karachi","posted":"2026-07-02","deadline":"2026-07-30","status":"Open","description":"Figma, user research, wireframing, prototyping for mobile app."},
    {"id":"JOB009","title":"Python Backend Developer","department":"Engineering","project":"NETSOL","type":"Full-Time","location":"Lahore","posted":"2026-07-03","deadline":"2026-08-01","status":"Open","description":"Django, FastAPI, PostgreSQL, microservices architecture."},
    {"id":"JOB010","title":"Tax & Compliance Analyst","department":"Compliance","project":"FBR","type":"Contract","location":"Islamabad","posted":"2026-07-04","deadline":"2026-07-25","status":"Open","description":"FBR tax filings, audit support, regulatory compliance."},
    {"id":"JOB011","title":"Database Administrator","department":"IT","project":"NADRA","type":"Full-Time","location":"Islamabad","posted":"2026-07-05","deadline":"2026-08-15","status":"Open","description":"Oracle, PostgreSQL, high-security DB management for govt systems."},
    {"id":"JOB012","title":"Petroleum Data Engineer","department":"Engineering","project":"OGDCL","type":"Full-Time","location":"Karachi","posted":"2026-07-01","deadline":"2026-08-20","status":"Open","description":"Energy sector data pipelines, reservoir analytics, SCADA systems."},
    {"id":"JOB013","title":"Health Systems Analyst","department":"Healthcare","project":"PMSA","type":"Full-Time","location":"Islamabad","posted":"2026-07-03","deadline":"2026-08-10","status":"Open","description":"EHR implementation, HL7 FHIR, healthcare data integration."},
    {"id":"JOB014","title":"Supply Chain Manager","department":"Logistics","project":"NLC","type":"Full-Time","location":"Rawalpindi","posted":"2026-07-06","deadline":"2026-07-31","status":"Open","description":"Fleet management, route optimization, logistics automation."}
  ],
  "medicalClaims":[
    {"id":"MCL001","empId":"EMP001","empName":"Ali Hassan","type":"Hospitalization","amount":45000,"date":"2026-06-10","status":"Approved","hospital":"Shifa International","description":"Appendix surgery and post-op care"},
    {"id":"MCL002","empId":"EMP003","empName":"Usman Tariq","type":"OPD","amount":3500,"date":"2026-06-18","status":"Pending","hospital":"Islamabad Diagnostic","description":"Routine checkup and lab tests"},
    {"id":"MCL003","empId":"EMP007","empName":"Kamran Shah","type":"Dental","amount":12000,"date":"2026-06-22","status":"Approved","hospital":"Dr. Smile Dental Clinic","description":"Root canal treatment"},
    {"id":"MCL004","empId":"EMP006","empName":"Nadia Rehman","type":"OPD","amount":2200,"date":"2026-07-01","status":"Pending","hospital":"Poly Clinic","description":"Fever and prescription medicines"},
    {"id":"MCL005","empId":"EMP002","empName":"Sara Malik","type":"Maternity","amount":85000,"date":"2026-07-02","status":"Processing","hospital":"PIMS Hospital","description":"Maternity delivery and care"},
    {"id":"MCL006","empId":"EMP009","empName":"Zubair Qureshi","type":"OPD","amount":4800,"date":"2026-07-04","status":"Rejected","hospital":"CMH","description":"Incomplete documentation submitted"},
    {"id":"MCL007","empId":"EMP011","empName":"Imran Khan","type":"OPD","amount":6500,"date":"2026-07-01","status":"Approved","hospital":"Shifa International","description":"Blood pressure and cardiac tests"},
    {"id":"MCL008","empId":"EMP016","empName":"Rabia Nasir","type":"Hospitalization","amount":95000,"date":"2026-07-03","status":"Processing","hospital":"Agha Khan Hospital","description":"Knee replacement surgery"},
    {"id":"MCL009","empId":"EMP019","empName":"Mariam Butt","type":"Vision","amount":18000,"date":"2026-07-05","status":"Approved","hospital":"Al-Shifa Eye Trust","description":"LASIK eye surgery"},
    {"id":"MCL010","empId":"EMP014","empName":"Sana Javed","type":"OPD","amount":3200,"date":"2026-07-06","status":"Pending","hospital":"Quaid-e-Azam Hospital","description":"Migraine treatment and medication"}
  ],
  "hrPolicies":[
    {"id":"POL001","title":"Leave Policy","category":"Leave","lastUpdated":"2026-01-15","content":"Annual leave: 20 days. Sick leave: 10 days. Casual leave: 5 days. Maternity: 90 days. Paternity: 10 days. All leaves require prior approval via HR portal."},
    {"id":"POL002","title":"Work From Home Policy","category":"Operations","lastUpdated":"2026-03-01","content":"Employees may work from home up to 2 days per week with manager approval. Core hours are 10AM-4PM. VPN and secure connections are mandatory. WFH is not applicable during probation period."},
    {"id":"POL003","title":"Code of Conduct","category":"Compliance","lastUpdated":"2025-12-01","content":"All employees must maintain professional behavior. Zero tolerance for harassment or discrimination. Confidentiality of company data is mandatory. Violations may result in disciplinary action including termination."},
    {"id":"POL004","title":"Medical Reimbursement","category":"Benefits","lastUpdated":"2026-02-10","content":"Employees are entitled to PKR 100,000 per year for medical expenses. Claims must be submitted within 30 days with original receipts. Hospitalization must be pre-approved except in emergencies."},
    {"id":"POL005","title":"Performance Review","category":"HR","lastUpdated":"2026-04-01","content":"Annual performance reviews are conducted in December. Mid-year check-ins are mandatory. KPIs are set at the start of each year. Promotions and increments are based on performance scores."},
    {"id":"POL006","title":"Training and Development","category":"HR","lastUpdated":"2026-01-20","content":"Each employee receives a training budget of PKR 50,000 per year. External certifications are encouraged. Training plans are submitted in January. Sponsored training requires a bond period of 1 year."},
    {"id":"POL007","title":"Salary and Increment","category":"Finance","lastUpdated":"2026-05-01","content":"Annual increments are processed in July. Increment range is 10-25% based on performance grade. Market adjustment reviews are conducted every 2 years. Bonuses are paid in December."},
    {"id":"POL008","title":"Travel and Expense Policy","category":"Finance","lastUpdated":"2026-02-20","content":"Business travel requires pre-approval. Daily allowance: PKR 3,000 local, PKR 10,000 international. Hotel booking through designated vendors. Expense claims must be submitted within 7 days of return."}
  ],
  "attendanceData":{
    "summary":{"totalEmployees":20,"presentToday":16,"absentToday":2,"onLeave":2},
    "monthly":[
      {"month":"Jan 2026","present":420,"absent":30,"leave":10},
      {"month":"Feb 2026","present":390,"absent":40,"leave":10},
      {"month":"Mar 2026","present":440,"absent":16,"leave":4},
      {"month":"Apr 2026","present":410,"absent":24,"leave":6},
      {"month":"May 2026","present":430,"absent":20,"leave":10},
      {"month":"Jun 2026","present":400,"absent":36,"leave":24}
    ]
  }
};

// ── Load data.json (with inline fallback for file:// protocol) ──────────────
async function loadData() {
  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error('fetch failed');
    STATE.data = await res.json();
  } catch(e) {
    // fetch blocked (file:// mode) — use inline fallback silently
    STATE.data = FALLBACK_DATA;
  }
  init();
}

// ── Init ─────────────────────────────────────────────────────
function init() {
  buildProjectDropdown();
  buildProjectGrid();
  bindSidebarToggle();
  bindTabs();
  bindDropZone();
  bindDocQA();
  bindSearchButtons();
  bindChatInput();
  bindCardClicks();
  bindTopActions();
  bindModal();
  bindResultsClose();
  // addBotWelcome();
}

// ── Welcome message ──────────────────────────────────────────
function addBotWelcome() {
  const p = STATE.data.projects.filter(x => x.id !== 'ALL').length;
  const e = STATE.data.employees.length;
  const j = STATE.data.jobs.filter(x => x.status === 'Open').length;
  addBotMessage(
    `👋 Hello! I'm <b>DMSA</b> — your Dynamic Multi-Service Agent.<br><br>` +
    `I have access to:<br>` +
    `• <b>${p} Projects</b> · <b>${e} Employees</b> · <b>${j} Open Jobs</b><br>` +
    `• Medical claims, HR policies &amp; document analysis<br><br>` +
    `Try typing <i>"show all projects"</i>, <i>"EMP005"</i>, or click a suggestion above.`
  );
}

// ── Project Dropdown ─────────────────────────────────────────
function buildProjectDropdown() {
  const sel = $('searchProject');
  sel.innerHTML = '<option value="">— Select Project —</option>';
  STATE.data.projects.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name + (p.env ? ` (${p.env})` : '');
    sel.appendChild(opt);
  });
}

// ── Project Grid ─────────────────────────────────────────────
function buildProjectGrid() {
  const grid = $('projectGrid');
  grid.innerHTML = '';
  STATE.data.projects.forEach(p => {
    const label = document.createElement('label');
    label.className = 'checkbox-card' + (p.id === 'SYS' ? ' active' : '');
    label.innerHTML = `
      <input type="checkbox" value="${p.id}" ${p.id === 'SYS' ? 'checked' : ''} />
      <span style="display:flex;flex-direction:column">
        <span style="font-weight:600">${esc(p.name)}</span>
        <em>${esc(p.env)}</em>
      </span>
      <span class="proj-dot" style="width:8px;height:8px;border-radius:50%;background:${esc(p.color)};flex-shrink:0;margin-left:auto"></span>`;
    const cb = label.querySelector('input');
    cb.addEventListener('change', () => {
      label.classList.toggle('active', cb.checked);
      if (cb.checked) STATE.selectedProjects.add(p.id);
      else STATE.selectedProjects.delete(p.id);
      const first = STATE.data.projects.find(x => STATE.selectedProjects.has(x.id));
      if (first) $('topProjectName').textContent = first.name;
    });
    if (p.id === 'SYS') STATE.selectedProjects.add('SYS');
    grid.appendChild(label);
  });
}

// ── Sidebar Toggle ───────────────────────────────────────────
function bindSidebarToggle() {
  const sidebar = $('sidebar'), overlay = $('sidebarOverlay');
  const toggleBtn = $('sidebarToggle'), icon = $('toggleIcon');

  toggleBtn.addEventListener('click', () => {
    if (window.innerWidth > 660) {
      sidebar.classList.toggle('collapsed');
      icon.className = sidebar.classList.contains('collapsed')
        ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-left';
    }
  });

  $('mobileMenuBtn').addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active', sidebar.classList.contains('mobile-open'));
  });

  overlay.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
  });
}

// ── Tab Switching ─────────────────────────────────────────────
function bindTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.tab;
      switchTab(name);
      onTabActivated(name);
    });
  });
}

function onTabActivated(name) {
  if (!STATE.data) return;
  if (name === 'search') {
    // auto-show all employees when Search tab is clicked
    const hasResults = $('resultsPanel').style.display !== 'none' &&
                       $('resultsPanel').style.display !== '';
    // if (!hasResults) {
    //   setTimeout(() => showAllEmployees(), 200);
    // }
  } else if (name === 'docs') {
    if (STATE.uploadedDocs.length && STATE.activeDocIndex !== null) {
      setTimeout(() => showDocAnalytics(STATE.uploadedDocs[STATE.activeDocIndex]), 200);
    }
  } else if (name === 'history') {
    updateHistBadge();
  }
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${name}"]`).classList.add('active');
  $('tab-' + name).classList.add('active');
}

function openSidebar() {
  const sb = $('sidebar');
  if (window.innerWidth <= 660) {
    sb.classList.add('mobile-open');
    $('sidebarOverlay').classList.add('active');
  } else if (sb.classList.contains('collapsed')) {
    sb.classList.remove('collapsed');
    $('toggleIcon').className = 'fa-solid fa-chevron-left';
  }
}

// ── Search Buttons ────────────────────────────────────────────
function bindSearchButtons() {
  $('btnKeywordSearch').addEventListener('click', doKeywordSearch);
  $('searchKeyword').addEventListener('keydown', e => { if (e.key==='Enter') doKeywordSearch(); });
  $('btnEmpSearch').addEventListener('click', doEmployeeSearch);
  $('searchEmpId').addEventListener('keydown', e => { if (e.key==='Enter') doEmployeeSearch(); });
  $('searchProject').addEventListener('change', doProjectSearch);
}

function doKeywordSearch() {
  const kw = $('searchKeyword').value.trim().toLowerCase();
  if (!kw) { toast('Enter a keyword to search.','error','fa-circle-exclamation'); return; }
  addHistory(`Keyword: "${kw}"`, 'fa-magnifying-glass', () => { $('searchKeyword').value = kw; doKeywordSearch(); });

  const emps   = STATE.data.employees.filter(e => JSON.stringify(e).toLowerCase().includes(kw));
  const jobs   = STATE.data.jobs.filter(j => JSON.stringify(j).toLowerCase().includes(kw));
  const claims = STATE.data.medicalClaims.filter(c => JSON.stringify(c).toLowerCase().includes(kw));
  const pols   = STATE.data.hrPolicies.filter(p => JSON.stringify(p).toLowerCase().includes(kw));
  const projs  = STATE.data.projects.filter(p => JSON.stringify(p).toLowerCase().includes(kw) && p.id !== 'ALL');

  const total = emps.length + jobs.length + claims.length + pols.length + projs.length;
  if (!total) { showResults(`No results for "<b>${esc(kw)}</b>"`, noResults()); return; }

  let html = '';
  if (projs.length)  html += renderProjectsTable(projs);
  if (emps.length)   html += '<div style="margin-top:12px">' + renderEmployeeTable(emps) + '</div>';
  if (jobs.length)   html += '<div style="margin-top:12px">' + renderJobsTable(jobs) + '</div>';
  if (claims.length) html += '<div style="margin-top:12px">' + renderClaimsTable(claims) + '</div>';
  if (pols.length)   html += '<div style="margin-top:12px">' + renderPoliciesTable(pols) + '</div>';
  showResults(`Keyword: "<b>${esc(kw)}</b>" — ${total} result(s)`, html);
}

function doEmployeeSearch() {
  const raw = $('searchEmpId').value.trim().toUpperCase();
  if (!raw) { toast('Enter an Employee ID.','error','fa-circle-exclamation'); return; }
  const emp = STATE.data.employees.find(e => e.id === raw);
  if (!emp) { toast(`No employee found: ${raw}`,'error','fa-circle-exclamation'); return; }
  addHistory(`Employee: ${emp.name}`, 'fa-user', () => showResults(`Employee: <b>${esc(emp.name)}</b>`, renderEmployeeCard(emp)));
  showResults(`Employee Profile: <b>${esc(emp.name)}</b>`, renderEmployeeCard(emp));
}

function doProjectSearch() {
  const pid = $('searchProject').value;
  if (!pid) return;
  const proj = STATE.data.projects.find(p => p.id === pid);
  const emps = STATE.data.employees.filter(e => e.project === pid);
  const jobs = STATE.data.jobs.filter(j => j.project === pid);
  addHistory(`Project: ${proj?.name || pid}`, 'fa-diagram-project',
    () => showProjectDetail(pid));
  showProjectDetail(pid);
}

function showProjectDetail(pid) {
  const proj = STATE.data.projects.find(p => p.id === pid);
  if (!proj) return;
  const emps = STATE.data.employees.filter(e => e.project === pid);
  const jobs = STATE.data.jobs.filter(j => j.project === pid);
  let html = `
    <div class="proj-detail-header" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:#fff;border:1px solid var(--border);border-radius:12px;margin-bottom:12px">
      <div style="width:44px;height:44px;border-radius:12px;background:${esc(proj.color)}22;display:grid;place-items:center">
        <div style="width:20px;height:20px;border-radius:50%;background:${esc(proj.color)}"></div>
      </div>
      <div>
        <div style="font-size:16px;font-weight:700">${esc(proj.name)}</div>
        <div style="font-size:12px;color:#6b7280">${esc(proj.env)} &nbsp;·&nbsp; Lead: ${esc(proj.lead)} &nbsp;·&nbsp; Team: ${proj.team}</div>
      </div>
      ${statusBadge(proj.status)}
    </div>
    <div class="summary-cards" style="margin-bottom:12px">
      <div class="summary-card"><div class="sc-icon">👥</div><div class="sc-val">${emps.length}</div><div class="sc-label">Employees</div></div>
      <div class="summary-card"><div class="sc-icon">💼</div><div class="sc-val">${jobs.filter(j=>j.status==='Open').length}</div><div class="sc-label">Open Jobs</div></div>
    </div>`;
  if (emps.length) html += renderEmployeeTable(emps);
  if (jobs.length) html += '<div style="margin-top:12px">' + renderJobsTable(jobs) + '</div>';
  if (!emps.length && !jobs.length) html += noResults('No records found for this project.');
  showResults(`Project: <b>${esc(proj.name)}</b>`, html);
}

// ── Drop Zone ────────────────────────────────────────────────
function bindDropZone() {
  const dz = $('dropZone'), fi = $('fileInput');
  dz.addEventListener('click', () => fi.click());
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
  fi.addEventListener('change', () => handleFiles(fi.files));
}

function handleFiles(fileList) {
  [...fileList].forEach(file => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['txt','csv','json','md'].includes(ext)) {
      toast(`Unsupported: .${ext}`,'error','fa-circle-exclamation'); return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target.result;
      const doc = { name: file.name, size: file.size, content, ext, words: tokenize(content) };
      STATE.uploadedDocs.push(doc);
      STATE.activeDocIndex = STATE.uploadedDocs.length - 1;
      renderUploadedFiles();
      showDocAnalytics(doc);
      $('docAnalyticsSection').style.display = '';
      $('docQASection').style.display = '';
      updateDocBadge();
      addHistory(`Uploaded: ${file.name}`, 'fa-file-arrow-up');
      toast(`"${file.name}" uploaded & analysed!`, 'success', 'fa-check-circle');
    };
    reader.readAsText(file);
  });
}

function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w => w.length > 2);
}

function renderUploadedFiles() {
  const wrap = $('uploadedFiles');
  if (!STATE.uploadedDocs.length) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = STATE.uploadedDocs.map((d, i) => `
    <div class="uploaded-file-item">
      <i class="fa-solid fa-file-lines file-icon"></i>
      <span class="file-name" title="${esc(d.name)}">${esc(d.name)}</span>
      <span class="file-size">${formatSize(d.size)}</span>
      ${STATE.activeDocIndex === i
        ? '<span class="file-active"><i class="fa-solid fa-circle-dot"></i> Active</span>'
        : `<button class="file-remove" onclick="setActiveDoc(${i})" title="Set Active"><i class="fa-solid fa-circle-play"></i></button>`}
      <button class="file-remove" onclick="removeDoc(${i})" title="Remove"><i class="fa-solid fa-xmark"></i></button>
    </div>`).join('');
}

function setActiveDoc(i) {
  STATE.activeDocIndex = i;
  showDocAnalytics(STATE.uploadedDocs[i]);
  renderUploadedFiles();
  $('docQAMessages').innerHTML = '<div class="qa-hint">Ask anything about the uploaded document…</div>';
}

function removeDoc(i) {
  STATE.uploadedDocs.splice(i, 1);
  if (STATE.activeDocIndex >= STATE.uploadedDocs.length) STATE.activeDocIndex = STATE.uploadedDocs.length - 1;
  if (STATE.uploadedDocs.length === 0) STATE.activeDocIndex = null;
  renderUploadedFiles();
  updateDocBadge();
  if (!STATE.uploadedDocs.length) {
    $('docAnalyticsSection').style.display = 'none';
    $('docQASection').style.display = 'none';
  } else {
    showDocAnalytics(STATE.uploadedDocs[STATE.activeDocIndex]);
  }
}

function showDocAnalytics(doc) {
  const lines     = doc.content.split('\n').length;
  const words     = doc.words.length;
  const chars     = doc.content.length;
  const sentences = (doc.content.match(/[.!?]+/g)||[]).length;
  const stopWords = new Set(['the','and','for','are','was','has','not','with','this','that','from','have','been','they','will','into','more','also','than','then','when','what','which','just','like','some','over','its','can','but','you','all','our','out','one','had','she','her','him','his','who','were','said','each','we','is','it','to','of','in','a','an','on','at','be','do','by','if','or','as','he','so','no','up','may','my','your','their','would','could','should','about','after','before','other','such','only','even','any','both','still','first','well','where','while','those','these','very']);
  const freq = {};
  doc.words.filter(w => !stopWords.has(w) && w.length > 3).forEach(w => freq[w] = (freq[w]||0)+1);
  const topWords = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,14);

  $('analyticsGrid').innerHTML = `
    <div class="analytics-stat"><div class="stat-val">${lines.toLocaleString()}</div><div class="stat-label">Lines</div></div>
    <div class="analytics-stat"><div class="stat-val">${words.toLocaleString()}</div><div class="stat-label">Words</div></div>
    <div class="analytics-stat"><div class="stat-val">${chars.toLocaleString()}</div><div class="stat-label">Characters</div></div>
    <div class="analytics-stat"><div class="stat-val">${sentences.toLocaleString()}</div><div class="stat-label">Sentences</div></div>`;
  $('topWords').innerHTML = topWords.length ? `
    <div class="top-words-title" style="margin-top:10px"><i class="fa-solid fa-fire-flame-curved" style="color:#f59e0b"></i> Top Keywords</div>
    <div class="word-tags" style="margin-top:6px">${topWords.map(([w,c])=>`<span class="word-tag" title="${c}×">${esc(w)}</span>`).join('')}</div>` : '';
}

function updateDocBadge() {
  const badge = $('docsBadge');
  const n = STATE.uploadedDocs.length;
  badge.style.display = n ? '' : 'none';
  badge.textContent = n;
}

// ── Document Q&A ─────────────────────────────────────────────
function bindDocQA() {
  $('btnDocQA').addEventListener('click', doDocQA);
  $('docQAInput').addEventListener('keydown', e => { if (e.key==='Enter') { e.preventDefault(); doDocQA(); } });
}

function doDocQA() {
  const q = $('docQAInput').value.trim();
  if (!q) return;
  if (STATE.activeDocIndex === null || !STATE.uploadedDocs.length) {
    toast('Please upload a document first.','error','fa-circle-exclamation'); return;
  }
  $('docQAInput').value = '';
  const msgs = $('docQAMessages');
  msgs.querySelector('.qa-hint')?.remove();
  msgs.innerHTML += `<div class="qa-msg user">${esc(q)}</div>`;
  const doc = STATE.uploadedDocs[STATE.activeDocIndex];
  setTimeout(() => {
    msgs.innerHTML += `<div class="qa-msg bot">${searchInDocument(doc.content, q)}</div>`;
    msgs.scrollTop = msgs.scrollHeight;
  }, 300);
  msgs.scrollTop = msgs.scrollHeight;
  addHistory(`Doc Q&A: ${q.substring(0,28)}…`, 'fa-comment-dots');
}

function searchInDocument(content, query) {
  const qWords = query.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>2);
  const lines  = content.split('\n').filter(l=>l.trim());
  const scored = lines.map(line => {
    const lower = line.toLowerCase();
    const score = qWords.reduce((s,w) => s+(lower.includes(w)?1:0), 0);
    return { line, score };
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);

  if (!scored.length) return `I couldn't find content matching "<b>${esc(query)}</b>". Try different keywords.`;
  const top = scored.slice(0,3).map(x=>`• ${esc(x.line.trim())}`).join('<br>');
  return `Most relevant lines from document:<br><br>${top}`;
}

// ── Card Clicks ──────────────────────────────────────────────
function bindCardClicks() {
  document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('click', () => {
      const action = card.dataset.action;
      if (action === 'logs') { openSidebar(); switchTab('docs'); return; }
      quickAction(action);
    });
    card.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') card.click(); });
  });
}

function quickAction(action) {
  if (!STATE.data) return;
  if (action === 'logs') { openSidebar(); switchTab('docs'); return; }
  injectSuggestion(action === 'medical' ? 'claims' : action);
}

// ── Chat Input ────────────────────────────────────────────────
function bindChatInput() {
  const ta = $('chatInput');
  ta.addEventListener('input', () => { ta.style.height='auto'; ta.style.height=Math.min(ta.scrollHeight,150)+'px'; });
  ta.addEventListener('keydown', e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } });
  $('chatSend').addEventListener('click', sendChat);
  $('chatAttachBtn').addEventListener('click', () => {
    openSidebar(); switchTab('docs');
    setTimeout(() => $('fileInput').click(), 150);
  });
}

// Suggestion chips — call functions directly, no regex dependency
function injectSuggestion(action) {
  const actionMap = {
    'employees':  () => { addUserMessage('Show all employees');  showTyping(); setTimeout(() => { removeTyping(); showAllEmployees(); }, 500); },
    'projects':   () => { addUserMessage('Show all projects');   showTyping(); setTimeout(() => { removeTyping(); showAllProjects(); addBotMessage(`Showing all <b>${STATE.data.projects.length-1} projects</b> above.`); }, 500); },
    'attendance': () => { addUserMessage('Attendance report');   showTyping(); setTimeout(() => { removeTyping(); showAttendanceReport(); addBotMessage('Attendance report loaded above.'); }, 500); },
    'jobs':       () => { addUserMessage('Latest jobs & hiring');showTyping(); setTimeout(() => { removeTyping(); showJobsPanel(); addBotMessage(`Found <b>${STATE.data.jobs.filter(j=>j.status==='Open').length} open positions</b>. Check the results panel.`); }, 500); },
    'claims':     () => { addUserMessage('Show medical claims'); showTyping(); setTimeout(() => { removeTyping(); showMedicalClaims(); addBotMessage('Medical claims loaded above.'); }, 500); },
    'policy':     () => { addUserMessage('Show HR policies');    showTyping(); setTimeout(() => { removeTyping(); showHRPolicies(); addBotMessage('All <b>8 HR policies</b> loaded above.'); }, 500); }
  };
  const fn = actionMap[action];
  if (fn) { fn(); return; }
  // fallback: send as text
  const ta = $('chatInput');
  ta.value = action;
  ta.focus();
  sendChat();
}

function sendChat() {
  const ta = $('chatInput');
  const msg = ta.value.trim();
  if (!msg) return;
  ta.value = ''; ta.style.height = 'auto';
  addUserMessage(msg);
  addHistory(msg.substring(0,38) + (msg.length>38?'…':''), 'fa-comment');
  showTyping();
  setTimeout(() => { removeTyping(); processChat(msg); }, 650);
}

// ── Chat Intelligence ─────────────────────────────────────────
async function processChat(msg) {
  const lower = msg.toLowerCase().trim();

    if (/\b(medical|claim|health|hospital|reimburse|opd|dental|maternity|policy|policies|leave policy|wfh|work from home|conduct|increment|salary|training|travel|expense)\b/i.test(lower)) {
    try {
        showTyping();
        let reader;
        if (activeAssistant === "hr") {
          console.log("Using HR assistant");
          reader = await askHRStream(msg);
        } else if (activeAssistant === "healthcare") {
          console.log("Using Healthcare assistant");
          reader = await askHealthCareStream(msg);
        } else {
          removeTyping();
          addBotMessage("Please select an assistant.");
          return;
        }
        
        removeTyping();
        const decoder = new TextDecoder();
        const bubble = createStreamingBotMessage();
        let completeAnswer = "";
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            completeAnswer += chunk;
            bubble.innerHTML = marked.parse(completeAnswer);
            $('chatMessages').scrollTop = $('chatMessages').scrollHeight;
        }

        return;
    } catch (error) {
        console.error(error);
        addBotMessage(
            "The information was not found."
        );
    }
  }

  // ── Greetings
  if (/^(hi|hello|hey|salam|good\s*(morning|afternoon|evening)|howdy|greetings)/i.test(lower)) {
    addBotWelcome(); return;
  }

  // ── Help
  if (/\b(help|what can you do|commands|capabilities|features)\b/i.test(lower)) {
    addBotMessage(
      `Here's what I can do:<br><br>` +
      `<b>🔍 Data Queries</b><br>` +
      `• <code>EMP001</code>–<code>EMP020</code> — employee profile<br>` +
      `• <i>show all employees</i> — full employee list<br>` +
      `• <i>show all projects</i> — all 14 projects<br><br>` +
      `<b>📊 Reports</b><br>` +
      `• <i>attendance report</i> — present/absent/leave<br>` +
      `• <i>jobs</i> or <i>hiring</i> — 14 open positions<br>` +
      `• <i>medical claims</i> — reimbursement status<br>` +
      `• <i>HR policy</i> — leave, WFH, conduct &amp; more<br><br>` +
      `<b>📄 Documents</b><br>` +
      `• Upload .txt/.csv/.json/.md in the Documents tab<br>` +
      `• Ask any question about the uploaded file`
    ); return;
  }

  // ── Employee ID (EMP001–EMP020)
  const empMatch = lower.match(/\bemp\s*0*(\d{1,3})\b/);
  if (empMatch) {
    const id = 'EMP' + String(empMatch[1]).padStart(3,'0');
    const emp = STATE.data.employees.find(e => e.id === id);
    if (emp) { addBotMessageHTML(renderEmployeeCard(emp)); return; }
    addBotMessage(`No employee found with ID <b>${esc(id)}</b>. Try EMP001–EMP020.`); return;
  }

  // ── All employees (many phrasings)
  if (/\b(show|list|get|display)\b.*\b(all\b.*\b)?(employees?|staff|team|workers?|people)\b/i.test(lower) ||
      /\ball\s+(employees?|staff|team|workers?)\b/i.test(lower) ||
      /\b(employees?|staff)\s*(list|all|table)\b/i.test(lower) ||
      lower === 'employees' || lower === 'staff' || lower === 'all employees') {
    showAllEmployees();
    return;
  }

  // ── Specific employee name search
  const empByName = STATE.data.employees.filter(e => e.name.toLowerCase().includes(lower.replace(/\b(find|show|who is|search|lookup|employee)\b/g,'').trim()));
  if (empByName.length === 1) { addBotMessageHTML(renderEmployeeCard(empByName[0])); return; }
  if (empByName.length > 1)  { addBotMessageHTML(renderEmployeeTable(empByName)); return; }

  // ── All projects
  if (/\b(all|list|show)\s*projects?\b/i.test(lower) || /\bprojects?\s*(list|all|overview)\b/i.test(lower)) {
    showAllProjects();
    addBotMessage(`Showing all <b>${STATE.data.projects.length-1} projects</b> in the results panel.`); return;
  }

  // ── Project by name
  const projMatch = STATE.data.projects.find(p =>
    p.id !== 'ALL' && (lower.includes(p.name.toLowerCase()) || lower.includes(p.id.toLowerCase()))
  );
  if (projMatch) {
    showProjectDetail(projMatch.id);
    addBotMessage(`Showing details for project <b>${esc(projMatch.name)}</b>.`); return;
  }

  // ── Attendance
  if (/\b(attend|present|absent|leave|workforce|who is (in|out|present|absent))\b/i.test(lower)) {
    showAttendanceReport();
    addBotMessage("Attendance report loaded in the results panel above."); return;
  }

  // ── How many employees
  if (/how many (employees?|staff|people|workers?)/i.test(lower)) {
    const n = STATE.data.employees.length;
    const active = STATE.data.employees.filter(e=>e.status==='Active').length;
    addBotMessage(`We have <b>${n} total employees</b>, of which <b>${active} are Active</b> and <b>${n-active} are on leave/inactive</b>.`); return;
  }

  // ── How many projects
  if (/how many projects?/i.test(lower)) {
    const n = STATE.data.projects.filter(p=>p.id!=='ALL').length;
    addBotMessage(`There are <b>${n} projects</b> in the system. Type <i>"show all projects"</i> to see them.`); return;
  }

  // ── Jobs / Hiring
  if (/\b(jobs?|hiring|recruit|vacanc|opening|position|career)\b/i.test(lower)) {
    showJobsPanel();
    const open = STATE.data.jobs.filter(j=>j.status==='Open').length;
    addBotMessage(`Found <b>${open} open positions</b>. Check the results panel.`); return;
  }

  // ── Specific job title
  const jobMatch = STATE.data.jobs.filter(j => j.title.toLowerCase().includes(lower.replace(/\b(find|show|search|job|position)\b/g,'').trim()));
  if (jobMatch.length) { addBotMessageHTML(renderJobsTable(jobMatch)); return; }

  // ── Medical Claims
  // if (/\b()\b/i.test(lower)) {
  //   showMedicalClaims();
  //   addBotMessage("Medical claims loaded. Check the results panel."); return;
  // }

  // ── HR and HealthCare Policy Assistant


  // if (/\b(policy|policies|leave policy|wfh|work from home|conduct|increment|salary|training|travel|expense)\b/i.test(lower)) {

  //   try {
  //     showTyping();
  //     const reader = await askHRStream(msg);
  //     removeTyping();
  //     const decoder = new TextDecoder();
  //     const bubble = createStreamingBotMessage();
  //     let completeAnswer = "";

  //     while (true) {
  //       const { done, value } = await reader.read();
  //       if (done) break;
  //       const chunk = decoder.decode(value);
  //       completeAnswer += chunk;
  //       bubble.innerHTML = marked.parse(completeAnswer);
  //       $('chatMessages').scrollTop = $('chatMessages').scrollHeight;
  //     }

  //     return;

  //   } catch (error) {
  //     console.error(error);
  //     addBotMessage(
  //       "The information was not found."
  //     );
  //   }
  // }

  // ── Department search
  const deptKw = lower.match(/\b(engineering|hr|finance|it|marketing|admin|operations|logistics|healthcare|design|compliance)\b/);
  if (deptKw) {
    const dept = deptKw[1].charAt(0).toUpperCase() + deptKw[1].slice(1);
    const emps = STATE.data.employees.filter(e => e.department.toLowerCase() === deptKw[1]);
    if (emps.length) {
      showResults(`Department: <b>${esc(dept)}</b>`, renderEmployeeTable(emps));
      addBotMessage(`Found <b>${emps.length} employees</b> in the <b>${esc(dept)}</b> department.`);
      return;
    }
  }

  // ── Document Q&A fallback
  if (STATE.uploadedDocs.length && STATE.activeDocIndex !== null) {
    const doc = STATE.uploadedDocs[STATE.activeDocIndex];
    const answer = searchInDocument(doc.content, msg);
    addBotMessage(`<b>From "${esc(doc.name)}":</b><br>${answer}`); return;
  }

  // ── Keyword fallback across all data
  const kw = lower.replace(/\b(find|show|search|what|who|is|the|a|an)\b/g,' ').trim();
  if (kw.length > 2) {
    const empHits = STATE.data.employees.filter(e => JSON.stringify(e).toLowerCase().includes(kw));
    if (empHits.length) { addBotMessageHTML(renderEmployeeTable(empHits)); return; }
  }

  // ── HR RAG Fallback

  showTyping();

  const ragResponse = await askHR(msg);

  removeTyping();

  if (ragResponse) {

    const answer =
      ragResponse.answer ||
      ragResponse.response ||
      ragResponse.result ||
      ragResponse.message;

    if (answer && answer.trim() !== "") {
      addBotMessage(answer);
      return;
    }
  }

  // ── Final fallback

  addBotMessage("The information was not found.");
}

function filterBySelectedProjects(employees) {
  if (!STATE.selectedProjects.size) return employees;
  return employees.filter(e => STATE.selectedProjects.has(e.project));
}

// ── Chat render helpers ───────────────────────────────────────
function addUserMessage(text) {
  const wrap = $('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-msg user';
  div.innerHTML = `
    <div class="chat-avatar user"><i class="fa-solid fa-user"></i></div>
    <div class="chat-bubble">${esc(text)}</div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function addBotMessage(html) {
  removeTyping();
  const wrap = $('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.innerHTML = `
    <div class="chat-avatar bot"><i class="fa-solid fa-robot"></i></div>
    <div class="chat-bubble">${html}</div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function addBotMessageHTML(html) {
  removeTyping();
  const wrap = $('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.style.cssText = 'max-width:100%;width:100%';
  div.innerHTML = `
    <div class="chat-avatar bot"><i class="fa-solid fa-robot"></i></div>
    <div class="chat-bubble" style="max-width:100%">${html}</div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function showTyping() {
  const wrap = $('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-msg bot'; div.id = 'typingIndicator';
  div.innerHTML = `
    <div class="chat-avatar bot"><i class="fa-solid fa-robot"></i></div>
    <div class="chat-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function removeTyping() { $('typingIndicator')?.remove(); }

// ── Results Panel ─────────────────────────────────────────────
function showResults(titleHTML, contentHTML) {
  $('resultsPanelTitle').innerHTML = titleHTML;
  $('resultsPanelContent').innerHTML = contentHTML;
  $('resultsPanel').style.display = 'block';
  $('mainContent').scrollTo({ top: 0, behavior: 'smooth' });
}

function bindResultsClose() {
  $('btnCloseResults').addEventListener('click', () => { $('resultsPanel').style.display = 'none'; });
}

function noResults(msg = 'No matching records found.') {
  return `<p style="text-align:center;padding:30px;color:#9ca3af;font-size:13px"><i class="fa-solid fa-circle-info"></i> ${msg}</p>`;
}

// ── Render: Projects Table ────────────────────────────────────
function renderProjectsTable(projs) {
  const rows = projs.map(p => `<tr>
    <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${esc(p.color)};margin-right:7px;vertical-align:middle"></span><b>${esc(p.name)}</b></td>
    <td>${esc(p.env)}</td>
    <td>${esc(p.lead)}</td>
    <td>${p.team}</td>
    <td>${statusBadge(p.status)}</td>
  </tr>`).join('');
  return `<div class="data-table-wrap"><table class="data-table">
    <thead><tr><th>Project</th><th>Environment</th><th>Lead</th><th>Team Size</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

// ── Render: Employee Card ─────────────────────────────────────
function renderEmployeeCard(emp) {
  const initials = emp.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
  const pct = n => Math.round((n/emp.attendance.total)*100);
  const proj = STATE.data.projects.find(p => p.id === emp.project);
  return `
    <div class="emp-card">
      <div class="emp-avatar">${esc(initials)}</div>
      <div class="emp-info">
        <h3>${esc(emp.name)}</h3>
        <div class="emp-pos">${esc(emp.position)} · ${esc(emp.department)}</div>
        <div class="emp-meta">
          <span class="emp-meta-item"><i class="fa-solid fa-id-badge" style="color:#7c3aed"></i> ${esc(emp.id)}</span>
          <span class="emp-meta-item"><i class="fa-solid fa-envelope" style="color:#3b82f6"></i> ${esc(emp.email)}</span>
          <span class="emp-meta-item"><i class="fa-solid fa-phone" style="color:#10b981"></i> ${esc(emp.phone)}</span>
          <span class="emp-meta-item"><i class="fa-solid fa-calendar" style="color:#f59e0b"></i> Joined: ${esc(emp.joinDate)}</span>
          <span class="emp-meta-item"><i class="fa-solid fa-diagram-project" style="color:#a855f7"></i> ${esc(proj?.name||emp.project)}</span>
          <span class="emp-meta-item"><i class="fa-solid fa-money-bill" style="color:#10b981"></i> PKR ${emp.salary.toLocaleString()}/mo</span>
          ${statusBadge(emp.status)}
        </div>
      </div>
      <div class="emp-attendance">
        <div style="font-size:11px;font-weight:700;color:#6b7280;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Attendance (${emp.attendance.total} days)</div>
        ${['present','absent','leave'].map(k=>{
          const colors={present:'#10b981',absent:'#ef4444',leave:'#f59e0b'};
          return `<div class="att-bar-group">
            <div class="att-bar-label"><span>${k.charAt(0).toUpperCase()+k.slice(1)}</span><span>${emp.attendance[k]}</span></div>
            <div class="att-bar"><div class="att-bar-fill" style="width:${pct(emp.attendance[k])}%;background:${colors[k]}"></div></div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

// ── Render: Employee Table ────────────────────────────────────
function renderEmployeeTable(emps) {
  const rows = emps.map(e => {
    const proj = STATE.data.projects.find(p=>p.id===e.project);
    return `<tr>
      <td><b>${esc(e.id)}</b></td>
      <td>${esc(e.name)}</td>
      <td>${esc(e.department)}</td>
      <td>${esc(e.position)}</td>
      <td>${esc(proj?.name||e.project)}</td>
      <td>${statusBadge(e.status)}</td>
      <td style="color:#10b981;font-weight:600">${e.attendance.present}/${e.attendance.total}</td>
    </tr>`;
  }).join('');
  return `<div class="data-table-wrap"><table class="data-table">
    <thead><tr><th>ID</th><th>Name</th><th>Dept</th><th>Position</th><th>Project</th><th>Status</th><th>Att.</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

// ── Show: All Employees ───────────────────────────────────────
function showAllEmployees() {
  const all = STATE.data.employees;   // always ALL 20, never filtered here
  const active   = all.filter(e => e.status === 'Active').length;
  const onLeave  = all.filter(e => e.status === 'On Leave').length;
  const html = `
    <div class="summary-cards" style="margin-bottom:14px">
      <div class="summary-card"><div class="sc-icon">👥</div><div class="sc-val">${all.length}</div><div class="sc-label">Total</div></div>
      <div class="summary-card"><div class="sc-icon" style="color:#10b981">✅</div><div class="sc-val" style="color:#10b981">${active}</div><div class="sc-label">Active</div></div>
      <div class="summary-card"><div class="sc-icon" style="color:#f59e0b">🏖️</div><div class="sc-val" style="color:#f59e0b">${onLeave}</div><div class="sc-label">On Leave</div></div>
      <div class="summary-card"><div class="sc-icon" style="color:#3b82f6">🏢</div><div class="sc-val" style="color:#3b82f6">${[...new Set(all.map(e=>e.project))].length}</div><div class="sc-label">Projects</div></div>
    </div>
    ${renderEmployeeTable(all)}`;
  showResults(`👥 All Employees (${all.length})`, html);
  addBotMessage(`Here are all <b>${all.length} employees</b> — ${active} active, ${onLeave} on leave.`);
  addHistory('All Employees', 'fa-users');
}

// ── Show: All Projects ────────────────────────────────────────
function showAllProjects() {
  const projs = STATE.data.projects.filter(p=>p.id!=='ALL');
  const active = projs.filter(p=>p.status==='Active').length;
  const html = `
    <div class="summary-cards" style="margin-bottom:14px">
      <div class="summary-card"><div class="sc-icon">🏢</div><div class="sc-val">${projs.length}</div><div class="sc-label">Total Projects</div></div>
      <div class="summary-card"><div class="sc-icon" style="color:#10b981">✅</div><div class="sc-val" style="color:#10b981">${active}</div><div class="sc-label">Active</div></div>
      <div class="summary-card"><div class="sc-icon" style="color:#f59e0b">⏸️</div><div class="sc-val" style="color:#f59e0b">${projs.length-active}</div><div class="sc-label">Paused/Hold</div></div>
      <div class="summary-card"><div class="sc-icon">👥</div><div class="sc-val">${STATE.data.employees.length}</div><div class="sc-label">Employees</div></div>
    </div>
    ${renderProjectsTable(projs)}`;
  showResults('🏢 All Projects', html);
  addHistory('All Projects', 'fa-diagram-project');
}

// ── Show: Attendance ──────────────────────────────────────────
function showAttendanceReport() {
  if (!STATE.data) return;
  const sum = STATE.data.attendanceData.summary;
  const monthly = STATE.data.attendanceData.monthly;

  const empRows = STATE.data.employees.map(e => {
    const pct = Math.round((e.attendance.present/e.attendance.total)*100);
    const bar = `<div style="display:flex;align-items:center;gap:6px">
      <div style="flex:1;height:5px;background:#f3f4f6;border-radius:99px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${pct>=90?'#10b981':pct>=70?'#f59e0b':'#ef4444'};border-radius:99px"></div>
      </div><span style="font-size:10px;color:#6b7280;min-width:30px">${pct}%</span></div>`;
    return `<tr>
      <td><b>${esc(e.id)}</b></td>
      <td>${esc(e.name)}</td>
      <td>${esc(e.department)}</td>
      <td style="color:#10b981;font-weight:600">${e.attendance.present}</td>
      <td style="color:#ef4444;font-weight:600">${e.attendance.absent}</td>
      <td style="color:#f59e0b;font-weight:600">${e.attendance.leave}</td>
      <td>${e.attendance.total}</td>
      <td style="min-width:120px">${bar}</td>
    </tr>`;
  }).join('');

  const monthRows = monthly.map(m=>`<tr>
    <td><b>${esc(m.month)}</b></td>
    <td style="color:#10b981">${m.present}</td>
    <td style="color:#ef4444">${m.absent}</td>
    <td style="color:#f59e0b">${m.leave}</td>
  </tr>`).join('');

  const html = `
    <div class="summary-cards">
      <div class="summary-card"><div class="sc-icon">👥</div><div class="sc-val">${sum.totalEmployees}</div><div class="sc-label">Total</div></div>
      <div class="summary-card"><div class="sc-icon" style="color:#10b981">✅</div><div class="sc-val" style="color:#10b981">${sum.presentToday}</div><div class="sc-label">Present</div></div>
      <div class="summary-card"><div class="sc-icon" style="color:#ef4444">❌</div><div class="sc-val" style="color:#ef4444">${sum.absentToday}</div><div class="sc-label">Absent</div></div>
      <div class="summary-card"><div class="sc-icon" style="color:#f59e0b">🏖️</div><div class="sc-val" style="color:#f59e0b">${sum.onLeave}</div><div class="sc-label">On Leave</div></div>
    </div>
    <div class="data-table-wrap" style="margin-top:14px">
      <table class="data-table">
        <thead><tr><th>ID</th><th>Name</th><th>Dept</th><th>Present</th><th>Absent</th><th>Leave</th><th>Total</th><th>Rate</th></tr></thead>
        <tbody>${empRows}</tbody>
      </table>
    </div>
    <div style="margin-top:14px">
      <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:8px">📅 Monthly Summary</div>
      <div class="data-table-wrap">
        <table class="data-table">
          <thead><tr><th>Month</th><th>Present</th><th>Absent</th><th>Leave</th></tr></thead>
          <tbody>${monthRows}</tbody>
        </table>
      </div>
    </div>`;
  showResults('📅 Attendance Report', html);
  addHistory('Attendance Report','fa-calendar-check');
}

// ── Show: Jobs ────────────────────────────────────────────────
function showJobsPanel() {
  const open = STATE.data.jobs.filter(j=>j.status==='Open').length;
  const html = `
    <div class="summary-cards" style="margin-bottom:14px">
      <div class="summary-card"><div class="sc-icon">💼</div><div class="sc-val">${STATE.data.jobs.length}</div><div class="sc-label">Total Jobs</div></div>
      <div class="summary-card"><div class="sc-icon" style="color:#10b981">🟢</div><div class="sc-val" style="color:#10b981">${open}</div><div class="sc-label">Open</div></div>
      <div class="summary-card"><div class="sc-icon" style="color:#6b7280">🔒</div><div class="sc-val" style="color:#6b7280">${STATE.data.jobs.length-open}</div><div class="sc-label">Closed</div></div>
    </div>
    ${renderJobsTable(STATE.data.jobs)}`;
  showResults('💼 Latest Jobs &amp; Hiring', html);
  addHistory('Jobs & Hiring','fa-briefcase');
}

function renderJobsTable(jobs) {
  const rows = jobs.map(j => {
    const proj = STATE.data.projects.find(p=>p.id===j.project);
    return `<tr>
      <td><b>${esc(j.id)}</b></td>
      <td><b>${esc(j.title)}</b><br><span style="font-size:10.5px;color:#6b7280">${esc(j.description)}</span></td>
      <td>${esc(j.department)}</td>
      <td>${esc(proj?.name||j.project)}</td>
      <td><span class="badge badge-blue">${esc(j.type)}</span></td>
      <td><i class="fa-solid fa-location-dot" style="color:#f59e0b"></i> ${esc(j.location)}</td>
      <td>${esc(j.deadline)}</td>
      <td>${statusBadge(j.status)}</td>
    </tr>`;
  }).join('');
  return `<div class="data-table-wrap"><table class="data-table">
    <thead><tr><th>ID</th><th>Title</th><th>Dept</th><th>Project</th><th>Type</th><th>Location</th><th>Deadline</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

// ── Show: Medical Claims ──────────────────────────────────────
function showMedicalClaims() {
  const claims   = STATE.data.medicalClaims;
  const total    = claims.reduce((s,c)=>s+c.amount,0);
  const approved = claims.filter(c=>c.status==='Approved').reduce((s,c)=>s+c.amount,0);
  const pending  = claims.filter(c=>['Pending','Processing'].includes(c.status)).reduce((s,c)=>s+c.amount,0);
  const html = `
    <div class="summary-cards">
      <div class="summary-card"><div class="sc-icon">🏥</div><div class="sc-val">${claims.length}</div><div class="sc-label">Total Claims</div></div>
      <div class="summary-card"><div class="sc-icon" style="color:#10b981">💰</div><div class="sc-val" style="color:#10b981;font-size:17px">PKR ${(approved/1000).toFixed(0)}K</div><div class="sc-label">Approved</div></div>
      <div class="summary-card"><div class="sc-icon" style="color:#f59e0b">⏳</div><div class="sc-val" style="color:#f59e0b;font-size:17px">PKR ${(pending/1000).toFixed(0)}K</div><div class="sc-label">Pending</div></div>
      <div class="summary-card"><div class="sc-icon">📊</div><div class="sc-val" style="font-size:17px">PKR ${(total/1000).toFixed(0)}K</div><div class="sc-label">Total</div></div>
    </div>
    <div style="margin-top:14px">${renderClaimsTable(claims)}</div>`;
  showResults('🏥 Medical Claim Information', html);
  addHistory('Medical Claims','fa-file-medical');
}

function renderClaimsTable(claims) {
  const rows = claims.map(c=>`<tr>
    <td><b>${esc(c.id)}</b></td>
    <td>${esc(c.empName)}<br><span style="font-size:10px;color:#9ca3af">${esc(c.empId)}</span></td>
    <td><span class="badge badge-blue">${esc(c.type)}</span></td>
    <td><b>PKR ${c.amount.toLocaleString()}</b></td>
    <td>${esc(c.date)}</td>
    <td>${esc(c.hospital)}</td>
    <td style="max-width:180px;font-size:11px">${esc(c.description)}</td>
    <td>${statusBadge(c.status)}</td>
  </tr>`).join('');
  return `<div class="data-table-wrap"><table class="data-table">
    <thead><tr><th>ID</th><th>Employee</th><th>Type</th><th>Amount</th><th>Date</th><th>Hospital</th><th>Description</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

// ── Show: HR Policies ─────────────────────────────────────────
function showHRPolicies() {
  const policies = STATE.data.hrPolicies;
  const catColors = { Leave:'#3b82f6', Operations:'#10b981', Compliance:'#ef4444', Benefits:'#10b981', HR:'#7c3aed', Finance:'#f59e0b' };
  const catIcons  = { Leave:'fa-calendar-minus', Operations:'fa-laptop-house', Compliance:'fa-shield-halved', Benefits:'fa-gift', HR:'fa-user-tie', Finance:'fa-coins' };

  const cards = policies.map(p => {
    const color = catColors[p.category] || '#6b7280';
    const icon  = catIcons[p.category]  || 'fa-file-lines';
    return `
      <div style="background:#fff;border:1px solid #e5e7eb;border-left:4px solid ${esc(color)};border-radius:12px;padding:16px 18px;box-shadow:0 1px 4px rgba(0,0,0,.05)">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div style="width:36px;height:36px;border-radius:8px;background:${esc(color)}18;display:grid;place-items:center;flex-shrink:0">
            <i class="fa-solid ${esc(icon)}" style="color:${esc(color)};font-size:15px"></i>
          </div>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:700;color:#111827">${esc(p.title)}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:3px">
              <span class="badge badge-purple" style="font-size:10px">${esc(p.category)}</span>
              <span style="font-size:10.5px;color:#9ca3af"><i class="fa-regular fa-clock"></i> Updated: ${esc(p.lastUpdated)}</span>
            </div>
          </div>
          <span style="font-size:10.5px;font-weight:700;color:#9ca3af">${esc(p.id)}</span>
        </div>
        <div style="font-size:13px;color:#374151;line-height:1.7;background:#f9fafb;border-radius:8px;padding:10px 14px;border:1px solid #f3f4f6">
          ${esc(p.content)}
        </div>
      </div>`;
  }).join('');

  const html = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:12px">
      ${cards}
    </div>`;

  showResults('📋 HR Policies', html);
  addHistory('HR Policies', 'fa-book');
}

function renderPoliciesTable(policies) {
  const rows = policies.map(p=>`<tr>
    <td><b>${esc(p.id)}</b></td>
    <td><b>${esc(p.title)}</b></td>
    <td><span class="badge badge-purple">${esc(p.category)}</span></td>
    <td style="font-size:12px;line-height:1.6;min-width:200px">${esc(p.content)}</td>
    <td style="font-size:11px;color:#9ca3af;white-space:nowrap">${esc(p.lastUpdated)}</td>
  </tr>`).join('');
  return `<div class="data-table-wrap"><table class="data-table">
    <thead><tr><th>ID</th><th>Title</th><th>Category</th><th>Content</th><th>Updated</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

// ── History ───────────────────────────────────────────────────
function addHistory(text, icon = 'fa-clock', callback = null) {
  STATE.history.unshift({ text, icon, time: now(), callback });
  updateHistBadge();
  renderHistory();
}

function renderHistory() {
  const list = $('historyList');
  if (!STATE.history.length) {
    list.innerHTML = `<div class="history-empty"><i class="fa-regular fa-clock"></i><p>No recent activity yet</p></div>`;
    return;
  }
  list.innerHTML = STATE.history.slice(0,25).map((h,i) => `
    <div class="history-item" onclick="replayHistory(${i})" title="Click to replay">
      <i class="fa-solid ${esc(h.icon)}"></i>
      <span class="history-item-text">${esc(h.text)}</span>
      <span class="history-item-time">${esc(h.time)}</span>
    </div>`).join('');
}

function replayHistory(i) {
  const h = STATE.history[i];
  if (h?.callback) { h.callback(); toast('Replayed: ' + h.text.substring(0,30), 'info'); }
}

function updateHistBadge() {
  const badge = $('histBadge');
  const n = STATE.history.length;
  badge.style.display = n ? '' : 'none';
  badge.textContent = n > 99 ? '99+' : n;
}

// ── Top Bar Actions ───────────────────────────────────────────
function bindTopActions() {
  $('btnNewChat').addEventListener('click', () => {
    $('chatMessages').innerHTML = '';
    $('resultsPanel').style.display = 'none';
    addBotWelcome();
    toast('New chat started.','success','fa-check');
  });

  $('btnClearHistory').addEventListener('click', () => {
    STATE.history = [];
    updateHistBadge();
    renderHistory();
    toast('History cleared.','info','fa-trash-can');
  });

  $('btnUpdateNotes').addEventListener('click', () => {
    openModal('📝 Update Notes — v3.0', `
      <p style="font-size:13px;line-height:1.7;color:#374151;margin-bottom:12px"><b>v3.0 — Jul 2026</b></p>
      <ul style="padding-left:18px;font-size:13px;line-height:2.1;color:#4b5563;margin-bottom:16px">
        <li>14 projects: Ethisalat, System Limited, CelcomDigi, STZA, Glap-Plus, HEC, PTCL, Jazz, NetSol, FBR, NADRA, OGDCL, PMSA, NLC</li>
        <li>20 employees across all projects with salary data</li>
        <li>14 job openings · 10 medical claims · 8 HR policies</li>
        <li>Smart chat: employee ID, name, dept, project, keyword search</li>
        <li>Clickable history log with replay — badges on tabs</li>
        <li>Hero suggestion chips + 5 quick-action chat buttons</li>
        <li>Document upload with analytics &amp; Q&amp;A (txt/csv/json/md)</li>
      </ul>
      <a href="prompts.html" target="_blank" style="display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;padding:10px 16px;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none">
        <i class="fa-solid fa-book-open"></i> Open Full Prompt Reference Guide →
      </a>`);
  });
}

// ── Modal ─────────────────────────────────────────────────────
function bindModal() {
  $('modalClose').addEventListener('click', closeModal);
  $('modalOverlay').addEventListener('click', e => { if (e.target === $('modalOverlay')) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key==='Escape') closeModal(); });
}

function openModal(title, bodyHTML) {
  $('modalContent').innerHTML = `<h2>${title}</h2>${bodyHTML}`;
  $('modalOverlay').classList.add('active');
}

function closeModal() { $('modalOverlay').classList.remove('active'); }

// ── Boot ──────────────────────────────────────────────────────
loadData();
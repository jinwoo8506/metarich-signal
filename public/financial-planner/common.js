/* ═══════════════════════════════════════════════
   MetaRich Signal Group — Financial Consulting System
   common.js  |  공통 데이터 레이어 (localStorage)
═══════════════════════════════════════════════ */

const FS = {
  /* ─── 고객 저장/불러오기 ─── */
  saveClient(data) {
    const all = this.getAllClients();
    all[data.id] = { ...data, updatedAt: new Date().toISOString() };
    localStorage.setItem('fs_clients', JSON.stringify(all));
  },
  getClient(id) {
    return this.getAllClients()[id] || null;
  },
  getAllClients() {
    try { return JSON.parse(localStorage.getItem('fs_clients') || '{}'); } catch { return {}; }
  },
  deleteClient(id) {
    const all = this.getAllClients();
    delete all[id];
    localStorage.setItem('fs_clients', JSON.stringify(all));
  },
  /* ─── 현재 활성 고객 ─── */
  setActive(id) { localStorage.setItem('fs_active', id); },
  getActive() {
    const id = localStorage.getItem('fs_active');
    return id ? this.getClient(id) : null;
  },
  /* ─── 섹션별 데이터 저장 ─── */
  saveSection(clientId, section, data) {
    const client = this.getClient(clientId);
    if (!client) return;
    client[section] = data;
    this.saveClient(client);
  },
  getSection(clientId, section) {
    const client = this.getClient(clientId);
    return client ? (client[section] || null) : null;
  },
  /* ─── 완료 섹션 트래킹 ─── */
  markDone(clientId, section) {
    const client = this.getClient(clientId);
    if (!client) return;
    if (!client.done) client.done = [];
    if (!client.done.includes(section)) client.done.push(section);
    this.saveClient(client);
  },
  isDone(clientId, section) {
    const client = this.getClient(clientId);
    return client && client.done && client.done.includes(section);
  },
  /* ─── 연금 역산 계산기 ─── */
  calcPension: {
    /* 목표 수령액 → 필요 적립 월납 */
    targetToMonthly(targetMonthly, startAge, pensionAge, rate = 0.035) {
      const months = (pensionAge - startAge) * 12;
      const monthRate = rate / 12;
      const annuityFactor = (Math.pow(1 + monthRate, months) - 1) / monthRate;
      // 종신 25년 수령 기준
      const pvFactor = (1 - Math.pow(1 + monthRate, -300)) / monthRate;
      const requiredFV = targetMonthly * pvFactor;
      return Math.ceil(requiredFV / annuityFactor);
    },
    /* 월납 → 예상 수령액 */
    monthlyToTarget(monthly, startAge, pensionAge, rate = 0.035) {
      const months = (pensionAge - startAge) * 12;
      const monthRate = rate / 12;
      const fv = monthly * ((Math.pow(1 + monthRate, months) - 1) / monthRate);
      const pvFactor = (1 - Math.pow(1 + monthRate, -300)) / monthRate;
      return Math.floor(fv / pvFactor);
    },
    /* 세액공제 계산 */
    taxCredit(annual, income) {
      const rate = income <= 55000000 ? 0.165 : 0.132;
      return Math.min(annual, 9000000) * rate;
    }
  }
};

/* ─── 공통 네비게이션 렌더 ─── */
function renderNav(activePage) {
  const pages = [
    { id:'index',   icon:'🏠', label:'대시보드',   file:'index.html' },
    { id:'risk',    icon:'🛡️', label:'위험관리',   file:'01_risk.html' },
    { id:'pension', icon:'🌅', label:'연금설계',   file:'02_pension.html' },
    { id:'tax',     icon:'💸', label:'절세전략',   file:'03_tax.html' },
    { id:'realty',  icon:'🏢', label:'부동산',     file:'04_realestate.html' },
    { id:'inherit',    icon:'📜', label:'상속·증여',  file:'05_inheritance.html' },
    { id:'retirement', icon:'🏦', label:'퇴직설계',   file:'07_retirement.html' },
    { id:'investment', icon:'📈', label:'투자설계',   file:'08_investment.html' },
    { id:'report',     icon:'📊', label:'종합리포트', file:'06_portfolio.html' },
  ];
  const client = FS.getActive();
  const clientName = client ? client.name + ' 고객님' : '고객 미선택';

  return `
  <nav id="fsNav">
    <div class="nav-brand">
      <span class="nav-logo">MR<span>SG</span></span>
      <span class="nav-title">MetaRich Signal</span>
    </div>
    <div class="nav-client" onclick="location.href='index.html'">
      <span class="nav-client-icon">👤</span>
      <span class="nav-client-name">${clientName}</span>
    </div>
    <ul class="nav-list">
      ${pages.map(p => {
        const done = client && FS.isDone(client.id, p.id);
        return `<li class="nav-item ${p.id === activePage ? 'active' : ''} ${done ? 'done' : ''}"
          onclick="location.href='${p.file}'">
          <span class="nav-icon">${p.icon}</span>
          <span class="nav-label">${p.label}</span>
          ${done ? '<span class="nav-check">✓</span>' : ''}
        </li>`;
      }).join('')}
    </ul>
    <div class="nav-footer">배진우 팀장 AFPK<br><small>메타리치 시그널그룹</small></div>
  </nav>`;
}

/* ─── 공통 CSS 문자열 (nav + layout) ─── */
const COMMON_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&family=Montserrat:wght@400;700;900&display=swap');
  :root {
    --primary:#1a3a6e; --primary-mid:#2563eb; --primary-light:#dbeafe;
    --accent:#0ea5e9; --mint:#10b981; --gold:#f59e0b; --red:#ef4444;
    --purple:#7c3aed; --teal:#0d9488;
    --bg:#f0f4ff; --white:#fff;
    --gray100:#f1f5f9; --gray200:#e2e8f0; --gray400:#94a3b8;
    --gray600:#475569; --gray800:#1e293b;
    --nav-w:220px;
    --shadow:0 4px 24px rgba(26,58,110,.10);
    --shadow-lg:0 8px 40px rgba(26,58,110,.18);
    --radius:16px; --radius-sm:10px;
  }
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Noto Sans KR',sans-serif;background:var(--bg);color:var(--gray800);
    display:flex;min-height:100vh;}

  /* NAV */
  #fsNav{
    width:var(--nav-w);min-height:100vh;background:var(--primary);
    display:flex;flex-direction:column;position:fixed;top:0;left:0;z-index:200;
    box-shadow:4px 0 24px rgba(0,0,0,.18);
  }
  .nav-brand{display:flex;align-items:center;gap:10px;padding:22px 20px 16px;
    border-bottom:1px solid rgba(255,255,255,.1);}
  .nav-logo{font-family:'Montserrat',sans-serif;font-weight:900;font-size:18px;
    background:linear-gradient(135deg,#fff,var(--accent));-webkit-background-clip:text;
    -webkit-text-fill-color:transparent;}
  .nav-logo span{color:var(--accent);}
  .nav-title{font-size:11px;color:rgba(255,255,255,.5);font-weight:300;letter-spacing:.5px;}
  .nav-client{display:flex;align-items:center;gap:8px;padding:12px 20px;
    background:rgba(255,255,255,.08);margin:12px;border-radius:var(--radius-sm);
    cursor:pointer;transition:.2s;}
  .nav-client:hover{background:rgba(255,255,255,.14);}
  .nav-client-icon{font-size:16px;}
  .nav-client-name{font-size:12px;color:rgba(255,255,255,.85);font-weight:500;white-space:nowrap;
    overflow:hidden;text-overflow:ellipsis;}
  .nav-list{list-style:none;padding:8px 0;flex:1;}
  .nav-item{display:flex;align-items:center;gap:10px;padding:11px 20px;
    cursor:pointer;transition:.18s;position:relative;color:rgba(255,255,255,.6);font-size:13px;}
  .nav-item:hover{color:#fff;background:rgba(255,255,255,.08);}
  .nav-item.active{color:#fff;background:rgba(255,255,255,.15);}
  .nav-item.active::before{content:'';position:absolute;left:0;top:0;bottom:0;
    width:3px;background:var(--accent);border-radius:0 2px 2px 0;}
  .nav-item.done{color:rgba(255,255,255,.75);}
  .nav-icon{font-size:16px;width:20px;text-align:center;}
  .nav-check{margin-left:auto;color:var(--mint);font-size:12px;font-weight:700;}
  .nav-footer{padding:16px 20px;border-top:1px solid rgba(255,255,255,.1);
    font-size:11px;color:rgba(255,255,255,.4);line-height:1.6;}

  /* MAIN */
  .fs-main{margin-left:var(--nav-w);flex:1;padding:36px 40px;max-width:calc(100% - var(--nav-w));}
  .page-header{margin-bottom:32px;}
  .page-title{font-family:'Montserrat',sans-serif;font-size:28px;font-weight:900;
    color:var(--primary);letter-spacing:-.5px;}
  .page-title span{color:var(--accent);}
  .page-sub{font-size:14px;color:var(--gray400);margin-top:4px;}

  /* CARD */
  .card{background:var(--white);border-radius:var(--radius);box-shadow:var(--shadow);padding:28px 32px;margin-bottom:24px;}
  .card-title{font-size:16px;font-weight:700;color:var(--primary);margin-bottom:18px;
    display:flex;align-items:center;gap:8px;}
  .card-title::before{content:'';display:inline-block;width:3px;height:18px;
    background:linear-gradient(180deg,var(--accent),var(--primary-mid));border-radius:2px;}

  /* FORM */
  .form-grid{display:grid;gap:16px;}
  .form-row-2{grid-template-columns:1fr 1fr;}
  .form-row-3{grid-template-columns:1fr 1fr 1fr;}
  .form-row-4{grid-template-columns:repeat(4,1fr);}
  .fg label{display:block;font-size:12px;font-weight:600;color:var(--gray600);
    margin-bottom:5px;letter-spacing:.3px;}
  .fg input,.fg select,.fg textarea{
    width:100%;padding:10px 14px;border:1.5px solid var(--gray200);
    border-radius:var(--radius-sm);font-family:'Noto Sans KR',sans-serif;
    font-size:14px;color:var(--gray800);background:var(--gray100);outline:none;transition:.2s;}
  .fg input:focus,.fg select:focus,.fg textarea:focus{border-color:var(--primary-mid);background:#fff;}
  .fg textarea{resize:vertical;min-height:80px;}

  /* BUTTONS */
  .btn{padding:10px 22px;border-radius:var(--radius-sm);border:none;
    font-family:'Noto Sans KR',sans-serif;font-size:14px;font-weight:600;
    cursor:pointer;transition:.2s;display:inline-flex;align-items:center;gap:6px;}
  .btn:hover{transform:translateY(-1px);}
  .btn-primary{background:linear-gradient(135deg,var(--primary-mid),var(--primary));color:#fff;}
  .btn-primary:hover{box-shadow:0 4px 16px rgba(37,99,235,.3);}
  .btn-accent{background:linear-gradient(135deg,var(--accent),var(--primary-mid));color:#fff;}
  .btn-ghost{background:var(--gray100);color:var(--gray600);border:1.5px solid var(--gray200);}
  .btn-success{background:linear-gradient(135deg,var(--mint),#059669);color:#fff;}

  /* BADGE */
  .badge{display:inline-block;padding:4px 10px;border-radius:99px;font-size:11px;font-weight:700;}
  .badge-blue{background:#dbeafe;color:var(--primary-mid);}
  .badge-green{background:#d1fae5;color:#059669;}
  .badge-gold{background:#fef3c7;color:#92400e;}
  .badge-red{background:#fee2e2;color:#dc2626;}
  .badge-purple{background:#ede9fe;color:var(--purple);}

  /* TABS */
  .tab-bar{display:flex;gap:4px;background:var(--gray100);padding:4px;border-radius:var(--radius-sm);margin-bottom:24px;width:fit-content;}
  .tab-btn{padding:8px 20px;border-radius:8px;border:none;font-family:'Noto Sans KR',sans-serif;
    font-size:13px;font-weight:600;cursor:pointer;transition:.2s;color:var(--gray600);background:transparent;}
  .tab-btn.active{background:var(--white);color:var(--primary);box-shadow:0 2px 8px rgba(0,0,0,.08);}
  .tab-content{display:none;animation:fadeIn .25s ease;}
  .tab-content.active{display:block;}

  /* RESULT BOX */
  .result-box{background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border:1.5px solid #bae6fd;
    border-radius:var(--radius);padding:22px 28px;margin-bottom:24px;}
  .result-highlight{font-size:28px;font-weight:900;color:var(--primary);font-family:'Montserrat',sans-serif;}
  .result-label{font-size:12px;color:var(--gray400);margin-bottom:4px;}

  /* MODAL */
  .modal-overlay{display:none;position:fixed;inset:0;background:rgba(15,23,42,.55);
    z-index:1000;backdrop-filter:blur(4px);justify-content:center;align-items:center;}
  .modal-overlay.open{display:flex;}
  .modal{background:var(--white);border-radius:var(--radius);padding:36px;max-width:600px;
    width:94%;box-shadow:0 24px 80px rgba(0,0,0,.22);animation:modalIn .3s cubic-bezier(.34,1.56,.64,1);
    position:relative;max-height:88vh;overflow-y:auto;}
  @keyframes modalIn{from{opacity:0;transform:scale(.92) translateY(20px)}to{opacity:1;transform:none}}
  .modal-close{position:absolute;top:14px;right:14px;background:var(--gray100);border:none;
    border-radius:50%;width:30px;height:30px;font-size:14px;cursor:pointer;
    display:flex;align-items:center;justify-content:center;color:var(--gray600);}
  .modal-close:hover{background:var(--gray200);}

  @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  @media(max-width:900px){
    #fsNav{width:60px;}
    .nav-title,.nav-client-name,.nav-label,.nav-footer,.nav-check{display:none;}
    .nav-client{padding:10px;justify-content:center;}
    .nav-item{padding:14px;justify-content:center;}
    .fs-main{margin-left:60px;padding:20px;}
  }
`;

/* ═══════════════════════════════════════════════
   콤마 입력 유틸리티
   사용법:
   HTML:  <input type="text" id="myInput" data-comma oninput="onCommaInput(this)" placeholder="1,000,000">
   JS:    getVal('myInput')  →  실제 숫자값 반환
   JS:    setVal('myInput', 1000000)  →  콤마 포함 표시
═══════════════════════════════════════════════ */
function onCommaInput(el) {
  const raw  = el.value.replace(/[^0-9]/g, '');
  const num  = parseInt(raw, 10);
  el.value   = isNaN(num) ? '' : num.toLocaleString();
  // oninput에 추가 콜백이 있으면 실행
  const cb = el.dataset.cb;
  if (cb && window[cb]) window[cb]();
}

function getVal(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  const raw = el.value.replace(/[^0-9]/g, '');
  return raw ? parseInt(raw, 10) : 0;
}

function setVal(id, num) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = num ? parseInt(num).toLocaleString() : '';
}

/* 페이지 로드 후 data-comma 속성 가진 input 자동 바인딩 */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('input[data-comma]').forEach(el => {
    // 초기값이 있으면 콤마 포맷으로 변환
    if (el.value) {
      const n = parseInt(el.value.replace(/[^0-9]/g,''), 10);
      if (!isNaN(n)) el.value = n.toLocaleString();
    }
  });
});

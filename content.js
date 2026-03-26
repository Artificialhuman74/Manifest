if (!window.__pesuDL) {
  window.__pesuDL = true;

  /* ── utils ─────────────────────────────────────────────── */
  const sleep  = ms => new Promise(r => setTimeout(r, ms));
  const qs     = (s, ctx = document) => ctx.querySelector(s);
  const qsa    = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));


  // Safe sendMessage — catches "Extension context invalidated" (happens when
  // the extension is reloaded while the tab is still open)
  function send(msg, cb) {
    try {
      chrome.runtime.sendMessage(msg, cb);
    } catch (e) {
      if (e.message && e.message.includes('Extension context invalidated')) {
        showReloadPrompt();
      }
    }
  }

  function showReloadPrompt() {
    if (!panel) return;
    panel.classList.add('show');
    bdy.innerHTML = `<div class="hint">
      <b>Extension reloaded</b>
      Please reload this page (⌘R) and click the extension icon again.
    </div>`;
  }

  /* ── shadow host ────────────────────────────────────────── */
  const host   = document.createElement('div');
  host.style.cssText = 'position:fixed;z-index:2147483647;top:0;left:0;pointer-events:none;';
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
    #p{
      pointer-events:all;
      position:fixed;top:50%;right:20px;
      transform:translateY(-50%);
      width:310px;
      background:#0F172A;
      border:1px solid rgba(255,255,255,0.1);
      border-radius:16px;
      box-shadow:0 24px 64px rgba(0,0,0,0.85),0 0 0 0.5px rgba(59,130,246,0.25),inset 0 1px 0 rgba(255,255,255,0.06);
      font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;
      color:#F8FAFC;display:none;flex-direction:column;
      max-height:82vh;overflow:hidden;
      backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);
      animation:appear .18s ease;
    }
    #p.show{display:flex;}
    @keyframes appear{from{opacity:0;transform:translateY(-50%) translateX(8px)}to{opacity:1;transform:translateY(-50%) translateX(0)}}

    /* header */
    #hdr{
      display:flex;align-items:center;gap:8px;
      padding:11px 13px;
      border-bottom:1px solid rgba(255,255,255,0.07);
      cursor:grab;flex-shrink:0;
    }
    #hdr:active{cursor:grabbing;}
    .logo{
      width:26px;height:26px;border-radius:7px;flex-shrink:0;
      background:linear-gradient(135deg,#3B82F6,#8B5CF6);
      display:flex;align-items:center;justify-content:center;
      font-size:13px;font-weight:900;color:#fff;
      box-shadow:0 0 10px rgba(59,130,246,.45);
    }
    .ptitle{
      font-size:12.5px;font-weight:700;flex:1;letter-spacing:-.01em;
      background:linear-gradient(110deg,#F8FAFC,#8B5CF6);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
    }
    .hbtn{
      width:20px;height:20px;border-radius:5px;border:none;cursor:pointer;
      background:rgba(255,255,255,0.06);color:#475569;font-size:12px;font-weight:700;
      display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s;
    }
    .hbtn:hover{background:rgba(255,255,255,0.12);color:#F8FAFC;}

    /* body */
    #bdy{
      flex:1;overflow-y:auto;padding:13px;
      scrollbar-width:thin;scrollbar-color:rgba(59,130,246,.25) transparent;
    }
    #bdy::-webkit-scrollbar{width:3px;}
    #bdy::-webkit-scrollbar-thumb{background:rgba(59,130,246,.25);border-radius:3px;}

    /* empty / hint */
    .hint{font-size:11.5px;color:#475569;text-align:center;padding:22px 8px;line-height:1.65;}
    .hint b{display:block;font-size:13px;color:#8B5CF6;margin-bottom:6px;}

    /* section label */
    .slbl{font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#334155;margin-bottom:9px;}

    /* course grid */
    .cgrid{display:grid;grid-template-columns:1fr 1fr;gap:7px;}
    .cbtn{
      background:#1E293B;border:1px solid rgba(255,255,255,0.07);
      border-radius:10px;padding:9px 8px;cursor:pointer;text-align:left;width:100%;
      transition:background .15s,border-color .15s,transform .1s;
    }
    .cbtn:hover{background:rgba(59,130,246,0.13);border-color:rgba(59,130,246,.35);transform:translateY(-1px);}
    .cbtn:active{transform:scale(.98);}
    .ccode{font-size:8.5px;font-weight:700;letter-spacing:.05em;color:#3B82F6;margin-bottom:3px;}
    .cname{font-size:10px;font-weight:600;color:#94A3B8;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}

    /* course label */
    .clabel{
      font-size:11px;color:#64748b;background:#1E293B;
      border:1px solid rgba(255,255,255,0.07);border-radius:9px;padding:9px 11px;margin-bottom:11px;line-height:1.45;
    }
    .clabel strong{display:block;font-size:12px;color:#93C5FD;margin-bottom:2px;}

    /* type picker */
    .trow{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;}
    .tbtn{
      padding:12px 6px;background:#1E293B;
      border:1px solid rgba(255,255,255,0.07);border-radius:10px;
      cursor:pointer;text-align:center;transition:background .15s,border-color .15s;color:#F8FAFC;
    }
    .tbtn:hover{background:rgba(59,130,246,0.15);border-color:rgba(59,130,246,.4);}
    .tbtn:active{transform:scale(.98);}
    .tico{font-size:20px;display:block;margin-bottom:5px;}
    .tlbl{font-size:11.5px;font-weight:700;color:#F8FAFC;}
    .tcnt{font-size:9.5px;color:#64748b;margin-top:2px;}

    /* scan info bar */
    .scanbar{
      font-size:10.5px;color:#64748b;
      background:rgba(20,241,217,0.05);border:1px solid rgba(20,241,217,0.13);
      border-radius:8px;padding:7px 10px;margin-top:10px;line-height:1.5;
    }
    .scanbar b{color:#14F1D9;}

    /* downloading */
    .dstatus{font-size:12.5px;font-weight:600;color:#14F1D9;margin-bottom:8px;}
    .dprog{height:2px;background:rgba(255,255,255,0.06);border-radius:2px;margin-bottom:10px;overflow:hidden;}
    .dfill{height:100%;background:linear-gradient(90deg,#3B82F6,#14F1D9);border-radius:2px;transition:width .4s;}
    .dstats{display:flex;gap:8px;margin-bottom:9px;}
    .dcard{flex:1;background:#1E293B;border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:8px 10px;}
    .dval{font-size:20px;font-weight:800;color:#F8FAFC;font-variant-numeric:tabular-nums;}
    .dlbl{font-size:8.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#475569;margin-top:2px;}
    .mlog{
      font-size:10px;font-family:'SF Mono',ui-monospace,'Fira Code',monospace;
      color:#334155;line-height:1.7;max-height:110px;overflow-y:auto;
      scrollbar-width:thin;scrollbar-color:rgba(100,116,139,.2) transparent;
    }
    .mlog::-webkit-scrollbar{width:2px;}
    .ml-u{color:#8B5CF6;font-weight:600;}
    .ml-d{color:#60a5fa;}
    .ml-s{color:#475569;}
    .ml-k{color:#10b981;font-weight:600;}
    .ml-e{color:#f87171;}

    /* done */
    .done{text-align:center;padding:14px 0 6px;}
    .dicon{
      width:46px;height:46px;border-radius:50%;
      background:linear-gradient(135deg,#059669,#34d399);
      display:inline-flex;align-items:center;justify-content:center;
      font-size:22px;color:#fff;font-weight:700;
      box-shadow:0 0 22px rgba(52,211,153,.4);margin-bottom:9px;
      animation:pop .4s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes pop{from{transform:scale(.5);opacity:0}to{transform:scale(1);opacity:1}}
    .dtitle{font-size:15px;font-weight:800;background:linear-gradient(120deg,#34d399,#6ee7b7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
    .dsub{font-size:10.5px;color:#64748b;margin-top:4px;}

    /* buttons */
    .abtn{
      width:100%;padding:10px 14px;font-size:12px;font-weight:700;
      border:none;border-radius:9px;cursor:pointer;color:#fff;margin-top:9px;
      background:linear-gradient(135deg,#3B82F6,#8B5CF6);
      box-shadow:0 3px 14px rgba(59,130,246,.28);
      transition:opacity .15s,transform .1s;
    }
    .abtn:hover{opacity:.9;}
    .abtn:active{transform:scale(.98);}
    .abtn.sec{background:rgba(255,255,255,0.06);box-shadow:none;color:#94A3B8;border:1px solid rgba(255,255,255,0.08);}
    .abtn.stop{background:rgba(239,68,68,0.12);box-shadow:none;color:#f87171;border:1px solid rgba(239,68,68,0.2);}
    .abtn.grn{background:linear-gradient(120deg,#059669,#0d9488);box-shadow:0 3px 14px rgba(5,150,105,.28);}

    /* merge toggle */
    .mtog{display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:9px 11px;background:#1E293B;border:1px solid rgba(255,255,255,0.07);border-radius:9px;transition:border-color .15s;margin-bottom:8px;}
    .mtog:not(.mdis):hover{border-color:rgba(59,130,246,.35);}
    .mtog.mdis{cursor:not-allowed;opacity:.45;}
    .mtxt{font-size:11px;font-weight:600;color:#94A3B8;}
    .mtog input{display:none;}
    .mswitch{width:30px;height:17px;background:rgba(255,255,255,0.12);border-radius:9px;position:relative;transition:background .2s;flex-shrink:0;}
    .mswitch::after{content:'';position:absolute;width:13px;height:13px;background:#fff;border-radius:50%;top:2px;left:2px;transition:transform .2s;}
    .mtog input:checked~.mswitch{background:#3B82F6;}
    .mtog input:checked~.mswitch::after{transform:translateX(13px);}
    /* merge filename box */
    .mname{display:none;align-items:center;gap:6px;padding:8px 10px;margin-bottom:8px;background:#1E293B;border:1px solid rgba(255,255,255,0.07);border-radius:9px;}
    .mnamein{flex:1;background:none;border:none;outline:none;color:#F8FAFC;font-size:11px;font-family:inherit;}
    .mnamein::placeholder{color:#475569;}
    .mnext{font-size:11px;color:#64748b;flex-shrink:0;}

    /* directory picker row */
    .dirrow{display:flex;align-items:center;gap:8px;padding:9px 11px;background:#1E293B;border:1px solid rgba(255,255,255,0.07);border-radius:9px;margin-bottom:11px;cursor:pointer;transition:border-color .15s;}
    .dirrow:hover{border-color:rgba(59,130,246,.35);}
    .dirico{font-size:14px;flex-shrink:0;}
    .dirname{flex:1;font-size:11px;font-weight:600;color:#94A3B8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .dirbtn{font-size:9.5px;font-weight:700;color:#3B82F6;background:none;border:none;cursor:pointer;padding:0 2px;flex-shrink:0;}
  </style>
  <div id="p">
    <div id="hdr">
      <div class="logo">M</div>
      <span class="ptitle">Manifest</span>
      <button class="hbtn" id="colBtn">—</button>
      <button class="hbtn" id="clsBtn">✕</button>
    </div>
    <div id="bdy"></div>
  </div>`;

  const panel  = shadow.getElementById('p');
  const bdy    = shadow.getElementById('bdy');
  const colBtn = shadow.getElementById('colBtn');
  const clsBtn = shadow.getElementById('clsBtn');
  const hdr    = shadow.getElementById('hdr');

  /* ── show / hide / toggle ───────────────────────────────── */
  function show()   { panel.classList.add('show'); refresh(); }
  function hide()   { panel.classList.remove('show'); }
  function toggle() { panel.classList.contains('show') ? hide() : show(); }

  /* ── drag ───────────────────────────────────────────────── */
  let drag = false, ox = 0, oy = 0;
  hdr.addEventListener('mousedown', e => {
    if (e.target === colBtn || e.target === clsBtn) return;
    drag = true;
    const r = panel.getBoundingClientRect();
    ox = e.clientX - r.left; oy = e.clientY - r.top;
    panel.style.transition = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!drag) return;
    panel.style.right = 'auto';
    panel.style.left  = (e.clientX - ox) + 'px';
    panel.style.top   = (e.clientY - oy) + 'px';
    panel.style.transform = 'none';
  });
  document.addEventListener('mouseup', () => { drag = false; });
  colBtn.addEventListener('click', () => {
    const hidden = bdy.style.display === 'none';
    bdy.style.display = hidden ? '' : 'none';
    colBtn.textContent = hidden ? '—' : '+';
  });
  clsBtn.addEventListener('click', hide);

  /* ── state ──────────────────────────────────────────────── */
  let running       = false;
  let mergeCallback = null;
  let dirHandle     = null;

  /* ── directory picker helpers ───────────────────────────── */
  function openIDB() {
    return new Promise((res, rej) => {
      const req = indexedDB.open('pesuDL', 1);
      req.onupgradeneeded = e => e.target.result.createObjectStore('kv');
      req.onsuccess = e => res(e.target.result);
      req.onerror   = e => rej(e.target.error);
    });
  }
  async function loadDirHandle() {
    try {
      const db = await openIDB();
      return new Promise(res => {
        const req = db.transaction('kv').objectStore('kv').get('dir');
        req.onsuccess = () => res(req.result || null);
        req.onerror   = () => res(null);
      });
    } catch { return null; }
  }
  async function saveDirHandle(h) {
    try {
      const db = await openIDB();
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(h, 'dir');
    } catch {}
  }
  async function chooseDir() {
    try {
      const h = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'downloads' });
      dirHandle = h;
      await saveDirHandle(h);
      return h;
    } catch { return null; }
  }
  const sanFS = s => (s || 'unknown').replace(/[<>:"/\\|?*\n\r]+/g, '_').replace(/\s+/g, '_').trim().slice(0, 60);
  async function fsaWrite(subdir, filename, bytes) {
    const sub = await dirHandle.getDirectoryHandle(subdir, { create: true });
    const fh  = await sub.getFileHandle(filename, { create: true });
    const w   = await fh.createWritable();
    await w.write(bytes);
    await w.close();
  }

  // Load stored handle on init (permission checked before each download)
  loadDirHandle().then(h => { if (h) dirHandle = h; });

  /* ── DOM helpers ────────────────────────────────────────── */
  function getCourseTitle() {
    const saved = sessionStorage.getItem('__pesuCourse');
    if (saved) return saved;
    // Course codes look like UE24CS241B, UE22EC151B, etc.
    const codeRe = /[A-Z]{2}\d{2}[A-Z]{2}\d{3}[A-Z]/;
    const selectors = [
      'h1', 'h2', 'h3',
      '.slds-breadcrumb li:last-child a', '.slds-breadcrumb li:last-child',
      'ol li a', 'nav a', 'a', 'span', 'li'
    ];
    for (const sel of selectors) {
      for (const el of qsa(sel)) {
        const t = el.textContent.trim();
        if (codeRe.test(t) && t.length > 5 && t.length < 120) return t;
      }
    }
    return document.title.replace(/Profile\s*\|?\s*/i, '').trim() || 'PESU_Course';
  }

  function getColIndex(headerText) {
    const ths = qsa('table th, table thead td');
    for (let i = 0; i < ths.length; i++)
      if (ths[i].textContent.trim().toLowerCase().includes(headerText.toLowerCase()))
        return i;
    if (headerText === 'slides') return 3;
    if (headerText === 'notes')  return 4;
    return -1;
  }

  function cellHasContent(cell) {
    if (!cell) return false;
    const t = cell.textContent.trim();
    return t !== '-' && t !== '' && t !== '0';
  }

  function prescan(type) {
    const col = getColIndex(type);
    if (col < 0) return [];
    return qsa('tr[onclick]').filter(tr => {
      const cells = tr.querySelectorAll('td');
      return cellHasContent(cells[col]);
    });
  }

  function findContentTab(type) {
    const t = type.toLowerCase();
    const all = qsa('[id^="contentType_"]');
    for (const el of all)
      if (el.textContent.trim().toLowerCase().includes(t)) return el;
    if (t === 'slides') return qs('#contentType_2');
    if (t === 'notes')  return qs('#contentType_3') || qs('#contentType_4');
    return null;
  }

  function detectCourses() {
    // The My Courses table has "Course Code" and "Course Title" headers
    for (const table of qsa('table')) {
      const ths = qsa('th', table);
      if (!ths.some(th => /course.?code/i.test(th.textContent))) continue;
      if (!ths.some(th => /course.?title/i.test(th.textContent))) continue;

      return qsa('tr', table)
        .filter(tr => tr.querySelector('td'))
        .map(tr => {
          const cells = qsa('td', tr);
          const code  = cells[0]?.textContent.trim();
          const name  = cells[1]?.textContent.trim();
          if (!code || !name) return null;

          // Capture onclick — could be on the tr, on an action link, or any anchor
          const withOnclick = tr.querySelector('[onclick]');
          const onclick = tr.getAttribute('onclick')
            || withOnclick?.getAttribute('onclick')
            || tr.querySelector('a')?.getAttribute('onclick')
            || null;

          return { code, name, onclick };
        })
        .filter(Boolean);
    }
    return [];
  }

  function isOnUnitsPage() {
    // Units table has "Slides" or "Notes" column headers
    return qsa('table th').some(th => /slides|notes/i.test(th.textContent));
  }

  function getPageState() {
    if (isOnUnitsPage()) return 'units';
    if (detectCourses().length) return 'courses';
    return 'none';
  }

  /* ── renders ────────────────────────────────────────────── */
  function refresh() {
    if (running) return;
    if (isOnUnitsPage())    { renderPicker(); return; }
    const courses = detectCourses();
    if (courses.length)     { renderCourseList(courses); return; }
    bdy.innerHTML = `<div class="hint"><b>Navigate to My Courses</b>Click "My Courses" in the PESU Academy sidebar, then open a course to see download options.</div>`;
  }

  function renderCourseList(courses) {
    const btns = courses.map((c, i) => `
      <button class="cbtn" data-i="${i}">
        <div class="ccode">${c.code}</div>
        <div class="cname">${c.name.replace(c.code, '').replace(/^[\s:]+/, '').trim()}</div>
      </button>`).join('');
    bdy.innerHTML = `<div class="slbl">My Courses</div><div class="cgrid">${btns}</div>`;
    shadow.querySelectorAll('.cbtn').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = courses[+btn.dataset.i];
        bdy.innerHTML = `<div class="hint">Loading course...</div>`;
        sessionStorage.setItem('__pesuCourse', `${c.code} : ${c.name.replace(c.code,'').replace(/^[\s:]+/,'').trim()}`);

        const code = c.code.replace(/'/g, "\\'");
        send({
          type: 'execScript',
          code: `(function(){
            var rows = document.querySelectorAll('table tr');
            for (var i = 0; i < rows.length; i++) {
              var tds = rows[i].querySelectorAll('td');
              for (var j = 0; j < tds.length; j++) {
                if (tds[j].textContent.trim() === '${code}') {
                  rows[i].click();
                  return;
                }
              }
            }
          })()`
        });

        // Poll until units table appears (max 12s)
        let attempts = 0;
        const poll = setInterval(() => {
          attempts++;
          if (isOnUnitsPage())   { clearInterval(poll); refresh(); }
          else if (attempts >= 24) { clearInterval(poll); refresh(); }
        }, 500);
      });
    });
  }

  function renderPicker() {
    const title    = getCourseTitle();
    const rows     = qsa('tr[onclick]');
    const total    = rows.length;
    const tabLinks = qsa('#courselistunit li a');

    // Detect active unit tab by matching visible row onclick IDs to tab href IDs
    const visibleUnitIds = new Set(
      rows.flatMap(tr =>
        Array.from((tr.getAttribute('onclick') || '').matchAll(/'(\d+)'/g), m => m[1])
      )
    );
    const activeTabLink = tabLinks.find(a => {
      const m = a.getAttribute('href')?.match(/courseUnit_(\d+)/);
      return m && visibleUnitIds.has(m[1]);
    }) || tabLinks[0];
    const defaultName = activeTabLink?.textContent.trim() || title;

    // Detect all content types that have data in this unit
    const ALL_TYPES = [
      { key: 'slides',      label: 'Slides',      icon: '📊' },
      { key: 'notes',       label: 'Notes',       icon: '📔' },
      { key: 'assignments', label: 'Assignments', icon: '📝' },
      { key: 'qb',          label: 'QB',          icon: '❓' },
      { key: 'qa',          label: 'QA',          icon: '💬' },
      { key: 'references',  label: 'References',  icon: '📚' },
    ];
    const types = ALL_TYPES.map(t => ({
      ...t,
      count: rows.filter(tr => cellHasContent(tr.querySelectorAll('td')[getColIndex(t.key)])).length
    })).filter(t => t.count > 0);

    const typeButtons = types.map(t =>
      `<button class="tbtn" data-type="${t.key}">
        <span class="tico">${t.icon}</span>
        <span class="tlbl">${t.label}</span>
        <span class="tcnt">${t.count} modules</span>
      </button>`
    ).join('');

    const scanSummary = types.map(t => `<b>${t.count}</b> ${t.label}`).join(' &nbsp;·&nbsp; ');

    const unitLabel = activeTabLink?.textContent.trim() || '';

    const dirLabel = dirHandle ? dirHandle.name : 'Downloads/PESU_Slides';

    bdy.innerHTML = `
      <div class="dirrow" id="dirRow">
        <span class="dirico">📁</span>
        <span class="dirname" id="dirName">${dirLabel}</span>
        <button class="dirbtn" id="dirBtn">Change</button>
      </div>
      <div class="clabel">
        <strong id="ctitle">${title}</strong>
        ${total} modules &nbsp;·&nbsp; ${types.length ? scanSummary : 'no content found'}
        ${unitLabel ? `<span style="display:block;margin-top:4px;font-size:10px;color:#3B82F6;font-weight:600;">📂 ${unitLabel}</span>` : ''}
      </div>
      <label class="mtog" id="ctogLabel">
        <span class="mtxt">Convert PPTs to PDF</span>
        <input type="checkbox" id="convertToggle">
        <span class="mswitch"></span>
      </label>
      <label class="mtog" id="mtogLabel">
        <span class="mtxt">Merge PDFs after download</span>
        <input type="checkbox" id="mergeToggle">
        <span class="mswitch"></span>
      </label>
      <div class="mname" id="mnameRow">
        <input type="text" id="mergeNameInput" class="mnamein" placeholder="filename" value="${defaultName.replace(/"/g, '&quot;')}">
        <span class="mnext">.pdf</span>
      </div>
      <div class="trow" style="flex-wrap:wrap">${typeButtons}</div>
      <div class="scanbar">${types.length ? `Pre-scanned: ${scanSummary} modules` : 'No downloadable content in this unit'}</div>`;

    const toggle    = shadow.getElementById('mergeToggle');
    const nameRow   = shadow.getElementById('mnameRow');
    const nameInput = shadow.getElementById('mergeNameInput');

    toggle.addEventListener('change', () => {
      nameRow.style.display = toggle.checked ? 'flex' : 'none';
    });

    const getMerge   = () => toggle.checked;
    const getMergeName = () => (nameInput.value.trim() || defaultName).replace(/[^a-zA-Z0-9 _\-]/g, '_').trim().slice(0, 80) || 'merged';
    const getConvert = () => shadow.getElementById('convertToggle').checked;

    shadow.getElementById('dirRow').addEventListener('click', async () => {
      const h = await chooseDir();
      if (h) shadow.getElementById('dirName').textContent = h.name;
    });

    shadow.querySelectorAll('.tbtn[data-type]').forEach(btn => {
      btn.addEventListener('click', async () => {
        // Verify/request FSA permission while we still have a user gesture
        if (dirHandle) {
          try {
            const perm = await dirHandle.requestPermission({ mode: 'readwrite' });
            if (perm !== 'granted') dirHandle = null;
          } catch { dirHandle = null; }
        }
        startDL(btn.dataset.type, title, getMerge(), getMergeName(), getConvert());
      });
    });

    // Async: extract course title from page's rendered text (innerText pierces shadow DOM in MAIN world)
    if (title === 'MyCourses' || title === 'PESU_Course') {
      send({
        type: 'execScript',
        code: `(function(){
          var lines=(document.body.innerText||'').split('\\n');
          var re=/[A-Z]{2}\\d{2}[A-Z]{2}\\d{3}[A-Z][^\\n]*/;
          for(var i=0;i<lines.length;i++){
            var t=lines[i].trim();
            var m=t.match(re);
            if(m&&m[0].length>8&&m[0].length<100){
              var found=m[0].trim();
              sessionStorage.setItem('__pesuCourse',found);
              return found;
            }
          }
          return '';
        })()`
      }, res => {
        if (res?.ok && res?.result) {
          const el = shadow.getElementById('ctitle');
          if (el) el.textContent = res.result;
        }
      });
    }
  }

  /* ── download flow ──────────────────────────────────────── */
  async function startDL(type, courseTitle, mergeEnabled = false, mergeName = '', convertEnabled = false) {
    if (running) return;
    running = true;

    const tabLinks = qsa('#courselistunit li a');
    const unitIdToName = new Map(
      tabLinks.map(a => {
        const m = a.getAttribute('href')?.match(/courseUnit_(\d+)/);
        return m ? [m[1], a.textContent.trim()] : null;
      }).filter(Boolean)
    );

    const groupMap = new Map();
    for (const tr of prescan(type)) {
      const oc   = tr.getAttribute('onclick') || '';
      const nums = Array.from(oc.matchAll(/'(\d+)'/g), m => m[1]);
      const id   = nums.find(n => unitIdToName.has(n));
      const name = id ? unitIdToName.get(id) : courseTitle;
      if (!groupMap.has(name)) groupMap.set(name, []);
      groupMap.get(name).push({ onclick: oc, rowName: tr.querySelector('td')?.textContent.trim() || 'item' });
    }

    const tabOrder = tabLinks.map(l => l.textContent.trim()).filter(n => groupMap.has(n));
    const groups = (tabOrder.length > 0 ? tabOrder : Array.from(groupMap.keys()))
      .map(name => ({ name, items: groupMap.get(name) }));

    const total = groups.reduce((sum, g) => sum + g.items.length, 0);

    bdy.innerHTML = `
      <div class="dstatus" id="dst">Starting…</div>
      <div class="dprog"><div class="dfill" id="dfill" style="width:0%"></div></div>
      <div class="dstats">
        <div class="dcard"><div class="dval" id="dunits">0/${total}</div><div class="dlbl">Classes</div></div>
        <div class="dcard"><div class="dval" id="dfiles">0</div><div class="dlbl">Files</div></div>
      </div>
      <div class="mlog" id="mlog"></div>
      <button class="abtn stop" id="stopBtn">Stop</button>`;

    let stopped   = false;
    let fileCount = 0;
    let processed = 0;
    let pdfUrls   = []; // full URLs of every PDF fired this session
    let hasPptx   = false; // true if any PPTX was in this download
    const logEl   = shadow.getElementById('mlog');
    const dstEl   = shadow.getElementById('dst');
    const dunEl   = shadow.getElementById('dunits');
    const dfiEl   = shadow.getElementById('dfiles');
    const fillEl  = shadow.getElementById('dfill');

    shadow.getElementById('stopBtn').addEventListener('click', () => { stopped = true; });

    const lines = [];
    function log(msg, cls = 'd') {
      lines.push(`<span class="ml-${cls}">${msg}</span><br>`);
      if (lines.length > 60) lines.shift();
      if (logEl) { logEl.innerHTML = lines.join(''); logEl.scrollTop = logEl.scrollHeight; }
    }

    for (const group of groups) {
      if (stopped) { log('Stopped.', 's'); break; }
      log(`=== ${group.name.slice(0, 42)} ===`, 'u');
      let tabFileNum = 0;

      for (const item of group.items) {
        if (stopped) break;

        const onclick = item.onclick;
        const rowName = item.rowName;

        processed++;
        if (dstEl)  dstEl.textContent  = `${type} · ${processed}/${total}`;
        if (dunEl)  dunEl.textContent  = `${processed}/${total}`;
        if (fillEl) fillEl.style.width = Math.round((processed / total) * 90) + '%';

        try {
          await callUnit(onclick);
          await sleep(2000);

          const tab = findContentTab(type);
          if (!tab) { log(`  ${rowName.slice(0, 30)}: no ${type} tab`, 's'); continue; }
          tab.click();
          await sleep(1000);

          const items = qsa('.link-preview');
          if (!items.length) { log(`  ${rowName.slice(0, 30)}: no items`, 's'); continue; }

          for (const item of items) {
            const innerA = item.querySelector('a');
            const oc     = item.getAttribute('onclick') || (innerA && innerA.getAttribute('onclick')) || '';

            if (oc.includes('loadIframe')) {
              const m = oc.match(/'([^']+)'/);
              if (m) {
                tabFileNum++; fileCount++;
                const base = m[1].split('?')[0];
                const full = base.startsWith('http') ? base : location.origin + base;
                pdfUrls.push(full);
                log(`  [${tabFileNum}] pdf ← ${rowName.slice(0, 25)}`, 'd');
                fire(full, tabFileNum, courseTitle, group.name, 'pdf');
              }
            } else {
              const uuid = oc.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
              if (uuid) {
                tabFileNum++; fileCount++;
                const url = `/Academy/a/referenceMeterials/downloadcoursedoc/${uuid[0]}`;
                if (convertEnabled) {
                  log(`  [${tabFileNum}] converting pptx→pdf ← ${rowName.slice(0, 22)}`, 'd');
                  const result = await convertPptFile(url, tabFileNum, group.name);
                  if (result?.ok) {
                    pdfUrls.push(result.dataUrl);
                    log(`  [${tabFileNum}] converted ✓`, 'd');
                  } else {
                    log(`  [${tabFileNum}] convert failed (${(result?.error || '?').slice(0, 28)}) — saving as pptx`, 'e');
                    hasPptx = true;
                    fire(url, tabFileNum, courseTitle, group.name, 'pptx');
                  }
                } else {
                  hasPptx = true;
                  log(`  [${tabFileNum}] pptx ← ${rowName.slice(0, 25)}`, 'd');
                  fire(url, tabFileNum, courseTitle, group.name, 'pptx');
                }
              }
            }
            if (dfiEl) dfiEl.textContent = fileCount;
          }
        } catch (e) {
          log(`  err: ${e.message.slice(0, 40)}`, 'e');
        }
      }
    }

    if (fillEl) fillEl.style.width = '100%';
    log(`Done! ${fileCount} files queued.`, 'k');
    await sleep(800);

    running  = false;
    doneView = true;

    // For single-unit downloads, save the merged PDF inside that unit's folder.
    const mergeFolder = groups.length === 1 ? groups[0].name : null;

    // Auto-merge status row shown only when merge was requested
    let mergeStatusHtml = '';
    if (mergeEnabled && pdfUrls.length > 0) {
      mergeStatusHtml = hasPptx
        ? `<div class="abtn" style="opacity:.35;cursor:default;font-size:11px;margin-top:9px">Merge disabled — PPTs present</div>`
        : `<div class="abtn grn" id="mstat" style="opacity:.55;cursor:default;margin-top:9px">Merging…</div>`;
    }

    bdy.innerHTML = `
      <div class="done">
        <div class="dicon">✓</div>
        <div class="dtitle">All Done!</div>
        <div class="dsub">${fileCount} file${fileCount !== 1 ? 's' : ''} queued to download</div>
        <div class="dsub" style="font-size:9.5px;margin-top:3px">${dirHandle ? dirHandle.name + '/' : 'Downloads/PESU_Slides/'}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px">
        <button class="abtn" id="thisCourseBtn">This Course</button>
        <button class="abtn sec" id="allCoursesBtn">All Courses</button>
      </div>
      ${mergeStatusHtml}
      <div style="margin-top:14px;text-align:center;font-size:10px;font-weight:600;color:#64748b;letter-spacing:.02em;">
        made with ♥ by Chiranth.R &nbsp;·&nbsp; PES1UG24AM354
      </div>`;

    shadow.getElementById('thisCourseBtn').addEventListener('click', () => {
      doneView = false;
      refresh();
    });

    shadow.getElementById('allCoursesBtn').addEventListener('click', () => {
      doneView = false;
      send({
        type: 'execScript',
        code: `(function(){
          var els = Array.from(document.querySelectorAll('a, [role="menuitem"], li a, nav a'));
          for (var i = 0; i < els.length; i++) {
            var t = els[i].textContent.trim();
            if (/^my.?courses$/i.test(t)) { els[i].click(); return; }
          }
          var all = document.querySelectorAll('*');
          for (var i = 0; i < all.length; i++) {
            if (/^my.?courses$/i.test(all[i].textContent.trim()) && all[i].children.length === 0) {
              all[i].click(); return;
            }
          }
        })()`
      });
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        if (detectCourses().length) { clearInterval(poll); refresh(); }
        else if (attempts >= 20)    { clearInterval(poll); refresh(); }
      }, 500);
    });

    // Kick off auto-merge immediately (no button click required)
    if (mergeEnabled && pdfUrls.length > 0 && !hasPptx) {
      mergeCallback = result => {
        const el = shadow.getElementById('mstat');
        if (el) {
          el.style.opacity = '1';
          if (result.ok) {
            el.textContent = 'Merged ✓';
          } else {
            el.textContent = 'Failed: ' + (result.error || 'unknown').slice(0, 35);
            el.classList.replace('grn', 'stop');
          }
        }
        mergeCallback = null;
      };
      send({ type: 'merge', urls: pdfUrls, filename: mergeName, folder: mergeFolder });
    }
  }

  async function callUnit(onclick) {
    const js = onclick.replace(/,\s*event\)/, ", new MouseEvent('click'))");
    return new Promise(resolve => {
      send({ type: 'execScript', code: js }, resolve);
    });
  }

  function fire(url, counter, courseTitle, unitName, ext) {
    const base = url.split('?')[0];
    const full = base.startsWith('http') ? base : location.origin + base;
    if (dirHandle) {
      fetch(full, { credentials: 'include' })
        .then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`)))
        .then(buf => fsaWrite(sanFS(unitName), `${counter}.${ext}`, buf))
        .catch(() => send({ type: 'download', url: full, counter, courseTitle, unitName, ext }));
    } else {
      send({ type: 'download', url: full, counter, courseTitle, unitName, ext });
    }
  }

  function convertPptFile(url, counter, unitName) {
    const full = url.startsWith('http') ? url : location.origin + url;
    return new Promise(resolve => send({ type: 'convertPpt', url: full, counter, unitName }, resolve));
  }

  /* ── auto-refresh on any page navigation ────────────────── */
  let refreshTimer = null;
  let doneView     = false; // prevents refresh from wiping the Done screen
  let lastState    = null;  // tracks last detected page state to avoid no-op refreshes

  function scheduleRefresh(delay = 800) {
    if (running) return;
    if (!panel.classList.contains('show')) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, delay);
  }

  // MutationObserver: refresh on state change, but not while done screen is showing
  // (minor AJAX updates on the same page shouldn't wipe the done screen)
  new MutationObserver(() => {
    if (running || doneView || !panel.classList.contains('show')) return;
    const s = getPageState();
    if (s !== lastState) { lastState = s; scheduleRefresh(600); }
  }).observe(document.body, { childList: true, subtree: true });

  // Any real navigation (hash, history) clears the done screen and triggers refresh
  const navRefresh = () => { doneView = false; scheduleRefresh(); };
  window.addEventListener('hashchange', navRefresh);
  window.addEventListener('popstate',   navRefresh);
  const _push    = history.pushState.bind(history);
  const _replace = history.replaceState.bind(history);
  history.pushState    = (...a) => { _push(...a);    navRefresh(); };
  history.replaceState = (...a) => { _replace(...a); navRefresh(); };

  /* ── listen for toggle from background ──────────────────── */
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === 'toggle')      toggle();
    if (msg.type === 'mergeResult') mergeCallback?.(msg);
  });
}

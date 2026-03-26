importScripts('pdf-lib.min.js');

const san = s => (s || 'unknown')
  .replace(/[<>:"/\\|?*\n\r]+/g, '_')
  .replace(/\s+/g, '_')
  .trim()
  .slice(0, 60);

/* ── Icon click → toggle floating panel ─────────────────────── */
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url || !tab.url.includes('pesuacademy.com')) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
  } catch (_) { /* already injected */ }
  chrome.tabs.sendMessage(tab.id, { type: 'toggle' });
});

/* ── Message handler ────────────────────────────────────────── */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  /* execScript — run page-defined function in MAIN world (bypasses CSP) */
  if (msg.type === 'execScript') {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      func: (code) => (0, eval)(code),
      args: [msg.code]
    })
      .then(results => sendResponse({ ok: true, result: results?.[0]?.result }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true; // keep channel open for async response
  }

  /* download — fire and forget, organised into course/unit folders */
  if (msg.type === 'download') {
    const unit   = san(msg.unitName || 'unit');
    const num    = msg.counter || 1;
    const ext    = msg.ext || 'tmp';
    const path   = `PESU_Slides/${unit}/${num}.${ext}`;

    chrome.downloads.download({
      url: msg.url,
      filename: path,
      conflictAction: 'uniquify',
      saveAs: false
    });
    // No sendResponse — fire and forget
  }

  /* convertPpt — fetch PPTX, convert via LibreOffice native host, download as PDF */
  if (msg.type === 'convertPpt') {
    let responded = false;
    const respond = v => { if (!responded) { responded = true; sendResponse(v); } };
    (async () => {
      try {
        const r = await fetch(msg.url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const u8 = new Uint8Array(await r.arrayBuffer());

        // base64 encode in chunks to avoid stack overflow on large files
        let fullB64 = '';
        for (let i = 0; i < u8.length; i += 8192)
          fullB64 += String.fromCharCode(...u8.subarray(i, i + 8192));
        fullB64 = btoa(fullB64);

        // Open persistent native port (allows multi-message streaming)
        const port = chrome.runtime.connectNative('com.pesu.downloader');

        // Send PPTX in ~700 KB base64 chunks
        const CHUNK = 700_000;
        const totalChunks = Math.ceil(fullB64.length / CHUNK);
        for (let i = 0; i < totalChunks; i++)
          port.postMessage({ action: 'chunk', data: fullB64.slice(i * CHUNK, (i + 1) * CHUNK), index: i });
        port.postMessage({ action: 'done' });

        // Receive PDF in chunks, then download and respond
        const pdfParts = [];
        port.onMessage.addListener(resp => {
          if (resp.status === 'error') {
            port.disconnect();
            respond({ ok: false, error: resp.error });
            return;
          }
          if (resp.status === 'chunk') {
            pdfParts.push(resp.data);
            return;
          }
          if (resp.status === 'done') {
            port.disconnect();
            const dataUrl = 'data:application/pdf;base64,' + pdfParts.join('');
            const unit   = san(msg.unitName || 'unit');
            chrome.downloads.download({
              url: dataUrl,
              filename: `PESU_Slides/${unit}/${msg.counter}.pdf`,
              conflictAction: 'uniquify',
              saveAs: false
            });
            respond({ ok: true, dataUrl });
          }
        });

        port.onDisconnect.addListener(() => {
          respond({ ok: false, error: chrome.runtime.lastError?.message || 'Native host disconnected' });
        });
      } catch (e) {
        respond({ ok: false, error: e.message });
      }
    })();
    return true; // keep message channel open for async sendResponse
  }

  /* merge — fetch PDFs in the service worker (bypasses CORS), merge with pdf-lib, download */
  if (msg.type === 'merge') {
    const tabId = sender.tab.id;
    const relay = result => chrome.tabs.sendMessage(tabId, { type: 'mergeResult', ...result });
    (async () => {
      try {
        const { PDFDocument } = PDFLib;
        const merged = await PDFDocument.create();
        for (const url of msg.urls) {
          const r = await fetch(url);
          if (!r.ok) throw new Error(`HTTP ${r.status} fetching PDF`);
          const bytes = await r.arrayBuffer();
          const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true });
          const pages = await merged.copyPages(doc, doc.getPageIndices());
          pages.forEach(p => merged.addPage(p));
        }
        const out = await merged.save();
        // Convert to base64 data URL in chunks to avoid stack overflow on large files
        const u8 = new Uint8Array(out);
        let b64 = '';
        for (let i = 0; i < u8.length; i += 8192)
          b64 += String.fromCharCode(...u8.subarray(i, i + 8192));
        const dataUrl = 'data:application/pdf;base64,' + btoa(b64);
        const folder = msg.folder ? `PESU_Slides/${san(msg.folder)}/` : 'PESU_Slides/';
        await chrome.downloads.download({ url: dataUrl, filename: `${folder}${san(msg.filename)}.pdf`, saveAs: false });
        relay({ ok: true });
      } catch (e) {
        relay({ ok: false, error: e.message });
      }
    })();
  }
});

const startBtn   = document.getElementById("startBtn");
const btnLabel   = document.getElementById("btnLabel");
const statusText = document.getElementById("statusText");
const log        = document.getElementById("log");
const noTabMsg   = document.getElementById("noTabMsg");
const doneNotice = document.getElementById("doneNotice");
const progFill   = document.getElementById("progFill");
const unitsVal   = document.getElementById("unitsVal");
const unitsHint  = document.getElementById("unitsHint");
const filesVal   = document.getElementById("filesVal");
const clearBtn   = document.getElementById("clearBtn");

// Tab ID is passed via URL param when background opens this page
const urlParams = new URLSearchParams(window.location.search);
let pesuTabId = urlParams.get("tabId") ? parseInt(urlParams.get("tabId")) : null;

let fileCount  = 0;
let totalUnits = 0;
let doneUnits  = 0;

clearBtn.addEventListener("click", () => {
  log.innerHTML = "";
});

function addLog(msg) {
  const d = document.createElement("div");
  d.className = "ll";
  if      (msg.startsWith("==="))                          d.classList.add("sep");
  else if (msg.includes("Downloading"))                    d.classList.add("dl");
  else if (msg.includes("All done"))                       d.classList.add("ok");
  else if (msg.includes("error") || msg.includes("Error")) d.classList.add("err");
  else if (msg.includes("skipping") || msg.includes("No content") || msg.includes("could not"))
    d.classList.add("warn");
  d.textContent = msg;
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "status") {
    statusText.textContent = msg.text;

    const foundMatch = msg.text.match(/Found (\d+) units/);
    if (foundMatch) {
      totalUnits           = parseInt(foundMatch[1]);
      doneUnits            = 0;
      unitsVal.textContent = "0 / " + totalUnits;
      unitsHint.textContent = "processing";
      progFill.style.width = "0%";
    }

    const progMatch = msg.text.match(/Unit (\d+)\/(\d+)/);
    if (progMatch && totalUnits > 0) {
      doneUnits             = parseInt(progMatch[1]);
      unitsVal.textContent  = doneUnits + " / " + totalUnits;
      const pct             = Math.round((doneUnits / totalUnits) * 90);
      progFill.style.width  = pct + "%";
    }
  }

  if (msg.type === "log") {
    addLog(msg.text);
    if (msg.text.includes("Downloading")) {
      fileCount++;
      filesVal.textContent = fileCount;
    }
  }

  if (msg.type === "done") {
    const count = msg.count ?? fileCount;
    document.body.classList.remove("active");
    document.body.classList.add("done");

    startBtn.disabled     = false;
    btnLabel.textContent  = "Download Again";
    statusText.textContent = "All downloads complete";
    unitsVal.textContent  = totalUnits > 0 ? totalUnits + " / " + totalUnits : "—";
    unitsHint.textContent = "complete";
    filesVal.textContent  = count;
    doneNotice.textContent = count + " file" + (count !== 1 ? "s" : "") + " saved to Downloads/PESU_Slides";
  }
});

async function resolveTab() {
  // First try the stored pesuTabId (verify it still points to PESU academy)
  if (pesuTabId) {
    try {
      const t = await chrome.tabs.get(pesuTabId);
      if (t.url && t.url.includes("pesuacademy.com")) return pesuTabId;
    } catch (_) {}
  }
  // Fallback: find any open PESU academy tab
  const tabs = await chrome.tabs.query({ url: "https://www.pesuacademy.com/*" });
  if (!tabs.length) return null;
  pesuTabId = tabs[0].id;
  return pesuTabId;
}

startBtn.addEventListener("click", async () => {
  const tabId = await resolveTab();
  if (!tabId) {
    noTabMsg.style.display = "block";
    return;
  }
  noTabMsg.style.display = "none";

  // Reset UI state
  startBtn.disabled     = true;
  btnLabel.textContent  = "Downloading...";
  log.innerHTML         = "";
  fileCount             = 0;
  totalUnits            = 0;
  doneUnits             = 0;
  progFill.style.width  = "0%";
  unitsVal.textContent  = "—";
  unitsHint.textContent = "waiting";
  filesVal.textContent  = "0";
  doneNotice.textContent = "";

  document.body.classList.remove("done");
  document.body.classList.add("active");
  statusText.textContent = "Starting...";

  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
  } catch (_) { /* guard in content.js handles re-injection */ }

  chrome.tabs.sendMessage(tabId, { type: "start" });
});

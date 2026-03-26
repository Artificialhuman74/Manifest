const startBtn = document.getElementById("startBtn");
const status   = document.getElementById("status");
const log      = document.getElementById("log");

function addLog(msg) {
  const line = document.createElement("div");
  line.textContent = msg;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "status") status.textContent = msg.text;
  if (msg.type === "log")    addLog(msg.text);
  if (msg.type === "done")   startBtn.disabled = false;
});

startBtn.addEventListener("click", () => {
  startBtn.disabled = true;
  status.textContent = "Starting...";
  log.innerHTML = "";
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const tabId = tabs[0].id;
    // Inject content script programmatically in case it wasn't auto-injected
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    } catch (e) {
      // Already injected or other benign error — proceed anyway
    }
    chrome.tabs.sendMessage(tabId, { type: "start" });
  });
});

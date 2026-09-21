importScripts("analysis.js");

const pendingRedirects = new Map();

function allowanceKey(tabId) {
  return `allowOnce:${tabId}`;
}

function buildWarningUrl(url, analysis) {
  const warningUrl = new URL(chrome.runtime.getURL("warning.html"));
  warningUrl.searchParams.set("url", url);
  warningUrl.searchParams.set("level", analysis.level);
  warningUrl.searchParams.set("score", String(analysis.score));
  warningUrl.searchParams.set("reasons", JSON.stringify(analysis.reasons));
  return warningUrl.href;
}

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;

  const analysis = analyzeUrl(details.url);
  if (analysis.level === "safe") return;

  const key = allowanceKey(details.tabId);
  const stored = await chrome.storage.session.get(key);
  if (stored[key] === details.url && analysis.level === "suspicious") {
    await chrome.storage.session.remove(key);
    return;
  }

  if (pendingRedirects.get(details.tabId) === details.url) return;
  pendingRedirects.set(details.tabId, details.url);

  try {
    await chrome.tabs.update(details.tabId, {
      url: buildWarningUrl(details.url, analysis)
    });
  } finally {
    pendingRedirects.delete(details.tabId);
  }
}, {
  url: [{ schemes: ["http", "https"] }]
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "continue-navigation" || !sender.tab?.id) return;

  const analysis = analyzeUrl(message.url);
  if (analysis.level !== "suspicious") {
    sendResponse({ ok: false });
    return;
  }

  const tabId = sender.tab.id;
  const key = allowanceKey(tabId);

  chrome.storage.session.set({ [key]: message.url })
    .then(() => chrome.tabs.update(tabId, { url: message.url }))
    .then(() => sendResponse({ ok: true }))
    .catch(() => sendResponse({ ok: false }));

  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  pendingRedirects.delete(tabId);
  chrome.storage.session.remove(allowanceKey(tabId));
});

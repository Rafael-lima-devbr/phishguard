document.addEventListener("click", (event) => {
  if (event.defaultPrevented || event.button !== 0) return;

  const link = event.target.closest("a[href]");
  if (!link || link.hasAttribute("download")) return;

  const destination = new URL(link.href, document.baseURI);
  if (!["http:", "https:"].includes(destination.protocol)) return;

  const analysis = analyzeUrl(destination.href);
  if (analysis.level === "safe") return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const warningUrl = new URL(chrome.runtime.getURL("warning.html"));
  warningUrl.searchParams.set("url", destination.href);
  warningUrl.searchParams.set("level", analysis.level);
  warningUrl.searchParams.set("score", String(analysis.score));
  warningUrl.searchParams.set("reasons", JSON.stringify(analysis.reasons));

  if (link.target === "_blank" || event.ctrlKey || event.metaKey || event.shiftKey) {
    window.open(warningUrl.href, "_blank", "noopener");
  } else {
    window.location.assign(warningUrl.href);
  }
}, true);

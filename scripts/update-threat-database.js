const fs = require("node:fs/promises");
const path = require("node:path");
const { normalizeDomain, normalizeUrlForReputation } = require("../reputation.js");

const FEED_URL = "https://phish.co.za/latest/phishing-links-ACTIVE.txt";

async function downloadText(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "PhishGuard research updater/0.3" }
  });
  if (!response.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${response.status}`);
  return response.text();
}

function dataLines(text) {
  return text.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

async function main() {
  console.log("Baixando o feed oficial ativo do Phishing.Database...");
  const linkText = await downloadText(FEED_URL);

  const rawLinks = dataLines(linkText);
  const urls = new Set(rawLinks.map(normalizeUrlForReputation).filter(Boolean));
  const domains = new Set();

  for (const rawLink of rawLinks) {
    try {
      const parsed = new URL(rawLink);
      if ((parsed.pathname === "/" || parsed.pathname === "") && !parsed.search) {
        domains.add(normalizeDomain(parsed.hostname));
      }
    } catch {
      // Linhas inválidas são descartadas pela validação abaixo.
    }
  }

  if (rawLinks.length < 100 || urls.size < rawLinks.length * 0.8) {
    throw new Error("Feed de links não passou na validação mínima");
  }
  const output = {
    source: "Phishing.Database",
    project: "https://github.com/Phishing-Database/Phishing.Database",
    generatedAt: new Date().toISOString(),
    feed: FEED_URL,
    stats: { urls: urls.size, domains: domains.size },
    urls: [...urls].sort(),
    domains: [...domains].sort()
  };

  const serialized = `${JSON.stringify(output)}\n`;
  const destination = path.join(__dirname, "..", "data", "threat-db.json");
  await fs.writeFile(destination, serialized, "utf8");
  console.log(`Base atualizada: ${urls.size} URLs, ${domains.size} domínios, ${(Buffer.byteLength(serialized) / 1024 / 1024).toFixed(2)} MiB.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

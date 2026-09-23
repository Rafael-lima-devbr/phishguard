const fs = require("node:fs/promises");
const path = require("node:path");
const {
  createReputationDatabase,
  checkExternalReputation,
  normalizeUrlForReputation
} = require("../reputation.js");

const OPENPHISH_FEED = "https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt";
const MAJESTIC_CSV = "https://downloads.majestic.com/majestic_million.csv";
const CLASS_SIZE = 100;
const LEGITIMATE_CANDIDATE_LIMIT = 200;

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "Phishpect independent evaluation/0.3" }
  });
  if (!response.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${response.status}`);
  return response.text();
}

async function fetchFirstLines(url, limit) {
  const response = await fetch(url, {
    headers: { "User-Agent": "Phishpect independent evaluation/0.3" }
  });
  if (!response.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${response.status}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "", lines = [];
  while (lines.length < limit) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() || "";
    lines.push(...parts);
  }
  await reader.cancel();
  return lines.slice(0, limit);
}

function parseCsvLine(line) {
  const fields = [];
  let field = "", quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      field += '"'; index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { fields.push(field); field = ""; }
    else field += character;
  }
  fields.push(field);
  return fields;
}

function validHttpUrl(value) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function uniqueByNormalizedUrl(rows) {
  const seen = new Set();
  const unique = [];
  let duplicates = 0;
  for (const row of rows) {
    const key = normalizeUrlForReputation(row.url);
    if (!key || seen.has(key)) { duplicates += 1; continue; }
    seen.add(key);
    unique.push(row);
  }
  return { unique, duplicates };
}

function toCsv(rows) {
  const escape = (value) => /[",\r\n]/.test(value)
    ? `"${value.replaceAll('"', '""')}"`
    : value;
  return `url,label\n${rows.map((row) => `${escape(row.url)},${row.label}`).join("\n")}\n`;
}

async function main() {
  const acquiredAt = new Date().toISOString();
  const evaluationRoot = path.join(__dirname, "..", "evaluation");
  const datasetsDirectory = path.join(evaluationRoot, "datasets");
  const documentationDirectory = path.join(evaluationRoot, "docs");
  await fs.mkdir(datasetsDirectory, { recursive: true });
  await fs.mkdir(documentationDirectory, { recursive: true });
  console.log("Baixando arquivos de dados OpenPhish e Majestic Million...");
  const [openPhishText, majesticLines] = await Promise.all([
    fetchText(OPENPHISH_FEED),
    fetchFirstLines(MAJESTIC_CSV, LEGITIMATE_CANDIDATE_LIMIT + 1)
  ]);

  const phishingSourceLines = openPhishText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const invalidPhishing = phishingSourceLines.filter((url) => !validHttpUrl(url)).length;
  const phishingCandidates = phishingSourceLines
    .filter(validHttpUrl)
    .map((url) => ({ url, label: "phishing" }));

  const majesticHeader = parseCsvLine(majesticLines.shift() || "");
  const domainIndex = majesticHeader.indexOf("Domain");
  if (domainIndex < 0) throw new Error("Coluna Domain ausente no Majestic Million");
  const legitimateCandidates = majesticLines.map(parseCsvLine)
    .map((row) => row[domainIndex]?.trim().toLowerCase())
    .filter(Boolean)
    .map((domain) => ({ url: `https://${domain}/`, label: "legitimate" }));
  const invalidLegitimate = legitimateCandidates.filter((row) => !validHttpUrl(row.url)).length;
  const validLegitimate = legitimateCandidates.filter((row) => validHttpUrl(row.url));

  const rawRows = [...validLegitimate, ...phishingCandidates];
  await fs.writeFile(path.join(datasetsDirectory, "candidates.csv"), toCsv(rawRows));

  const phishingDedup = uniqueByNormalizedUrl(phishingCandidates);
  const legitimateDedup = uniqueByNormalizedUrl(validLegitimate);
  const databaseData = JSON.parse(await fs.readFile(path.join(__dirname, "..", "reputation", "threat-db.json"), "utf8"));
  const reputationDatabase = createReputationDatabase(databaseData);

  let overlapPhishing = 0;
  const independentPhishing = phishingDedup.unique.filter((row) => {
    const overlaps = checkExternalReputation(row.url, reputationDatabase).listed;
    if (overlaps) overlapPhishing += 1;
    return !overlaps;
  });
  let overlapLegitimate = 0;
  const independentLegitimate = legitimateDedup.unique.filter((row) => {
    const overlaps = checkExternalReputation(row.url, reputationDatabase).listed;
    if (overlaps) overlapLegitimate += 1;
    return !overlaps;
  });

  if (independentPhishing.length < CLASS_SIZE || independentLegitimate.length < CLASS_SIZE) {
    throw new Error(`Amostras insuficientes após limpeza: ${independentPhishing.length} phishing e ${independentLegitimate.length} legítimas`);
  }

  const cleanRows = [
    ...independentLegitimate.slice(0, CLASS_SIZE),
    ...independentPhishing.slice(0, CLASS_SIZE)
  ];
  await fs.writeFile(path.join(datasetsDirectory, "dataset-a.csv"), toCsv(cleanRows));

  const discarded = rawRows.length - cleanRows.length;
  const documentation = `# Dataset de avaliação independente\n\n` +
    `- Obtido em: ${acquiredAt}\n` +
    `- Legítimas: ${CLASS_SIZE}\n` +
    `- Phishing: ${CLASS_SIZE}\n` +
    `- Total utilizado: ${cleanRows.length}\n` +
    `- Linhas candidatas brutas: ${rawRows.length}\n` +
    `- Linhas descartadas na seleção/limpeza: ${discarded}\n` +
    `- Inválidas: ${invalidLegitimate + invalidPhishing}\n` +
    `- Duplicatas phishing: ${phishingDedup.duplicates}\n` +
    `- Duplicatas legítimas: ${legitimateDedup.duplicates}\n` +
    `- Sobreposição phishing com Phishing.Database: ${overlapPhishing}\n` +
    `- Sobreposição legítima com Phishing.Database: ${overlapLegitimate}\n\n` +
    `## Fontes\n\n` +
    `- Phishing: OpenPhish Community Feed (${OPENPHISH_FEED}), feed textual público independente do Phishing.Database.\n` +
    `- Legítimas: Majestic Million (${MAJESTIC_CSV}), primeiros domínios do ranking público, licenciado sob CC BY 3.0.\n\n` +
    `## Limpeza\n\n` +
    `Foram aceitas somente URLs HTTP(S) válidas. Duplicatas foram comparadas com a mesma normalização usada pelo MVP. ` +
    `Entradas que coincidiam com a base local Phishing.Database foram excluídas antes da seleção balanceada de ${CLASS_SIZE} itens por classe. ` +
    `As URLs phishing foram preservadas como texto; os domínios Majestic foram representados como URLs HTTPS de raiz. ` +
    `Nenhum site listado foi aberto, visitado ou consultado individualmente.\n`;
  await fs.writeFile(path.join(documentationDirectory, "dataset-a.md"), documentation);

  console.log(JSON.stringify({ acquiredAt, raw: rawRows.length, final: cleanRows.length, legitimate: CLASS_SIZE, phishing: CLASS_SIZE, invalid: invalidLegitimate + invalidPhishing, duplicates: phishingDedup.duplicates + legitimateDedup.duplicates, overlapPhishing, overlapLegitimate, discarded }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

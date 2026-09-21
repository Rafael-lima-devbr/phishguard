const fs = require("node:fs");
const path = require("node:path");
const { analyzeUrl } = require("../analysis.js");
const { createReputationDatabase, checkExternalReputation } = require("../reputation.js");

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') {
      field += '"'; index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { row.push(field); field = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field); if (row.some(Boolean)) rows.push(row); row = []; field = "";
    } else field += character;
  }
  row.push(field); if (row.some(Boolean)) rows.push(row);
  return rows;
}

function csv(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function isFraudulent(label) {
  return ["1", "true", "fraudulent", "phishing", "malicious"].includes(label.trim().toLowerCase());
}

function metrics(records, classificationField) {
  let tp = 0, fn = 0, fp = 0, tn = 0;
  for (const record of records) {
    const actual = isFraudulent(record.label);
    const predicted = record[classificationField] !== "safe";
    if (actual && predicted) tp += 1;
    else if (actual) fn += 1;
    else if (predicted) fp += 1;
    else tn += 1;
  }
  const divide = (a, b) => b ? a / b : 0;
  return {
    fraudulent_detected: tp,
    fraudulent_missed: fn,
    legitimate_false_alerts: fp,
    legitimate_correctly_allowed: tn,
    detection_rate: divide(tp, tp + fn),
    false_alert_rate: divide(fp, fp + tn),
    accuracy: divide(tp + tn, records.length)
  };
}

function main() {
  const [, , inputPath, outputPath = "evaluation/results.csv"] = process.argv;
  if (!inputPath) throw new Error("Uso: npm run evaluate -- entrada.csv [saida.csv]");

  const rows = parseCsv(fs.readFileSync(inputPath, "utf8"));
  const header = rows.shift().map((value) => value.trim().toLowerCase());
  const urlIndex = header.indexOf("url"), labelIndex = header.indexOf("label");
  if (urlIndex < 0 || labelIndex < 0) throw new Error("O CSV precisa das colunas url e label");

  let databaseData = {};
  try {
    databaseData = JSON.parse(fs.readFileSync("data/threat-db.json", "utf8"));
  } catch {
    console.warn("Base externa indisponível; avaliando apenas a análise local.");
  }
  const database = createReputationDatabase(databaseData);

  const records = rows.map((row) => {
    const url = row[urlIndex], label = row[labelIndex];
    const local = analyzeUrl(url);
    const external = checkExternalReputation(url, database);
    return {
      url, label,
      local_score: local.score,
      local_classification: local.level,
      external_listed: external.listed,
      external_source: external.source,
      final_classification: external.listed ? "blocked" : local.level
    };
  });

  const columns = ["url", "label", "local_score", "local_classification", "external_listed", "external_source", "final_classification"];
  const output = [columns.join(","), ...records.map((record) => columns.map((column) => csv(record[column])).join(","))].join("\n");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${output}\n`);

  console.log(JSON.stringify({
    local_only: metrics(records, "local_classification"),
    local_plus_external: metrics(records, "final_classification")
  }, null, 2));
  console.log(`Resultados gravados em ${outputPath}`);
}

try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }

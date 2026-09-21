const CONFIRMED_MALICIOUS_DOMAINS = new Set([
  "phishing-test.invalid",
  "malware-test.invalid"
]);

const SUSPICIOUS_TERMS = [
  "login", "verify", "account", "password", "senha",
  "secure", "bank", "banco", "pix"
];

/**
 * Calcula o risco usando pesos e limite provisórios para o MVP.
 * Esses valores devem ser calibrados posteriormente com dados experimentais.
 */
function analyzeUrl(url) {
  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch {
    return {
      score: 100,
      level: "blocked",
      reasons: ["URL inválida ou impossível de interpretar"]
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const isConfirmedThreat = [...CONFIRMED_MALICIOUS_DOMAINS].some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );

  if (isConfirmedThreat) {
    return {
      score: 100,
      level: "blocked",
      reasons: ["Domínio presente na lista local de testes maliciosos"]
    };
  }

  let score = 0;
  const reasons = [];
  const addRisk = (points, reason) => {
    score += points;
    reasons.push(reason);
  };

  if (parsedUrl.protocol === "http:") {
    addRisk(20, "URL utiliza HTTP em vez de HTTPS");
  }

  const isIpv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname);
  const isIpv6 = hostname.includes(":");
  if (isIpv4 || isIpv6) {
    addRisk(30, "Domínio utiliza um endereço IP diretamente");
  }

  if (hostname.includes("xn--")) {
    addRisk(25, "Domínio utiliza Punycode");
  }
  if (url.length > 150) {
    addRisk(20, "URL é excessivamente longa");
  }
  if (hostname.length > 60) {
    addRisk(15, "Domínio é excessivamente longo");
  }
  if (!isIpv4 && !isIpv6 && hostname.split(".").length > 4) {
    addRisk(15, "Domínio possui muitos níveis de subdomínio");
  }
  if (url.includes("@")) {
    addRisk(25, "URL contém o caractere @");
  }

  const searchableUrl = decodeURIComponentSafe(
    `${hostname}${parsedUrl.pathname}${parsedUrl.search}`
  ).toLowerCase();
  const foundTerms = SUSPICIOUS_TERMS.filter((term) => searchableUrl.includes(term));
  if (foundTerms.length > 0) {
    addRisk(20, `URL contém termos sensíveis: ${foundTerms.join(", ")}`);
  }

  if (hostname.split("-").length > 4) {
    addRisk(10, "Domínio utiliza muitos hífens");
  }

  score = Math.min(score, 100);
  return {
    score,
    level: score >= 40 ? "suspicious" : "safe",
    reasons
  };
}

function decodeURIComponentSafe(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

if (typeof module !== "undefined") {
  module.exports = { analyzeUrl };
}

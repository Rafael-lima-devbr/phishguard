const REPUTATION_SOURCE = "Phishing.Database";

function normalizeDomain(value) {
  return value.trim().toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
}

function normalizeUrlForReputation(value) {
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;

    parsed.hash = "";
    parsed.hostname = normalizeDomain(parsed.hostname);
    const sortedParameters = [...parsed.searchParams.entries()]
      .sort(([nameA, valueA], [nameB, valueB]) =>
        nameA.localeCompare(nameB) || valueA.localeCompare(valueB)
      );
    parsed.search = "";
    for (const [name, parameterValue] of sortedParameters) {
      parsed.searchParams.append(name, parameterValue);
    }

    const pathname = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
    return `${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}${pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

function createReputationDatabase(data = {}) {
  return {
    urls: new Set(Array.isArray(data.urls) ? data.urls : []),
    domains: new Set(Array.isArray(data.domains) ? data.domains : []),
    metadata: {
      generatedAt: data.generatedAt || null,
      stats: data.stats || { urls: 0, domains: 0 }
    }
  };
}

function checkExternalReputation(url, database) {
  const normalizedUrl = normalizeUrlForReputation(url);
  let domain = null;
  try {
    domain = normalizeDomain(new URL(url).hostname);
  } catch {
    // URL inválida permanece responsabilidade da análise local.
  }

  if (normalizedUrl && database?.urls?.has(normalizedUrl)) {
    return { listed: true, source: REPUTATION_SOURCE, matchType: "exact-url" };
  }
  if (domain && database?.domains?.has(domain)) {
    return { listed: true, source: REPUTATION_SOURCE, matchType: "domain" };
  }
  return { listed: false, source: REPUTATION_SOURCE, matchType: null };
}

if (typeof module !== "undefined") {
  module.exports = {
    REPUTATION_SOURCE,
    normalizeDomain,
    normalizeUrlForReputation,
    createReputationDatabase,
    checkExternalReputation
  };
}

const params = new URLSearchParams(window.location.search);
const destinationUrl = params.get("url") || "";
const level = params.get("level") === "blocked" ? "blocked" : "suspicious";
const score = Number(params.get("score")) || 0;
const externalSource = params.get("externalSource");

let reasons = [];
try {
  reasons = JSON.parse(params.get("reasons") || "[]");
} catch {
  reasons = ["Não foi possível ler os motivos da análise"];
}

const levelElement = document.querySelector("#level");
const continueButton = document.querySelector("#continue");
document.querySelector("#destination").textContent = destinationUrl;
document.querySelector("#score").textContent = String(score);

for (const reason of reasons) {
  const item = document.createElement("li");
  item.textContent = reason;
  document.querySelector("#reasons").append(item);
}

if (externalSource) {
  document.querySelector("#external-source").textContent = externalSource;
  document.querySelector("#external-evidence").hidden = false;
}

if (level === "blocked") {
  levelElement.textContent = externalSource ? "LISTADO EM BASE DE PHISHING" : "AMEAÇA CONFIRMADA LOCALMENTE";
  levelElement.classList.add("malicious");
  document.querySelector("#title").textContent = externalSource
    ? "Navegação bloqueada por reputação"
    : "Navegação bloqueada";
  continueButton.hidden = true;
} else {
  levelElement.textContent = "SUSPEITO";
  document.querySelector("#title").textContent = "Este link apresenta sinais de risco";
}

document.querySelector("#back").addEventListener("click", () => {
  if (history.length > 1) history.back();
  else window.close();
});

continueButton.addEventListener("click", () => {
  if (!destinationUrl) return;

  continueButton.disabled = true;
  chrome.runtime.sendMessage({
    type: "continue-navigation",
    url: destinationUrl
  }).then((response) => {
    if (!response?.ok) continueButton.disabled = false;
  });
});

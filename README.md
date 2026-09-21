# PhishGuard

Extensão experimental para Microsoft Edge que combina heurísticas locais com uma base local de reputação e intervém conforme o risco de uma página potencialmente fraudulenta.

## Funcionamento

O `analyzeUrl(url)` atribui um score a sinais simples, como HTTP, endereço IP, Punycode, URL longa, muitos subdomínios, `@` e termos sensíveis. A decisão resultante é:

- `safe`: navegação liberada;
- `suspicious`: exibe os motivos e permite voltar ou continuar;
- `blocked`: evidência confirmada local ou correspondência na base de reputação, sem opção de continuar.

Depois da heurística, `checkExternalReputation(url)` procura a URL normalizada e, quando aplicável, o domínio exato em `data/threat-db.json`. A base é gerada a partir do feed ativo `phishing-links-ACTIVE.txt` do projeto open source [Phishing.Database](https://github.com/Phishing-Database/Phishing.Database). URLs de raiz do feed também geram uma entrada de domínio; URLs com caminho não são ampliadas para o domínio inteiro. A ausência de uma entrada nessa base não comprova que o destino seja seguro.

Cliques são analisados antes de sair da página. Outras navegações, inclusive URLs digitadas na barra, são observadas pelo service worker com `webNavigation.onBeforeNavigate` e redirecionadas para a tela de aviso quando necessário.

## Arquitetura

- `analysis.js`: motor heurístico central e blacklist local de testes.
- `reputation.js`: normaliza e consulta a base externa local usando `Set`.
- `content.js`: intercepta cliques e solicita a avaliação combinada.
- `background.js`: carrega a base uma vez, combina evidências, observa navegações e controla a exceção de continuar uma vez.
- `data/threat-db.json`: snapshot local gerado dos feeds ativos.
- `scripts/update-threat-database.js`: atualiza, valida, normaliza e remove duplicatas da base.
- `scripts/evaluate-dataset.js`: gera CSV e compara métricas da heurística com o método combinado.
- `warning.html` e `warning.js`: tela de aviso ou bloqueio.
- `test.html`: links controlados para demonstrar os três resultados.
- `manifest.json`: configuração Manifest V3.

## Instalação local no Edge

1. Abra `edge://extensions`.
2. Ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação**.
4. Selecione a pasta deste projeto.
5. Clique no ícone do PhishGuard para abrir os testes controlados.

Ao atualizar o código, clique em **Recarregar** no cartão da extensão.

## Atualização da reputação

Com Node.js instalado, execute manualmente:

```bash
npm run update-threat-db
```

O comando baixa somente o feed oficial. Ele não abre, testa ou faz requisições para as URLs contidas nele. HTTP e HTTPS são tratados como a mesma URL; `www.` e fragmentos são removidos; barras finais são normalizadas; parâmetros são preservados e ordenados. Domínios e subdomínios são comparados exatamente para evitar correspondências excessivamente amplas.

Se o arquivo local estiver ausente ou inválido, a extensão continua funcionando somente com `analyzeUrl()`.

## Avaliação

O conjunto independente versionado usa OpenPhish Community Feed para phishing e Majestic Million para sites legítimos. Para reconstruí-lo com os feeds disponíveis no momento da nova execução:

```bash
node scripts/build-evaluation-dataset.js
```

Depois execute:

```bash
node scripts/evaluate-dataset.js evaluation/dataset-clean.csv evaluation/results.csv
```

O resultado registra `local_score`, `local_classification`, `external_listed`, `external_source` e `final_classification`. O terminal apresenta detecções, omissões, falsos alertas, liberações corretas, taxa de detecção, taxa de falso alerta e acurácia separadamente para o método local e o combinado.

Como os feeds mudam com o tempo, `evaluation/dataset-clean.csv` preserva exatamente a amostra utilizada e `evaluation/RUN_INFO.md` registra hashes, horário, versão do Node.js e commit avaliado.

## Limitações do MVP

No Manifest V3, `webNavigation` observa o início da navegação, mas não cancela sincronicamente uma requisição usando lógica JavaScript arbitrária. Assim, em navegações pela barra, uma requisição pode começar antes do redirecionamento para o aviso. O MVP não analisa HTML, formulários ou conteúdo remoto. A reputação pode conter falsos positivos, envelhece entre atualizações e não cobre ameaças ainda desconhecidas.

Os pesos e o limite heurístico são experimentais e ainda precisam ser calibrados com dados de pesquisa.

## Próximos passos

- calibrar pesos, limite e taxa de falsos positivos;
- automatizar e versionar atualizações periódicas da reputação;
- avaliar regras `declarativeNetRequest` para bloquear previamente domínios conhecidos;
- estudar sinais do conteúdo da página em uma segunda etapa.

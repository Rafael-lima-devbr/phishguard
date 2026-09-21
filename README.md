# PhishGuard

Extensão experimental para Microsoft Edge que analisa URLs localmente e intervém conforme o risco de uma página potencialmente fraudulenta.

## Funcionamento

O `analyzeUrl(url)` atribui um score a sinais simples, como HTTP, endereço IP, Punycode, URL longa, muitos subdomínios, `@` e termos sensíveis. A decisão resultante é:

- `safe`: navegação liberada;
- `suspicious`: exibe os motivos e permite voltar ou continuar;
- `blocked`: domínio da blacklist fictícia, sem opção de continuar.

Cliques são analisados pelo content script antes de sair da página. Outras navegações, inclusive URLs digitadas na barra, são observadas pelo service worker com `webNavigation.onBeforeNavigate` e redirecionadas para a tela de aviso quando necessário.

## Arquitetura

- `analysis.js`: motor heurístico central e blacklist local de testes.
- `content.js`: intercepta cliques em links.
- `background.js`: observa navegações da guia e controla a exceção de continuar uma vez.
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

## Limitações do MVP

No Manifest V3, `webNavigation` observa o início da navegação, mas não cancela sincronicamente uma requisição usando lógica JavaScript arbitrária. Assim, em navegações pela barra, uma requisição pode começar antes do redirecionamento para o aviso. O MVP não analisa HTML, formulários ou conteúdo remoto.

Os pesos e o limite heurístico são experimentais e ainda precisam ser calibrados com dados de pesquisa.

## Próximos passos

- calibrar pesos, limite e taxa de falsos positivos;
- ampliar e versionar fontes de ameaças confirmadas;
- avaliar regras `declarativeNetRequest` para bloquear previamente domínios conhecidos;
- estudar sinais do conteúdo da página em uma segunda etapa.

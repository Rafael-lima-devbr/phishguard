# Dataset de avaliação independente

- Obtido em: 2026-09-21T05:39:32.464Z
- Legítimas: 100
- Phishing: 100
- Total utilizado: 200
- Linhas candidatas brutas: 500
- Linhas descartadas na seleção/limpeza: 300
- Inválidas: 0
- Duplicatas phishing: 16
- Duplicatas legítimas: 0
- Sobreposição phishing com Phishing.Database: 0
- Sobreposição legítima com Phishing.Database: 0

## Fontes

- Phishing: OpenPhish Community Feed (https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt), feed textual público independente do Phishing.Database.
- Legítimas: Majestic Million (https://downloads.majestic.com/majestic_million.csv), primeiros domínios do ranking público, licenciado sob CC BY 3.0.

## Limpeza

Foram aceitas somente URLs HTTP(S) válidas. Duplicatas foram comparadas com a mesma normalização usada pelo MVP. Entradas que coincidiam com a base local Phishing.Database foram excluídas antes da seleção balanceada de 100 itens por classe. As URLs phishing foram preservadas como texto; os domínios Majestic foram representados como URLs HTTPS de raiz. Nenhum site listado foi aberto, visitado ou consultado individualmente.

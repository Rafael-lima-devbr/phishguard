# Execução da avaliação

- Commit do algoritmo avaliado: `2a85c031e97f68dbb2d6f802121fc42f47b75316`
- Branch: `main`
- Data/hora de obtenção do dataset: `2026-09-21T05:39:32.464Z`
- Data/hora de execução: `2026-09-21T02:39:44.7423415-03:00`
- Node.js: `v24.19.0`
- Dataset utilizado: `evaluation/dataset-clean.csv`
- Saída bruta: `evaluation/results.csv`
- Total processado: 200 URLs
- Legítimas: 100
- Phishing: 100
- Linhas inválidas: 0
- Duplicatas encontradas antes da seleção: 16
- Sobreposições com Phishing.Database no conjunto final: 0
- Erros durante a avaliação: 0

## Comando executado

```bash
node scripts/evaluate-dataset.js evaluation/dataset-clean.csv evaluation/results.csv
```

## Integridade dos arquivos

- SHA-256 de `dataset-clean.csv`: `565BB79AF28E80DE721FF32A52EFBE39EB38701EDFF31610FC0D8E75628625C6`
- SHA-256 de `results.csv`: `892ECAFC43BCADA1DAEB92A0AFE5EC2184611AE671B0202491CECCBEB9741F28`

Somente os arquivos de dados das fontes foram baixados. Nenhuma URL phishing presente no dataset foi aberta, visitada ou consultada individualmente.

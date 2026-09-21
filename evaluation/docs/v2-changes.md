# Alterações da V2

- Threshold V1: 40
- Threshold V2: 20

## Novas regras

- Imitação de marca fora do domínio oficial: +20.
- Hospedagem compartilhada combinada com marca ou autenticação: +10.
- Encurtadores `u.to`, `surl.li` e `1url.at`: +10.
- Hostname com dois ou mais hífens: +5.
- Hostname com quatro ou mais dígitos: +5.
- Pathname com mais de 60 caracteres: +5.

## Resultados

| Versão | Phishing detectados | Phishing não detectados | Falsos positivos | Legítimas corretas | Detecção | Falso alerta | Acurácia |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| V1 | 2/100 | 98/100 | 0/100 | 100/100 | 2% | 0% | 51% |
| V2 | 62/100 | 38/100 | 1/100 | 99/100 | 62% | 1% | 80,5% |

- Falsos negativos V2: 38.
- Falsos positivos V2: 1.

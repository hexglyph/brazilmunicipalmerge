# Projeto de redistribuição de municípios brasileiros

Este repositório contém um pipeline em Python que consome dados oficiais do IBGE para:

1. Baixar os limites territoriais dos municípios (malhas geográficas).
2. Coletar as estimativas de população residente de 2021 (agregado 6579, variável 9324).
3. Combinar municípios com população abaixo de 30 mil habitantes com o vizinho geográfico mais próximo até que todas as novas regiões superem o limite definido.
4. Gerar arquivos GeoJSON com os mapas original e resultante, além de um mapa comparativo em PNG.

## Pré-requisitos

- Python 3.10 (ou compatível).
- Pip disponível no ambiente (`python3 -m pip`).
- Acesso à internet para baixar dependências e consultar as APIs do IBGE.

Instale as dependências necessárias:

```bash
python3 -m pip install --user -r requirements.txt
```

## Executando o pipeline

```bash
python3 src/merge_municipalities.py
```

Parâmetros úteis:

- `--threshold`: população mínima desejada por região (padrão: 30000).
- `--population-year`: ano das estimativas populacionais IBGE (padrão: 2021).
- `--output-dir`: diretório onde os arquivos serão criados (padrão: `output/`).
- `--log-level`: nível de verbosidade do log (`DEBUG`, `INFO`, `WARNING`, `ERROR`).

Exemplo com limiar diferente:

```bash
python3 src/merge_municipalities.py --threshold 50000 --log-level DEBUG
```

## Saídas geradas

Após a execução, o diretório `output/` conterá:

- `municipios_original.geojson`: malha oficial dos municípios com população de 2021.
- `municipios_merged.geojson`: malha resultante após os merges.
- `mapa_comparativo.png`: painel com o mapa original e o mapa agregado.

## Frontend interativo (Next.js + Bun)

O diretório `frontend/` abriga uma aplicação Next.js (App Router) criada com Bun e Tailwind CSS.
Ela lê os GeoJSONs gerados pelo script Python e apresenta um mapa interativo com camadas
alternáveis (cenário original vs. cenário agregado), busca por município/região e um painel de
estatísticas resumidas.

### Comandos principais

Execute uma vez os comandos do pipeline Python (caso deseje atualizar os arquivos em `frontend/public/data/`):

```bash
python3 src/merge_municipalities.py
cp output/municipios_*.geojson frontend/public/data/
```

Depois, no diretório `frontend/`:

```bash
# instalar dependências (já controladas pelo bun.lock)
bun install

# ambiente de desenvolvimento
bun dev

# build de produção (verificação de tipagem incluída)
bun run build
```

Por padrão, o mapa consome os arquivos `public/data/municipios_original.geojson`
e `public/data/municipios_merged.geojson`. Se gerar novas simulações, basta substituir esses arquivos
ou configurar a variável `NEXT_PUBLIC_DATA_API_BASE_URL` apontando para um serviço gerador.

## Serviço gerador (FastAPI)

Para produção, exponha o pipeline como serviço HTTP usando FastAPI (diretório `generator/`):

```bash
python3 -m pip install --user -r requirements.txt
uvicorn generator.main:app --host 0.0.0.0 --port 8000
```

Com Docker:

```bash
docker build -t municipal-generator -f generator/Dockerfile .
docker run --rm -p 8000:8000 municipal-generator
```

Endpoints disponíveis:

- `GET /status` — estatísticas do cenário atual.
- `GET /geojson/original` — GeoJSON dos municípios na configuração oficial.
- `GET /geojson/merged` — GeoJSON das regiões após o merge.
- `POST /refresh` — força nova execução (aceita `threshold` e `population_year` opcionais).

Todos aceitam `threshold` (padrão 30000) e `population_year` (padrão 2021) via query string.
No frontend, configure `NEXT_PUBLIC_DATA_API_BASE_URL` (ex.: `https://seu-backend.up.railway.app`)
para consumir esses endpoints.

## Deploy no Railway

1. Crie **dois serviços**:
   - **Gerador (Python/FastAPI)** – comando: `uvicorn generator.main:app --host 0.0.0.0 --port ${PORT:-8000}`.
   - **Frontend (Bun/Next.js)** – comando: `bun install && bun run build && bunx next start -H 0.0.0.0 -p ${PORT:-3000}`.
2. No serviço do frontend defina a variável `NEXT_PUBLIC_DATA_API_BASE_URL`
   apontando para a URL pública do gerador.
3. Opcional: após cada deploy, acione `POST /refresh` no gerador para recomputar os GeoJSONs.

## Docker para o frontend

No diretório `frontend/`:

```bash
docker build -t municipal-frontend -f Dockerfile .
docker run --rm -e NEXT_PUBLIC_DATA_API_BASE_URL="http://localhost:8000" -p 3000:3000 municipal-frontend
```

## Observações

- O algoritmo usa a malha simplificada dos municípios (geobr, ano-base 2020) para acelerar a união geométrica.
- A escolha do vizinho considera primeiro a adjacência por fronteira; se a região estiver isolada (caso de ilhas), é usado o centroide mais próximo.
- Um aviso de log informa que o município `5101837` não possui estimativa populacional na série de 2021; ele é tratado com população zero antes dos merges.

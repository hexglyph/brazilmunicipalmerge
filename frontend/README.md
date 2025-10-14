## Visão geral

Aplicação Next.js (App Router) criada com Bun e Tailwind CSS. O painel consome os
GeoJSONs gerados pelo script Python localizado em `../src/merge_municipalities.py`
e oferece um mapa interativo (Leaflet) com alternância entre camadas, busca por
municípios/regiões e destaques de estatísticas da simulação (limiar de 30 mil habitantes).

## Pré-requisitos

- [Bun 1.2+](https://bun.sh)
- Node 20+ (instalado automaticamente pelo Bun)
- Os arquivos `public/data/municipios_original.geojson` e
  `public/data/municipios_merged.geojson` devem existir (eles já estão versionados; execute
  o pipeline Python para atualizar).

## Instalação

```bash
bun install
```

## Desenvolvimento

```bash
# dentro do diretório frontend/
bun dev
```

A aplicação rodará em `http://localhost:3000`.

## Build de produção

```bash
bun run build
```

Executa o build otimizado e checa tipagem/erros de runtime.

## Consumindo dados via API

Defina a variável de ambiente `NEXT_PUBLIC_DATA_API_BASE_URL` apontando para o
serviço FastAPI (ex.: `https://seu-backend.up.railway.app`). O frontend chamará
`/geojson/original` e `/geojson/merged` (com `threshold=30000` e `population_year=2021`)
para carregar os dados dinamicamente. Caso a variável não esteja configurada, o painel usa
os arquivos estáticos em `public/data`.

## Atualizando os dados do mapa (modo offline)

1. Gere novamente os GeoJSONs a partir do diretório raiz do projeto:

   ```bash
   python3 src/merge_municipalities.py
   ```

2. Copie os arquivos para `frontend/public/data` (substituindo os existentes):

   ```bash
   cp output/municipios_*.geojson frontend/public/data/
   ```

3. Reinicie (`bun dev`) ou replique o build.

## Estrutura principal

- `src/app/page.tsx`: página principal com layout e textos.
- `src/components/InteractiveMap.tsx`: componente cliente que carrega Leaflet dinamicamente e renderiza o mapa.
- `public/data/*.geojson`: dados utilizados pelo mapa.

## Deploy

Qualquer plataforma compatível com Next.js (Vercel, Netlify, etc.) pode ser utilizada.
Garanta que os arquivos GeoJSON estejam presentes em `public/data` ou configure
`NEXT_PUBLIC_DATA_API_BASE_URL` para apontar para o serviço gerador.

### Docker

```bash
docker build -t municipal-frontend -f Dockerfile .
docker run --rm -p 3000:3000 \
  -e NEXT_PUBLIC_DATA_API_BASE_URL="http://localhost:8000" \
  municipal-frontend
```

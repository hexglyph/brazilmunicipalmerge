'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';
import type { Map as LeafletMap } from 'leaflet';

type MapLayer = 'merged' | 'original';

type GeoFeature = Feature<Geometry, GeoJsonProperties>;
type GeoFeatureCollection = FeatureCollection<Geometry, GeoJsonProperties>;

type SearchOption = {
  id: string;
  name: string;
  dataset: MapLayer;
  feature: GeoFeature;
  population?: number;
  memberCount?: number;
};

const BRAZIL_BOUNDS: [[number, number], [number, number]] = [
  [-33.9, -73.99],
  [5.3, -34.79],
];

const DEFAULT_THRESHOLD = 30_000;
const DEFAULT_POPULATION_YEAR = 2021;

const layerPalette = {
  merged: {
    border: '#045a8d',
    fill: '#74a9cf',
    highlightBorder: '#c51b8a',
    highlightFill: '#fde0dd',
  },
  original: {
    border: '#01665e',
    fill: '#5ab4ac',
    highlightBorder: '#d7301f',
    highlightFill: '#fee0d2',
  },
} as const;

function computeLayerStats(featureCollection: GeoFeatureCollection | null) {
  if (!featureCollection) {
    return { count: 0, minPopulation: 0, maxPopulation: 0 };
  }

  const populations = featureCollection.features
    .map((feature) => feature.properties?.population as number | undefined)
    .filter((value): value is number => typeof value === 'number');

  if (!populations.length) {
    return { count: featureCollection.features.length, minPopulation: 0, maxPopulation: 0 };
  }

  return {
    count: featureCollection.features.length,
    minPopulation: Math.min(...populations),
    maxPopulation: Math.max(...populations),
  };
}

function getFeatureId(feature: GeoFeature): string | undefined {
  const props = feature.properties ?? {};
  return (
    (props.municipality_id as string | undefined) ??
    (props.region_id as string | undefined) ??
    (props.code_muni as string | undefined) ??
    (props.id as string | undefined) ??
    (feature.id as string | undefined)
  );
}

function getFeatureName(feature: GeoFeature): string {
  const props = feature.properties ?? {};
  return (
    (props.municipality_name as string | undefined) ??
    (props.representative_name as string | undefined) ??
    (props.nome as string | undefined) ??
    'Região'
  );
}

function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function InteractiveMap() {
  const [leafletComponents, setLeafletComponents] = useState<typeof import('react-leaflet')>();
  const [leafletLib, setLeafletLib] = useState<typeof import('leaflet')>();
  const [originalData, setOriginalData] = useState<GeoFeatureCollection | null>(null);
  const [mergedData, setMergedData] = useState<GeoFeatureCollection | null>(null);
  const [activeLayer, setActiveLayer] = useState<MapLayer>('merged');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOption, setSelectedOption] = useState<SearchOption | null>(null);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);

  const mapRef = useRef<LeafletMap | null>(null);
  const suggestionContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadDependencies() {
      if (typeof window === 'undefined') return;

      const [leafletModule, leafletLibModule] = await Promise.all([
        import('react-leaflet'),
        import('leaflet'),
      ]);
      setLeafletComponents(leafletModule);
      setLeafletLib(leafletLibModule);
    }

    loadDependencies();
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_DATA_API_BASE_URL?.replace(/\/$/, '');
        const queryParams = `?threshold=${DEFAULT_THRESHOLD}&population_year=${DEFAULT_POPULATION_YEAR}`;
        const remoteOriginal = baseUrl ? `${baseUrl}/geojson/original${queryParams}` : null;
        const remoteMerged = baseUrl ? `${baseUrl}/geojson/merged${queryParams}` : null;

        let originalResponse = await fetch(
          remoteOriginal ?? '/data/municipios_original.geojson',
          { cache: 'no-store' },
        );
        let mergedResponse = await fetch(remoteMerged ?? '/data/municipios_merged.geojson', {
          cache: 'no-store',
        });

        if (remoteOriginal && (!originalResponse.ok || !mergedResponse.ok)) {
          console.warn(
            'Falha ao baixar GeoJSON do serviço remoto, tentando fallback para arquivos locais.',
          );
          originalResponse = await fetch('/data/municipios_original.geojson');
          mergedResponse = await fetch('/data/municipios_merged.geojson');
        }

        if (!originalResponse.ok || !mergedResponse.ok) {
          throw new Error('Não foi possível carregar os arquivos GeoJSON.');
        }

        const [originalJson, mergedJson] = (await Promise.all([
          originalResponse.json(),
          mergedResponse.json(),
        ])) as GeoFeatureCollection[];

        setOriginalData(originalJson);
        setMergedData(mergedJson);
      } catch (error) {
        console.error(error);
        setErrorMessage('Houve um problema ao carregar os dados geográficos.');
      }
    }

    loadData();
  }, []);

  const currentData = activeLayer === 'merged' ? mergedData : originalData;

  const { count: originalCount, minPopulation: originalMin, maxPopulation: originalMax } =
    useMemo(() => computeLayerStats(originalData), [originalData]);

  const { count: mergedCount, minPopulation: mergedMin, maxPopulation: mergedMax } =
    useMemo(() => computeLayerStats(mergedData), [mergedData]);

  const searchOptions = useMemo(() => {
    const options: SearchOption[] = [];
    if (originalData) {
      originalData.features.forEach((feature, index) => {
        const props = feature.properties ?? {};
        const id = getFeatureId(feature) ?? `original-${index}`;
        options.push({
          id,
          name: getFeatureName(feature),
          dataset: 'original',
          feature,
          population: props.population as number | undefined,
        });
      });
    }
    if (mergedData) {
      mergedData.features.forEach((feature, index) => {
        const props = feature.properties ?? {};
        const id = getFeatureId(feature) ?? `merged-${index}`;
        options.push({
          id,
          name: getFeatureName(feature),
          dataset: 'merged',
          feature,
          population: props.population as number | undefined,
          memberCount: props.member_count as number | undefined,
        });
      });
    }
    return options.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [mergedData, originalData]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) {
      return searchOptions.slice(0, 12);
    }
    const normalized = normalizeText(searchTerm);
    return searchOptions
      .filter((option) => normalizeText(option.name).includes(normalized))
      .slice(0, 12);
  }, [searchOptions, searchTerm]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionContainerRef.current &&
        !suggestionContainerRef.current.contains(event.target as Node)
      ) {
        setIsSuggestionOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isLoading =
    !errorMessage && (!originalData || !mergedData || !leafletComponents || !leafletLib);

  const MapReady = leafletComponents
    ? function MapReadyInner() {
        const map = leafletComponents.useMap();
        useEffect(() => {
          mapRef.current = map;
        }, [map]);
        return null;
      }
    : null;

  function handleLayerChange(layer: MapLayer) {
    setActiveLayer(layer);
  }

  function handleSelection(option: SearchOption) {
    setSelectedOption(option);
    setSearchTerm(option.name);
    setIsSuggestionOpen(false);
    setActiveLayer(option.dataset);

    if (leafletLib && mapRef.current) {
      const tempLayer = leafletLib.geoJSON(option.feature);
      const bounds = tempLayer.getBounds();
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds.pad(0.08));
      }
    }
  }

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Visualize o novo arranjo municipal
            </h2>
            <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              Compare o desenho territorial atual com o cenário simulado em que todos os municípios
              possuem pelo menos 30 mil habitantes. Explore as camadas, busque por localidades e
              avalie o efeito da agregação regional.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-full bg-gradient-to-r from-sky-500/10 via-emerald-500/10 to-purple-500/10 px-5 py-3 text-xs font-medium uppercase tracking-wide text-sky-800 dark:text-sky-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Dados IBGE 2021 · Limite 30 mil hab.
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div
            ref={suggestionContainerRef}
            className="relative w-full max-w-xl rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-200 dark:border-slate-700 dark:bg-slate-900/70"
          >
            <label
              htmlFor="city-search"
              className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              Buscar município ou região
            </label>
            <input
              id="city-search"
              type="text"
              placeholder="Digite o nome da cidade ou região..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setIsSuggestionOpen(true);
              }}
              onFocus={() => setIsSuggestionOpen(true)}
              className="mt-1 w-full border-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
            />
            {isSuggestionOpen && (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900/95">
                {filteredOptions.length === 0 && (
                  <p className="px-4 py-3 text-sm text-slate-500">
                    Nenhuma localidade encontrada. Verifique a ortografia.
                  </p>
                )}
                <ul>
                  {filteredOptions.map((option) => (
                    <li
                      key={`${option.dataset}-${option.id}`}
                      className="flex cursor-pointer flex-col gap-1 px-4 py-3 text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelection(option)}
                    >
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {option.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {option.dataset === 'original' ? 'Município atual' : 'Região agregada'} ·{' '}
                        {option.population
                          ? `${option.population.toLocaleString('pt-BR')} habitantes`
                          : 'População não informada'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                activeLayer === 'merged'
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'border border-slate-300 bg-white text-slate-700 hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
              }`}
              onClick={() => handleLayerChange('merged')}
            >
              Brasil agregado ({mergedCount.toLocaleString('pt-BR')} regiões)
            </button>
            <button
              type="button"
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                activeLayer === 'original'
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/30'
                  : 'border border-slate-300 bg-white text-slate-700 hover:border-sky-400 hover:text-sky-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
              }`}
              onClick={() => handleLayerChange('original')}
            >
              Mapa original ({originalCount.toLocaleString('pt-BR')} municípios)
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-md dark:border-slate-700 dark:bg-slate-900/70">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
            Cenário original
          </h3>
          <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <p>Total de municípios: {originalCount.toLocaleString('pt-BR')}</p>
            <p>
              Faixa populacional: {originalMin.toLocaleString('pt-BR')} –{' '}
              {originalMax.toLocaleString('pt-BR')} hab.
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-md dark:border-slate-700 dark:bg-slate-900/70">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-sky-600">
            Cenário agregado
          </h3>
          <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <p>Total de regiões: {mergedCount.toLocaleString('pt-BR')}</p>
            <p>
              Faixa populacional: {mergedMin.toLocaleString('pt-BR')} –{' '}
              {mergedMax.toLocaleString('pt-BR')} hab.
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-purple-500/10 via-rose-500/10 to-orange-500/10 p-6 shadow-md dark:border-slate-700 dark:from-purple-900/30 dark:via-rose-900/30 dark:to-orange-900/30">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-200">
            Localidade destacada
          </h3>
          {selectedOption ? (
            <div className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-200">
              <p className="font-semibold text-slate-900 dark:text-white">
                {selectedOption.name}
              </p>
              <p>
                {selectedOption.dataset === 'original'
                  ? 'Município atual'
                  : 'Região agregada simulada'}
              </p>
              {selectedOption.population && (
                <p>
                  População estimada:{' '}
                  <span className="font-medium">
                    {selectedOption.population.toLocaleString('pt-BR')} hab.
                  </span>
                </p>
              )}
              {typeof selectedOption.memberCount === 'number' && (
                <p>
                  Municípios agregados:{' '}
                  <span className="font-medium">
                    {selectedOption.memberCount.toLocaleString('pt-BR')}
                  </span>
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Utilize a busca ou clique em um polígono no mapa para destacar detalhes da localidade.
            </p>
          )}
        </div>
      </div>

      <div className="min-h-[600px] w-full overflow-hidden rounded-3xl border border-slate-200 bg-white/70 shadow-2xl shadow-sky-500/10 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
        {errorMessage && (
          <div className="flex h-full items-center justify-center bg-red-100 text-red-900">
            {errorMessage}
          </div>
        )}
        {isLoading && (
          <div className="flex h-full items-center justify-center bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Carregando dados geográficos...
          </div>
        )}
        {!isLoading && !errorMessage && currentData && leafletComponents && leafletLib && (
          <leafletComponents.MapContainer
            bounds={BRAZIL_BOUNDS}
            style={{ height: '600px', width: '100%' }}
            maxBounds={[
              [-35, -82],
              [8, -28],
            ]}
            maxBoundsViscosity={0.6}
          >
            {MapReady && <MapReady />}
            <leafletComponents.TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <leafletComponents.GeoJSON
              key={activeLayer}
              data={currentData}
              style={(feature) => {
                const palette = layerPalette[activeLayer];
                const geoFeature = feature as GeoFeature;
                const isHighlighted =
                  selectedOption?.dataset === activeLayer && selectedOption.feature === geoFeature;

                return {
                  color: isHighlighted ? palette.highlightBorder : palette.border,
                  weight: isHighlighted ? 2.5 : activeLayer === 'merged' ? 0.8 : 0.5,
                  fillColor: isHighlighted ? palette.highlightFill : palette.fill,
                  fillOpacity: isHighlighted ? 0.75 : 0.55,
                  className: 'transition-all duration-300 ease-out',
                };
              }}
              onEachFeature={(feature, layer) => {
                const geoFeature = feature as GeoFeature;
                const props = geoFeature.properties ?? {};
                const name = getFeatureName(geoFeature);
                const population =
                  'population' in props ? Number(props.population).toLocaleString('pt-BR') : 'N/D';
                const members =
                  'member_count' in props ? Number(props.member_count).toLocaleString('pt-BR') : null;

                const popupLines = [
                  `<strong>${name}</strong>`,
                  `População: ${population} hab.`,
                ];

                if (members) {
                  popupLines.push(`Municípios de origem: ${members}`);
                }

                if ('states' in props && props.states) {
                  popupLines.push(`UF envolvidas: ${props.states}`);
                }

                layer.bindPopup(popupLines.join('<br/>'));
                layer.on('click', () => {
                  const option = searchOptions.find(
                    (item) => item.dataset === activeLayer && item.feature === geoFeature,
                  );
                  if (option) {
                    handleSelection(option);
                  }
                });
              }}
            />
          </leafletComponents.MapContainer>
        )}
      </div>
    </section>
  );
}

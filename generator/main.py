import asyncio
import json
import logging
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.merge_municipalities import (
    DEFAULT_POPULATION_YEAR,
    MINIMUM_POPULATION_THRESHOLD,
    run_merge_pipeline,
)


logger = logging.getLogger(__name__)


class PipelineCache:
    """Caches the most recent pipeline execution to avoid recomputation per request."""

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._threshold = MINIMUM_POPULATION_THRESHOLD
        self._population_year = DEFAULT_POPULATION_YEAR
        self._original_geojson: Dict[str, Any] | None = None
        self._merged_geojson: Dict[str, Any] | None = None
        self._stats: Dict[str, Any] | None = None

    async def ensure_data(self, threshold: int, population_year: int) -> None:
        """Ensure the cache has data for the requested parameters."""
        if (
            self._original_geojson is None
            or self._merged_geojson is None
            or self._threshold != threshold
            or self._population_year != population_year
        ):
            await self.refresh(threshold=threshold, population_year=population_year)

    async def refresh(self, threshold: int | None = None, population_year: int | None = None) -> None:
        """Re-run the pipeline and update cached payloads."""
        async with self._lock:
            if threshold is None:
                threshold = self._threshold
            if population_year is None:
                population_year = self._population_year

            logger.info(
                "Running municipality merge pipeline (threshold=%s, population_year=%s)",
                threshold,
                population_year,
            )

            original_gdf, merged_gdf, stats = await asyncio.to_thread(
                run_merge_pipeline, threshold, population_year
            )
            self._original_geojson = json.loads(original_gdf.to_json())
            self._merged_geojson = json.loads(merged_gdf.to_json())
            self._stats = stats
            self._threshold = threshold
            self._population_year = population_year

    def get_original_geojson(self) -> Dict[str, Any]:
        if self._original_geojson is None:
            raise RuntimeError("Pipeline cache not initialized.")
        return self._original_geojson

    def get_merged_geojson(self) -> Dict[str, Any]:
        if self._merged_geojson is None:
            raise RuntimeError("Pipeline cache not initialized.")
        return self._merged_geojson

    def get_stats(self) -> Dict[str, Any]:
        if self._stats is None:
            raise RuntimeError("Pipeline cache not initialized.")
        return {
            **self._stats,
            "cache_threshold": self._threshold,
            "cache_population_year": self._population_year,
        }


app = FastAPI(
    title="Municipality Merge Generator",
    description="API que executa o pipeline de fusão de municípios e expõe os GeoJSON resultantes.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

pipeline_cache = PipelineCache()


@app.on_event("startup")
async def startup() -> None:
    await pipeline_cache.refresh()


def _sanitize_threshold(value: int) -> int:
    if value <= 0:
        raise HTTPException(status_code=400, detail="threshold deve ser um inteiro positivo.")
    return value


def _sanitize_year(value: int) -> int:
    if value < 2000:
        raise HTTPException(status_code=400, detail="population_year deve ser igual ou superior a 2000.")
    return value


@app.get("/status")
async def status(
    threshold: int = Query(MINIMUM_POPULATION_THRESHOLD, description="População mínima desejada."),
    population_year: int = Query(DEFAULT_POPULATION_YEAR, description="Ano da estimativa populacional."),
) -> Dict[str, Any]:
    threshold = _sanitize_threshold(threshold)
    population_year = _sanitize_year(population_year)
    await pipeline_cache.ensure_data(threshold, population_year)
    return pipeline_cache.get_stats()


@app.get("/geojson/original")
async def geojson_original(
    threshold: int = Query(MINIMUM_POPULATION_THRESHOLD),
    population_year: int = Query(DEFAULT_POPULATION_YEAR),
) -> JSONResponse:
    threshold = _sanitize_threshold(threshold)
    population_year = _sanitize_year(population_year)
    await pipeline_cache.ensure_data(threshold, population_year)
    return JSONResponse(pipeline_cache.get_original_geojson())


@app.get("/geojson/merged")
async def geojson_merged(
    threshold: int = Query(MINIMUM_POPULATION_THRESHOLD),
    population_year: int = Query(DEFAULT_POPULATION_YEAR),
) -> JSONResponse:
    threshold = _sanitize_threshold(threshold)
    population_year = _sanitize_year(population_year)
    await pipeline_cache.ensure_data(threshold, population_year)
    return JSONResponse(pipeline_cache.get_merged_geojson())


@app.post("/refresh")
async def refresh(
    threshold: int = Query(MINIMUM_POPULATION_THRESHOLD, description="População mínima desejada."),
    population_year: int = Query(DEFAULT_POPULATION_YEAR, description="Ano da estimativa populacional."),
) -> Dict[str, Any]:
    threshold = _sanitize_threshold(threshold)
    population_year = _sanitize_year(population_year)
    await pipeline_cache.refresh(threshold, population_year)
    return {"detail": "Pipeline recalculado.", **pipeline_cache.get_stats()}

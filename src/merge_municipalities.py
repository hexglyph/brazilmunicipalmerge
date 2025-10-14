#!/usr/bin/env python3
"""
Pipeline to aggregate Brazilian municipalities under a minimum population threshold.

Steps:
1. Download municipal boundaries using the IBGE-supported `geobr` dataset.
2. Fetch IBGE population estimates (Aggregado 6579, variável 9324) for 2021.
3. Iteratively merge municipalities whose population is below the configured threshold
   with their closest neighboring municipality until all merged regions satisfy the constraint.
4. Export both the original and merged geodataframes and generate a comparison map.

The script assumes network access to the IBGE APIs and will cache downloads performed by
the underlying libraries in the user cache directory.
"""

from __future__ import annotations

import argparse
import logging
import os
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional, Set

import geopandas as gpd
import requests
from geobr import read_municipality
from shapely.geometry.base import BaseGeometry
from shapely.ops import unary_union

POPULATION_AGGREGATE_ID = 6579
POPULATION_VARIABLE_ID = 9324
DEFAULT_POPULATION_YEAR = 2021
MINIMUM_POPULATION_THRESHOLD = 30_000
CALCULATION_CRS = "EPSG:5880"  # SIRGAS 2000 / Brazil Polyconic (metric distances)
OUTPUT_CRS = "EPSG:4674"  # SIRGAS 2000 geographic coordinates


class MergeError(Exception):
    """Raised when the merge process cannot proceed."""


@dataclass
class Region:
    """Represents a mutable merged region during the aggregation process."""

    id: str
    members: Set[str]
    population: int
    geometry: BaseGeometry
    names: List[str]
    states: Set[str]
    neighbors: Set[str] = field(default_factory=set)

    def centroid_distance_to(self, other: "Region") -> float:
        return self.geometry.centroid.distance(other.geometry.centroid)

    def merge_with(self, other: "Region", new_id: str) -> "Region":
        merged_geometry = unary_union([self.geometry, other.geometry]).buffer(0)
        merged_population = self.population + other.population
        merged_members = self.members | other.members
        merged_names = self.names + other.names
        merged_states = self.states | other.states
        merged_neighbors = (self.neighbors | other.neighbors) - {self.id, other.id}
        return Region(
            id=new_id,
            members=merged_members,
            population=merged_population,
            geometry=merged_geometry,
            names=merged_names,
            states=merged_states,
            neighbors=merged_neighbors,
        )


def fetch_population(series_year: int) -> Dict[str, int]:
    """Fetch population estimates for all municipalities for the given year."""
    url = (
        "https://servicodados.ibge.gov.br/api/v3/agregados/"
        f"{POPULATION_AGGREGATE_ID}/periodos/{series_year}/variaveis/"
        f"{POPULATION_VARIABLE_ID}?localidades=N6%5Ball%5D"
    )
    logging.info("Requesting IBGE population data for %d", series_year)
    response = requests.get(url, timeout=120)
    response.raise_for_status()
    data = response.json()

    try:
        series = data[0]["resultados"][0]["series"]
    except (IndexError, KeyError) as exc:
        raise MergeError("Unexpected response structure from IBGE population API") from exc

    population: Dict[str, int] = {}
    for entry in series:
        locale = entry.get("localidade", {})
        geo_id = str(locale.get("id"))
        serie = entry.get("serie", {})
        value = serie.get(str(series_year))
        if geo_id and value:
            try:
                population[geo_id] = int(value)
            except ValueError:
                logging.warning("Ignoring non-numeric population value %s for %s", value, geo_id)
    logging.info("Loaded population data for %d municipalities", len(population))
    return population


def fetch_geometries() -> gpd.GeoDataFrame:
    """Download the municipal boundaries and return them in the calculation CRS."""
    logging.info("Downloading municipal geometries via geobr")
    gdf = read_municipality(year=2020, simplified=True)
    selected = gdf[["code_muni", "name_muni", "abbrev_state", "geometry"]].copy()
    selected["code_muni"] = selected["code_muni"].round().astype("int64").astype(str)
    selected = selected.to_crs(CALCULATION_CRS)
    selected = selected.rename(
        columns={"code_muni": "municipality_id", "name_muni": "municipality_name", "abbrev_state": "state"}
    )
    logging.info("Retrieved %d municipal polygons", len(selected))
    return selected


def build_adjacency(gdf: gpd.GeoDataFrame) -> Dict[str, Set[str]]:
    """Create an adjacency mapping keyed by municipality_id."""
    logging.info("Building adjacency graph")
    spatial_index = gdf.sindex
    adjacency: Dict[str, Set[str]] = {row.municipality_id: set() for row in gdf.itertuples()}
    for row in gdf.itertuples():
        candidate_idx = list(spatial_index.query(row.geometry, predicate="touches"))
        for neighbor_pos in candidate_idx:
            neighbor_row = gdf.iloc[neighbor_pos]
            if neighbor_row.municipality_id == row.municipality_id:
                continue
            adjacency[row.municipality_id].add(neighbor_row.municipality_id)
    logging.info("Adjacency graph completed")
    return adjacency


def initialize_regions(
    gdf: gpd.GeoDataFrame, population: Dict[str, int], adjacency: Dict[str, Set[str]]
) -> Dict[str, Region]:
    regions: Dict[str, Region] = {}
    for row in gdf.itertuples():
        pop = population.get(row.municipality_id, 0)
        region = Region(
            id=row.municipality_id,
            members={row.municipality_id},
            population=pop,
            geometry=row.geometry,
            names=[row.municipality_name],
            states={row.state},
            neighbors=set(adjacency.get(row.municipality_id, set())),
        )
        regions[region.id] = region
    return regions


def pick_closest_neighbor(region: Region, regions: Dict[str, Region]) -> Optional[Region]:
    """Choose the neighboring region with the smallest centroid distance."""
    valid_neighbors = [regions[nid] for nid in region.neighbors if nid in regions]
    if not valid_neighbors:
        # Fallback: pick the overall closest region to ensure progress (for islands, etc.)
        fallback_candidates = [
            candidate for candidate in regions.values() if candidate.id != region.id
        ]
        if not fallback_candidates:
            return None
        return min(fallback_candidates, key=region.centroid_distance_to)
    return min(valid_neighbors, key=region.centroid_distance_to)


def perform_merges(regions: Dict[str, Region], threshold: int) -> Dict[str, Region]:
    """Iteratively merge regions until all satisfy the population threshold."""
    loop_guard = 0
    while True:
        under_threshold = [r for r in regions.values() if r.population < threshold]
        if not under_threshold:
            break
        region = min(under_threshold, key=lambda r: r.population)
        neighbor = pick_closest_neighbor(region, regions)
        if neighbor is None:
            raise MergeError(f"Region {region.id} has no available neighbors to merge with.")

        new_id = "+".join(sorted(region.members | neighbor.members))
        merged = region.merge_with(neighbor, new_id)

        # Update neighbor references
        for neighbor_id in merged.neighbors:
            if neighbor_id not in regions:
                continue
            neighbor_region = regions[neighbor_id]
            neighbor_region.neighbors.discard(region.id)
            neighbor_region.neighbors.discard(neighbor.id)
            neighbor_region.neighbors.add(merged.id)

        # Replace old regions with merged region
        del regions[region.id]
        del regions[neighbor.id]
        regions[merged.id] = merged

        loop_guard += 1
        if loop_guard % 100 == 0:
            logging.info(
                "Merge step %d: merged %s and %s -> %s (population=%d)",
                loop_guard,
                region.id,
                neighbor.id,
                merged.id,
                merged.population,
            )

    logging.info("Completed merges in %d iterations", loop_guard)
    return regions


def regions_to_geodataframe(regions: Dict[str, Region]) -> gpd.GeoDataFrame:
    """Convert the final regions to a GeoDataFrame in the desired output CRS."""
    records = []
    for region in regions.values():
        records.append(
            {
                "region_id": region.id,
                "population": region.population,
                "member_count": len(region.members),
                "states": ",".join(sorted(region.states)),
                "representative_name": max(region.names, key=len),
                "geometry": region.geometry,
            }
        )
    result = gpd.GeoDataFrame(records, geometry="geometry", crs=CALCULATION_CRS)
    return result.to_crs(OUTPUT_CRS)


def generate_map(original: gpd.GeoDataFrame, merged: gpd.GeoDataFrame, output_path: str) -> None:
    """Plot the original and merged municipal layouts side by side."""
    import matplotlib.pyplot as plt

    fig, axes = plt.subplots(1, 2, figsize=(18, 12))
    original.to_crs(OUTPUT_CRS).plot(
        ax=axes[0], linewidth=0.1, edgecolor="gray", facecolor="#e0f3db"
    )
    axes[0].set_title("Mapa original dos municípios (2020)")
    axes[0].axis("off")

    merged.plot(ax=axes[1], linewidth=0.2, edgecolor="black", facecolor="#a8ddb5")
    axes[1].set_title("Mapa após merges (≥ 30 mil habitantes)")
    axes[1].axis("off")

    plt.tight_layout()
    plt.savefig(output_path, dpi=200)
    plt.close(fig)
    logging.info("Saved comparison map to %s", output_path)


def run_merge_pipeline(
    threshold: int = MINIMUM_POPULATION_THRESHOLD, population_year: int = DEFAULT_POPULATION_YEAR
) -> tuple[gpd.GeoDataFrame, gpd.GeoDataFrame, Dict[str, int]]:
    """Execute the municipality merge pipeline and return GeoDataFrames plus summary stats."""
    population = fetch_population(population_year)
    geometries = fetch_geometries()
    geometries["population"] = geometries["municipality_id"].map(population).fillna(0).astype(int)
    adjacency = build_adjacency(geometries)
    regions = initialize_regions(geometries, population, adjacency)
    final_regions = perform_merges(regions, threshold=threshold)
    merged_gdf = regions_to_geodataframe(final_regions)

    original_gdf = geometries.to_crs(OUTPUT_CRS)[
        ["municipality_id", "municipality_name", "state", "population", "geometry"]
    ].copy()

    stats = {
        "threshold": int(threshold),
        "population_year": int(population_year),
        "original_count": int(len(original_gdf)),
        "merged_count": int(len(merged_gdf)),
        "original_min_population": int(original_gdf["population"].min()) if not original_gdf.empty else 0,
        "original_max_population": int(original_gdf["population"].max()) if not original_gdf.empty else 0,
        "merged_min_population": int(merged_gdf["population"].min()) if not merged_gdf.empty else 0,
        "merged_max_population": int(merged_gdf["population"].max()) if not merged_gdf.empty else 0,
    }

    return original_gdf, merged_gdf, stats


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Merge Brazilian municipalities under a population threshold.")
    parser.add_argument(
        "--threshold",
        type=int,
        default=MINIMUM_POPULATION_THRESHOLD,
        help="Minimum population required for each merged region (default: %(default)s).",
    )
    parser.add_argument(
        "--population-year",
        type=int,
        default=DEFAULT_POPULATION_YEAR,
        help="Year of IBGE population estimates to use (default: %(default)s).",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="output",
        help="Directory where artefacts (GeoJSON, map) will be stored (default: %(default)s).",
    )
    parser.add_argument(
        "--log-level",
        type=str,
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Logging verbosity (default: %(default)s).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    logging.basicConfig(level=getattr(logging, args.log_level), format="%(levelname)s:%(message)s")

    original_gdf, merged_gdf, _ = run_merge_pipeline(
        threshold=args.threshold, population_year=args.population_year
    )

    os.makedirs(args.output_dir, exist_ok=True)
    original_output = os.path.join(args.output_dir, "municipios_original.geojson")
    merged_output = os.path.join(args.output_dir, "municipios_merged.geojson")
    map_output = os.path.join(args.output_dir, "mapa_comparativo.png")

    original_gdf.to_file(original_output, driver="GeoJSON")
    merged_gdf.to_file(merged_output, driver="GeoJSON")
    logging.info("Saved GeoJSON outputs to %s and %s", original_output, merged_output)

    generate_map(original_gdf, merged_gdf, map_output)


if __name__ == "__main__":
    main()

"""
data_collection.py
------------------
Parallel extraction pipeline for Sentinel-5P TROPOMI NO2 Level-3 data from GEE.
"""

import os
import pandas as pd
import ee
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm

from config import (
    EE_DATASET_ID,
    TARGET_BAND,
    QA_BAND,
    MAX_CLOUD_FRACTION,
    SPATIAL_SCALE_METERS,
    STUDY_REGIONS,
    PROCESSED_CSV_PATH
)
from gee_auth import initialize_gee

def mask_s5p_quality(image):
    """Applies cloud fraction filtering (cloud_fraction <= 0.20)."""
    cloud = image.select(QA_BAND)
    mask = cloud.lte(MAX_CLOUD_FRACTION)
    return image.updateMask(mask)

def process_monthly_region(task):
    """Extracts spatial statistics for a single region, year, and month."""
    region_name, bbox, year, month = task
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"

    if year < 2020:
        period = "Before"
    elif year in (2020, 2021):
        period = "During"
    else:
        period = "After"

    try:
        geometry = ee.Geometry.BBox(*bbox)
        col = (
            ee.ImageCollection(EE_DATASET_ID)
            .filterBounds(geometry)
            .filterDate(start_date, end_date)
            .map(mask_s5p_quality)
        )

        raw_count = col.size().getInfo()
        if raw_count == 0:
            return {
                "region": region_name,
                "date": start_date,
                "year": year,
                "month": month,
                "period": period,
                "no2_monthly_mean": None,
                "mean_valid_observations": 0,
                "valid_pixel_coverage_fraction": 0.0,
                "unique_raw_images": 0
            }

        monthly_img = col.select(TARGET_BAND).mean()
        stats = monthly_img.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=SPATIAL_SCALE_METERS,
            maxPixels=1e9
        ).getInfo()

        val = stats.get(TARGET_BAND)

        return {
            "region": region_name,
            "date": start_date,
            "year": year,
            "month": month,
            "period": period,
            "no2_monthly_mean": val,
            "mean_valid_observations": raw_count,
            "valid_pixel_coverage_fraction": 1.0 if val is not None else 0.0,
            "unique_raw_images": raw_count
        }
    except Exception as e:
        print(f"\n[ERROR] Task failed for {region_name} ({year}-{month}): {e}")
        return None

def run_extraction(test_mode=False):
    """Runs parallel data extraction across regions and time periods."""
    # Ensure GEE session is initialized
    initialize_gee()

    if test_mode:
        print("\n[TEST MODE] Running single month extraction: Greater Cairo (July 2018)...")
        cairo_bbox = STUDY_REGIONS["Greater Cairo, Egypt"]["bbox"]
        res = process_monthly_region(("Greater Cairo, Egypt", cairo_bbox, 2018, 7))
        df = pd.DataFrame([res])
        print("\n--- TEST MODE RESULT ---")
        print(df.to_string(index=False))
        return df

    tasks = []
    for region_name, info in STUDY_REGIONS.items():
        bbox = info["bbox"]
        for year in range(2018, 2025):
            start_m = 7 if year == 2018 else 1
            end_m = 12
            for month in range(start_m, end_m + 1):
                tasks.append((region_name, bbox, year, month))

    print(f"\n[INFO] Starting parallel extraction pipeline ({len(tasks)} tasks across 8 workers)...")
    results = []

    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(process_monthly_region, task) for task in tasks]
        for future in tqdm(as_completed(futures), total=len(tasks), desc="Extracting Regional Time-Series"):
            res = future.result()
            if res is not None:
                results.append(res)

    if not results:
        print("[FATAL] No data extracted! Check Earth Engine connection.")
        return None

    df = pd.DataFrame(results)
    df.sort_values(by=["region", "date"], inplace=True)

    os.makedirs(os.path.dirname(PROCESSED_CSV_PATH), exist_ok=True)
    df.to_csv(PROCESSED_CSV_PATH, index=False)
    print(f"\n[SUCCESS] Extraction complete! Data saved to {PROCESSED_CSV_PATH} ({len(df)} rows).")
    return df

if __name__ == "__main__":
    run_extraction()
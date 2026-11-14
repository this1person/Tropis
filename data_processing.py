"""
data_processing.py
------------------
Data validation, cleaning, unit conversions, and missing-value diagnostics.
"""

import os
import pandas as pd
import numpy as np
from config import PROCESSED_CSV_PATH, UNIT_CONVERSION_FACTOR, UNIT_LABEL

def load_and_validate_data(csv_path=PROCESSED_CSV_PATH):
    """
    Loads, cleans, and validates the extracted NO2 CSV file.
    Performs unit conversions and identifies missing or anomalous records.
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(
            f"CSV file not found at {csv_path}. Please run data_collection.py first."
        )

    df = pd.read_csv(csv_path)
    print(f"[INFO] Loaded dataset from {csv_path} with shape: {df.shape}")

    # Validate required columns
    req_cols = [
        "region", "date", "year", "month", "period",
        "no2_monthly_mean", "mean_valid_observations", "valid_pixel_coverage_fraction"
    ]
    for col in req_cols:
        if col not in df.columns:
            raise KeyError(f"Missing required column in CSV: {col}")

    # Parse dates
    df["date"] = pd.to_datetime(df["date"])

    # Unit Conversion: mol/m^2 to umol/m^2
    df["no2_umol_m2"] = df["no2_monthly_mean"] * UNIT_CONVERSION_FACTOR

    # Data Quality Validation
    null_counts = df["no2_monthly_mean"].isnull().sum()
    print(f"[INFO] Missing/Null NO2 monthly mean records: {null_counts} / {len(df)}")

    # Check suspicious negative values (S5P retrieval artifacts near zero background)
    neg_count = (df["no2_monthly_mean"] < 0).sum()
    if neg_count > 0:
        print(f"[WARNING] Detected {neg_count} negative NO2 values. Note: Small negative values occur in raw TROPOMI retrievals over clean marine/remote background.")

    # Sort deterministically
    df = df.sort_values(by=["region", "date"]).reset_index(drop=True)

    # Coverage summary
    low_cov = df[df["valid_pixel_coverage_fraction"] < 0.5]
    if not low_cov.empty:
        print(f"[WARNING] {len(low_cov)} records have valid pixel coverage < 50%.")

    return df

def generate_data_quality_report(df):
    """
    Generates a regional summary of data completeness and observation density.
    """
    report = df.groupby("region").agg(
        total_months=("date", "count"),
        valid_months=("no2_monthly_mean", lambda x: x.notnull().sum()),
        mean_observations_per_pixel=("mean_valid_observations", "mean"),
        mean_coverage_fraction=("valid_pixel_coverage_fraction", "mean")
    ).reset_index()

    return report

if __name__ == "__main__":
    df = load_and_validate_data()
    report = generate_data_quality_report(df)
    print("\n--- DATA QUALITY & COMPLETENESS REPORT ---")
    print(report.to_string(index=False))
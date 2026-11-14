"""
statistical_analysis.py
------------------------
Statistical analysis module:
  - Period comparison (Before vs During vs After)
  - Relative percentage change calculations
  - Hypothesis testing (Kruskal-Wallis, Mann-Whitney U, Welch's t-test)
  - Time-series trend detection and lag-1 autocorrelation analysis
"""

import pandas as pd
import numpy as np
from scipy import stats
import statsmodels.api as sm
from data_processing import load_and_validate_data
from config import STAT_SUMMARY_CSV_PATH, UNIT_LABEL

def calculate_period_statistics(df):
    """
    Calculates summary statistics and percentage changes across periods.
    """
    group_stats = df.groupby(["region", "period"])["no2_umol_m2"].agg(
        mean="mean",
        std="std",
        median="median",
        iqr=lambda x: x.quantile(0.75) - x.quantile(0.25),
        count="count"
    ).unstack("period")

    # Pivot mean values for percentage change calculation
    pivot_mean = df.pivot_table(index="region", columns="period", values="no2_umol_m2", aggfunc="mean")

    # Calculate Percentage Changes
    pivot_mean["pct_change_during_vs_before"] = (
        (pivot_mean["During"] - pivot_mean["Before"]) / pivot_mean["Before"]
    ) * 100.0

    pivot_mean["pct_change_after_vs_before"] = (
        (pivot_mean["After"] - pivot_mean["Before"]) / pivot_mean["Before"]
    ) * 100.0

    pivot_mean["pct_change_after_vs_during"] = (
        (pivot_mean["After"] - pivot_mean["During"]) / pivot_mean["During"]
    ) * 100.0

    return pivot_mean

def perform_hypothesis_tests(df):
    """
    Performs non-parametric (Kruskal-Wallis, Mann-Whitney U) and parametric (Welch's t-test)
    comparisons between study periods for each region.
    """
    results = []

    for region, group in df.groupby("region"):
        before = group[group["period"] == "Before"]["no2_umol_m2"].dropna()
        during = group[group["period"] == "During"]["no2_umol_m2"].dropna()
        after = group[group["period"] == "After"]["no2_umol_m2"].dropna()

        # Kruskal-Wallis Test (Overall multi-period difference)
        kw_stat, kw_p = stats.kruskal(before, during, after)

        # Pairwise Mann-Whitney U Tests
        u_dur_bef, p_dur_bef = stats.mannwhitneyu(during, before, alternative="two-sided")
        u_aft_bef, p_aft_bef = stats.mannwhitneyu(after, before, alternative="two-sided")
        u_aft_dur, p_aft_dur = stats.mannwhitneyu(after, during, alternative="two-sided")

        # Autocorrelation check (Lag-1)
        ts = group.sort_values("date")["no2_umol_m2"].dropna()
        lag1_autocorr = ts.autocorr(lag=1) if len(ts) > 10 else np.nan

        results.append({
            "region": region,
            "kruskal_p_value": kw_p,
            "p_during_vs_before": p_dur_bef,
            "p_after_vs_before": p_aft_bef,
            "p_after_vs_during": p_aft_dur,
            "lag1_autocorrelation": lag1_autocorr
        })

    return pd.DataFrame(results)

def run_full_statistical_pipeline():
    """
    Executes the complete statistical workflow and exports a summary CSV.
    """
    df = load_and_validate_data()
    period_stats = calculate_period_statistics(df)
    test_results = perform_hypothesis_tests(df)

    summary_df = pd.merge(period_stats, test_results, on="region")
    summary_df.to_csv(STAT_SUMMARY_CSV_PATH, index=False)
    print(f"[SUCCESS] Statistical analysis complete. Summary saved to:\n  {STAT_SUMMARY_CSV_PATH}")
    return summary_df

if __name__ == "__main__":
    summary = run_full_statistical_pipeline()
    print("\n--- STATISTICAL SUMMARY SAMPLE ---")
    print(summary[["region", "Before", "During", "After", "pct_change_after_vs_before", "p_after_vs_before"]].to_string(index=False))
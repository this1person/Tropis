"""
visualizations.py
-----------------
Generates publication-quality static Matplotlib charts and interactive Plotly figures.
"""

import matplotlib.pyplot as plt
import seaborn as sns
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
import numpy as np

from config import PERIOD_BEFORE, PERIOD_DURING, PERIOD_AFTER, UNIT_LABEL
from data_processing import load_and_validate_data

# Set styling
sns.set_theme(style="whitegrid", font_scale=1.1)

def plot_all_regions_timeseries(df):
    """
    Generates a 12-panel Matplotlib grid showing monthly NO2 time series across all regions.
    """
    regions = df["region"].unique()
    fig, axes = plt.subplots(4, 3, figsize=(18, 14), sharex=True)
    axes = axes.flatten()

    for idx, reg in enumerate(regions):
        ax = axes[idx]
        sub = df[df["region"] == reg].sort_values("date")

        ax.plot(sub["date"], sub["no2_umol_m2"], color="#1f77b4", linewidth=1.5, label="Monthly NO₂")
        
        # Period Shading
        ax.axvspan(pd.to_datetime(PERIOD_BEFORE[0]), pd.to_datetime(PERIOD_BEFORE[1]), color="#bbdefb", alpha=0.3, label="Before")
        ax.axvspan(pd.to_datetime(PERIOD_DURING[0]), pd.to_datetime(PERIOD_DURING[1]), color="#ffe0b2", alpha=0.4, label="During")
        ax.axvspan(pd.to_datetime(PERIOD_AFTER[0]), pd.to_datetime(PERIOD_AFTER[1]), color="#c8e6c9", alpha=0.3, label="After")

        ax.set_title(reg, fontsize=12, fontweight="bold")
        ax.set_ylabel(f"NO₂ ({UNIT_LABEL})", fontsize=9)
        ax.tick_params(axis='x', rotation=30, labelsize=8)

    plt.tight_layout()
    return fig

def plot_interactive_timeseries(df, selected_region):
    """
    Generates an interactive Plotly time-series chart for a single region.
    """
    sub = df[df["region"] == selected_region].sort_values("date")

    fig = go.Figure()

    # Add NO2 line
    fig.add_trace(go.Scatter(
        x=sub["date"],
        y=sub["no2_umol_m2"],
        mode="lines+markers",
        name=f"NO₂ Mean ({UNIT_LABEL})",
        line=dict(color="#0d47a1", width=2.5),
        marker=dict(size=5),
        hovertemplate="<b>Date</b>: %{x|%B %Y}<br><b>NO₂</b>: %{y:.2f} " + UNIT_LABEL + "<extra></extra>"
    ))

    # Highlights for Periods
    fig.add_vrect(x0=PERIOD_BEFORE[0], x1=PERIOD_BEFORE[1], fillcolor="blue", opacity=0.08, layer="below", line_width=0)
    fig.add_vrect(x0=PERIOD_DURING[0], x1=PERIOD_DURING[1], fillcolor="orange", opacity=0.12, layer="below", line_width=0)
    fig.add_vrect(x0=PERIOD_AFTER[0], x1=PERIOD_AFTER[1], fillcolor="green", opacity=0.08, layer="below", line_width=0)

    fig.update_layout(
        title=f"Tropospheric NO₂ Time Series — {selected_region}",
        xaxis_title="Date",
        yaxis_title=f"Tropospheric NO₂ Column Density ({UNIT_LABEL})",
        template="plotly_white",
        hovermode="x unified",
        height=450
    )

    return fig

def plot_period_bar_comparison(stat_df):
    """
    Generates a Plotly bar chart comparing Before, During, and After NO2 levels across cities.
    """
    melted = stat_df.melt(
        id_vars=["region"],
        value_vars=["Before", "During", "After"],
        var_name="Period",
        value_name="NO2_Mean"
    )

    fig = px.bar(
        melted,
        x="region",
        y="NO2_Mean",
        color="Period",
        barmode="group",
        labels={"NO2_Mean": f"NO₂ Mean ({UNIT_LABEL})", "region": "Metropolitan Region"},
        color_discrete_map={"Before": "#2b5c8f", "During": "#e67e22", "After": "#27ae60"},
        title="Tropospheric NO₂ Mean Levels Across COVID-19 Periods"
    )

    fig.update_layout(template="plotly_white", xaxis_tickangle=-35, height=500)
    return fig

def plot_percentage_change_chart(stat_df):
    """
    Generates a horizontal bar chart displaying percentage changes relative to pre-pandemic baseline.
    """
    fig = go.Figure()

    fig.add_trace(go.Bar(
        y=stat_df["region"],
        x=stat_df["pct_change_during_vs_before"],
        name="During vs Before (%)",
        orientation="h",
        marker=dict(color="#e67e22")
    ))

    fig.add_trace(go.Bar(
        y=stat_df["region"],
        x=stat_df["pct_change_after_vs_before"],
        name="After vs Before (%)",
        orientation="h",
        marker=dict(color="#27ae60")
    ))

    fig.update_layout(
        title="Relative NO₂ Change (%) Compared to Pre-Pandemic Baseline (2018–2019)",
        xaxis_title="Percentage Change (%)",
        yaxis_title="Region",
        barmode="group",
        template="plotly_white",
        height=550
    )

    return fig

if __name__ == "__main__":
    df = load_and_validate_data()
    fig = plot_all_regions_timeseries(df)
    plt.savefig("test_grid.png")
    print("[SUCCESS] Test plot generated.")
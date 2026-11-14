"""
dashboard.py
------------
Streamlit Web Application for visualizing global tropospheric NO2 dynamics
across COVID-19 pandemic phases (2018-2024).
"""

import os
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from config import PROCESSED_CSV_PATH, STUDY_REGIONS

STATISTICAL_SUMMARY_PATH = os.path.join("data", "processed", "no2_statistical_summary.csv")

REGION_METADATA = {
    "Cairo": {"iso": "EGY", "country": "Egypt"},
    "Johannesburg": {"iso": "ZAF", "country": "South Africa"},
    "Delhi": {"iso": "IND", "country": "India"},
    "Beijing": {"iso": "CHN", "country": "China"},
    "Seoul": {"iso": "KOR", "country": "South Korea"},
    "Tokyo": {"iso": "JPN", "country": "Japan"},
    "Milan": {"iso": "ITA", "country": "Italy"},
    "Madrid": {"iso": "ESP", "country": "Spain"},
    "London": {"iso": "GBR", "country": "United Kingdom"},
    "New York": {"iso": "USA", "country": "United States"},
    "São Paulo": {"iso": "BRA", "country": "Brazil"},
    "Sydney": {"iso": "AUS", "country": "Australia"}
}

st.set_page_config(
    page_title="Global NO2 COVID-19 Impact Analysis",
    page_icon="🛰️",
    layout="wide"
)

# ==========================================
# CINEMATIC SPACE & NASA DESIGN SYSTEM (CSS)
# ==========================================
# Colors from brief: Deep Space #080D18, Dark Navy #111C2D, Muted Navy #243B55, Atmospheric Blue #46B9E8, Warm Highlight #F28C45
plot_template = "plotly_dark"
bg_color = "#080D18"
panel_color = "#111C2D"
card_color = "#243B55"
text_color = "#E2E8F0"
accent_blue = "#46B9E8"
grid_color = "#243B55"
map_style = "carto-darkmatter"

st.markdown("""
    <style>
    /* Import Fonts */
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@300;400;500&family=Space+Grotesk:wght@500;700&display=swap');

    /* Global App Background - Cinematic Earth */
    [data-testid="stAppViewContainer"] {
        background-image: linear-gradient(to bottom, rgba(8, 13, 24, 0.7), rgba(8, 13, 24, 0.95), rgba(8, 13, 24, 1)), 
                          url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2000&auto=format&fit=crop');
        background-size: cover;
        background-position: center top;
        background-attachment: fixed;
        color: #E2E8F0;
        font-family: 'Inter', sans-serif;
    }

    /* Sidebar - NASA Mission Control Style */
    [data-testid="stSidebar"] {
        background-color: rgba(17, 28, 45, 0.9) !important;
        border-right: 1px solid #243B55;
        backdrop-filter: blur(10px);
    }
    
    /* Typography Hierarchy */
    h1, h2, h3 {
        font-family: 'Space Grotesk', sans-serif !important;
        color: #FFFFFF !important;
        letter-spacing: -0.5px;
    }
    h1 { font-size: 2.8rem !important; text-shadow: 0 0 20px rgba(70, 185, 232, 0.3); }
    h2 { font-size: 1.8rem !important; border-bottom: 1px solid #243B55; padding-bottom: 10px; }
    
    /* Monospaced Technical Details */
    [data-testid="stMetricValue"], [data-testid="stMetricLabel"], .stSlider label {
        font-family: 'IBM Plex Mono', monospace !important;
    }
    [data-testid="stMetricValue"] {
        color: #46B9E8 !important; /* Atmospheric Blue */
    }
    
    /* Cards and Panels */
    div[data-testid="metric-container"] {
        background-color: #111C2D;
        border: 1px solid #243B55;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        transition: transform 0.2s ease, border-color 0.2s ease;
    }
    div[data-testid="metric-container"]:hover {
        transform: translateY(-2px);
        border-color: #46B9E8;
    }

    /* Expander styling */
    .streamlit-expanderHeader {
        font-family: 'Space Grotesk', sans-serif !important;
        background-color: #111C2D !important;
        border-radius: 6px !important;
        border: 1px solid #243B55 !important;
    }
    
    /* Custom Slider */
    div[data-baseweb="slider"] div[data-testid="stTickBar"] + div { 
        height: 8px !important; 
        border-radius: 4px !important; 
        background: #243B55 !important;
    }
    div[data-baseweb="slider"] div[role="slider"] { 
        height: 20px !important; 
        width: 20px !important; 
        background-color: #F28C45 !important; /* Warm Highlight */
        border: 2px solid #FFFFFF !important;
    }

    /* Footer */
    .footer {
        text-align: center;
        padding: 30px;
        font-size: 14px;
        color: #94A3B8;
        background-color: rgba(17, 28, 45, 0.8);
        border: 1px solid #243B55;
        border-radius: 12px;
        margin-top: 60px;
        backdrop-filter: blur(5px);
        font-family: 'Inter', sans-serif;
    }
    .footer h4 {
        font-family: 'Space Grotesk', sans-serif;
        color: #46B9E8;
        margin-bottom: 15px;
    }
    .footer a { color: #F28C45; text-decoration: none; font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
    .footer a:hover { color: #46B9E8; text-decoration: underline; }
    
    /* Smooth Fade In */
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .stApp {
        animation: fadeIn 0.8s ease-out;
    }
    </style>
""", unsafe_allow_html=True)

@st.cache_data
def load_data():
    if not os.path.exists(PROCESSED_CSV_PATH):
        st.error(f"Processed dataset not found at {PROCESSED_CSV_PATH}.")
        st.stop()
    df = pd.read_csv(PROCESSED_CSV_PATH)
    
    def get_meta(region_name, meta_type):
        for key, meta in REGION_METADATA.items():
            if key.lower() in region_name.lower():
                return meta[meta_type]
        return None
        
    df['iso_alpha'] = df['region'].apply(lambda x: get_meta(x, 'iso'))
    df['country'] = df['region'].apply(lambda x: get_meta(x, 'country'))
    return df

@st.cache_data
def load_summary():
    if os.path.exists(STATISTICAL_SUMMARY_PATH):
        return pd.read_csv(STATISTICAL_SUMMARY_PATH)
    return None

df = load_data()
df_summary = load_summary()

default_palette = [
    "#46B9E8", "#F28C45", "#00CC96", "#AB63FA", "#FFA15A", 
    "#19D3F3", "#FF6692", "#B6E880", "#FF97FF", "#FECB52",
    "#E6194B", "#3CB44B"
]
all_regions = sorted(df['region'].unique().tolist())
global_colors = {region: default_palette[i % len(default_palette)] for i, region in enumerate(all_regions)}

# ==========================================
# 1. HEADER & SCIENTIFIC CONTEXT 
# ==========================================
st.title("🛰️ Global Tropospheric NO₂ Dynamics")
st.markdown("<p style='font-family: \"IBM Plex Mono\", monospace; color: #94A3B8; font-size: 14px;'>SYS.LOG // ANALYZING SENTINEL-5P TROPOMI SATELLITE MEASUREMENTS ACROSS 12 METROPOLITAN REGIONS.</p>", unsafe_allow_html=True)

st.header("📖 Scientific Context")
with st.expander("MISSION BRIEF: Why do we track NO₂?", expanded=False):
    st.markdown("""
    * **Health Hazards:** The WHO lowered its yearly NO₂ guideline to 10 micrograms per cubic metre in 2021. Short-term exposure is heavily linked to airway irritation and aggravated asthma.
    * **Dangerous Byproducts:** NO₂ is the main precursor to ground-level ozone and nitrate aerosols, which are a component of fine particulate matter (PM2.5). 
    * **Excellent Pollution Tracer:** NO₂ comes primarily from burning fuel. It vanishes quickly, meaning satellite maps accurately show exactly where it was emitted.
    """)
with st.expander("MISSION BRIEF: Atmospheric Layers & Targeting", expanded=False):
    st.markdown("""
    * **Targeting Human Activity:** The troposphere is the lowest atmospheric layer where human pollution lives.
    * **Removing Interference:** NASA algorithms must separate the stratospheric column from the tropospheric column; otherwise, natural ozone chemistry would distort the human emission data.
    """)
with st.expander("MISSION BRIEF: Regional Mechanics", expanded=False):
    st.markdown("""
    We selected these 12 distinct regions because atmospheric NO₂ isn't just driven by human lockdowns; it is highly dependent on global seasonal mechanics:
    * **Delhi, India:** NO₂ levels fluctuate heavily with the monsoons.
    * **Beijing, China:** Winter NO₂ columns can be about three times higher than in the summer due to longer NOx atmospheric lifetimes in colder weather.
    * **Johannesburg, South Africa:** Southern Africa experiences elevated NO₂ during dry-season biomass burning.
    *(Note: For global visualization purposes, regional data is shaded across the region's respective country).*
    """)

st.divider()

# ==========================================
# 2. CHOROPLETH MAP (LOCKED) & TIMELINE
# ==========================================
st.subheader("🗺️ Global Atmospheric Density Scan")

available_dates = sorted(df['date'].unique().tolist())
map_placeholder = st.empty()
selected_date = st.select_slider("SELECT OBSERVATION MONTH (UTC)", options=available_dates, value=available_dates[-1])

map_df = df[df['date'] == selected_date]

fig_map = px.choropleth(
    map_df,
    locations="iso_alpha",
    color="no2_monthly_mean",
    hover_name="country",
    hover_data={"region": True, "iso_alpha": False},
    color_continuous_scale="Inferno",
    projection="natural earth"
)

fig_map.update_layout(
    margin={"r":0,"t":0,"l":0,"b":0},
    paper_bgcolor='rgba(0,0,0,0)',
    plot_bgcolor='rgba(0,0,0,0)',
    geo=dict(
        showframe=False,
        showcoastlines=True,
        coastlinecolor=grid_color,
        bgcolor='rgba(0,0,0,0)',
        showland=True,
        landcolor=panel_color
    ),
    font=dict(color=text_color, family="Inter")
)

# Fully locked map interaction to maintain cinematic aesthetic
map_placeholder.plotly_chart(
    fig_map, 
    use_container_width=True, 
    config={'scrollZoom': False, 'displayModeBar': False, 'staticPlot': False}
)

st.divider()

# ==========================================
# 3. SIDEBAR & MISSION CONTROL TELEMETRY
# ==========================================
st.sidebar.markdown("<h3 style='font-family: \"Space Grotesk\"; margin-bottom: 0;'>SYSTEM CONTROLS</h3>", unsafe_allow_html=True)
selected_regions = st.sidebar.multiselect(
    "SELECT TARGET REGIONS", 
    all_regions, 
    default=[]
)

if not selected_regions:
    st.info("🛰️ **AWAITING INPUT:** Select one or more target regions from the System Controls sidebar to establish a telemetry link and reveal localized data.")
else:
    st.sidebar.markdown("<hr style='border-color: #243B55;'>", unsafe_allow_html=True)
    st.sidebar.markdown("<p style='font-family: \"IBM Plex Mono\"; font-size: 12px; color: #46B9E8;'>TELEMETRY OVERRIDES (COLOR)</p>", unsafe_allow_html=True)
    region_colors = {}
    for region in selected_regions:
        color = st.sidebar.color_picker(f"{region} Matrix", global_colors[region])
        region_colors[region] = color

    filtered_df = df[df['region'].isin(selected_regions)].copy()

    st.subheader("📊 Orbital Telemetry Summary")
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("TARGETS LOCKED", len(selected_regions))
    m2.metric("OBSERVATION MONTHS", len(filtered_df['date'].unique()))
    avg_no2 = filtered_df['no2_monthly_mean'].mean()
    m3.metric("MEAN COLUMN DENSITY", f"{avg_no2:.6f}" if pd.notnull(avg_no2) else "N/A")
    m4.metric("MISSION TIMEFRAME", "Jul '18 - Dec '24")

    st.subheader("📈 Longitudinal Concentration Trends")
    fig_ts = px.line(
        filtered_df,
        x='date',
        y='no2_monthly_mean',
        color='region',
        color_discrete_map=region_colors,
        markers=True,
        labels={'no2_monthly_mean': 'NO₂ Column Density (mol/m²)', 'date': 'Observation Date', 'region': 'Region'}
    )
    fig_ts.update_layout(
        template=plot_template, hovermode="x unified",
        paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)', font=dict(color=text_color, family="Inter"),
        xaxis=dict(showgrid=True, gridcolor=grid_color), yaxis=dict(showgrid=True, gridcolor=grid_color)
    )
    st.plotly_chart(fig_ts, use_container_width=True)

    st.subheader("🔄 Atmospheric Seasonal Cycles")
    seasonal_df = filtered_df.groupby(['region', 'month'])['no2_monthly_mean'].mean().reset_index()
    fig_season = px.line(
        seasonal_df,
        x='month',
        y='no2_monthly_mean',
        color='region',
        color_discrete_map=region_colors,
        markers=True,
        labels={'month': 'Month (1-12)', 'no2_monthly_mean': 'Avg NO₂ Density'}
    )
    fig_season.update_layout(
        template=plot_template, 
        xaxis=dict(tickmode='linear', tick0=1, dtick=1, showgrid=True, gridcolor=grid_color),
        yaxis=dict(showgrid=True, gridcolor=grid_color),
        paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)', font=dict(color=text_color, family="Inter")
    )
    st.plotly_chart(fig_season, use_container_width=True)

    if df_summary is not None:
        st.subheader("📋 Pre vs During COVID Statistical Breakdown")
        table_df = df_summary[df_summary['region'].isin(selected_regions)]
        fig_table = go.Figure(data=[go.Table(
            header=dict(
                values=list(table_df.columns), 
                fill_color=panel_color, 
                line_color=grid_color,
                font=dict(color=accent_blue, size=13, family="IBM Plex Mono"), 
                align='left'
            ),
            cells=dict(
                values=[table_df[col] for col in table_df.columns], 
                fill_color=card_color, 
                line_color=grid_color,
                font=dict(color=text_color, size=12, family="IBM Plex Mono"), 
                align='left'
            ))
        ])
        fig_table.update_layout(margin=dict(l=0, r=0, t=0, b=0), paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
        st.plotly_chart(fig_table, use_container_width=True)

# Footer with complete resources and email placeholders
st.markdown("""
<div class="footer">
    <h4>🎓 PROJECT CREDITS & MISSION ATTRIBUTION</h4>
    <p style="margin-bottom: 20px;">
        <strong>RESEARCH TEAM (STEM SHARKYA)</strong><br>
        Sara M. Nabawy | <a href="mailto:sara.2225527@stemsharkya.moe.edu.eg">sara.2225527@stemsharkya.moe.edu.eg</a><br>
        Mona E. Salem | <a href="mailto:mona.2225550@stemsharkya.moe.edu.eg">mona.2225550@stemsharkya.moe.edu.eg</a>
    </p>
    <p>
        <strong>DATA SOURCES & SATELLITE INSTRUMENTATION</strong><br>
        • Copernicus Sentinel-5P TROPOMI Level-3 NO₂ Data<br>
        • NASA Earthdata & Giovanni Interface<br>
        • Google Earth Engine (GEE)<br>
        • World Health Organization (WHO) Air Quality Guidelines<br>
        • US Environmental Protection Agency (EPA)
    </p>
    <p style="font-size: 11px; opacity: 0.6; margin-top: 25px; font-family: 'IBM Plex Mono', monospace;">
        SYS.LOG // © 2024 GLOBAL TROPOSPHERIC NO₂ DYNAMICS PROJECT. ALL RIGHTS RESERVED.
    </p>
</div>
""", unsafe_allow_html=True)
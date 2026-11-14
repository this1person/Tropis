"""
config.py
---------
Configuration parameters for the NO2 COVID-19 Global Research Project.
Contains Google Cloud settings, dataset specs, geographic bounding boxes, and temporal definitions.
"""

import os

# ==============================================================================
# 1. GOOGLE CLOUD & EARTH ENGINE CONFIGURATION
# ==============================================================================
# Replace 'YOUR_GOOGLE_CLOUD_PROJECT_ID' with your actual GCP Project ID.
GOOGLE_CLOUD_PROJECT_ID = "no2-covid-research"

# ==============================================================================
# 2. DATASET SPECIFICATIONS
# ==============================================================================
# ==============================================================================
# 2. DATASET SPECIFICATIONS
# ==============================================================================
EE_DATASET_ID = "COPERNICUS/S5P/OFFL/L3_NO2"
TARGET_BAND = "tropospheric_NO2_column_number_density"
QA_BAND = "cloud_fraction"  # qa_value >= 0.75 is already pre-applied by GEE in Level-3
MAX_CLOUD_FRACTION = 0.20   # Extra cloud filtering (< 20% cloud cover)
SPATIAL_SCALE_METERS = 1113.2  # Nominal Level-3 pixel scale (~1 km)

# Native unit: mol/m^2.
# Display unit factor: 1e6 (converts mol/m^2 to micromoles per m^2, i.e., umol/m^2)
UNIT_CONVERSION_FACTOR = 1e6
UNIT_LABEL = "µmol/m²"

# ==============================================================================
# 3. TEMPORAL PERIOD DEFINITIONS
# ==============================================================================
# Note: S5P OFFL data collection starts June 28, 2018. July 2018 is the first complete month.
STUDY_START_DATE = "2018-07-01"
STUDY_END_DATE = "2024-12-31"

# Period Boundaries
PERIOD_BEFORE = ("2018-07-01", "2019-12-31")  # Pre-COVID baseline (Note: 2018 is incomplete)
PERIOD_DURING = ("2020-01-01", "2021-12-31")  # COVID-19 pandemic peak & restrictions
PERIOD_AFTER = ("2022-01-01", "2024-12-31")   # Post-COVID recovery phase

PERIOD_LABELS = {
    "Before": "Before COVID-19 (Jul 2018 - Dec 2019)",
    "During": "During COVID-19 (Jan 2020 - Dec 2021)",
    "After": "After COVID-19 (Jan 2022 - Dec 2024)"
}

# ==============================================================================
# 4. STUDY REGIONS (METROPOLITAN BOUNDING BOXES)
# ==============================================================================
# Earth Engine Bounding Box format: [min_longitude, min_latitude, max_longitude, max_latitude]
# Bounding boxes represent approximate metropolitan study areas surrounding the center points.
STUDY_REGIONS = {
    "Greater Cairo, Egypt": {
        "center": [30.0444, 31.2357],
        "bbox": [30.80, 29.80, 31.60, 30.30]
    },
    "Johannesburg, South Africa": {
        "center": [-26.2041, 28.0473],
        "bbox": [27.70, -26.50, 28.40, -25.90]
    },
    "Delhi, India": {
        "center": [28.6139, 77.2090],
        "bbox": [76.80, 28.30, 77.50, 28.90]
    },
    "Beijing, China": {
        "center": [39.9042, 116.4074],
        "bbox": [116.00, 39.60, 116.80, 40.20]
    },
    "Seoul, South Korea": {
        "center": [37.5665, 126.9780],
        "bbox": [126.70, 37.30, 127.30, 37.80]
    },
    "Tokyo, Japan": {
        "center": [35.6762, 139.6503],
        "bbox": [139.30, 35.40, 140.00, 35.90]
    },
    "Milan, Italy": {
        "center": [45.4642, 9.1900],
        "bbox": [8.90, 45.20, 9.50, 45.70]
    },
    "Madrid, Spain": {
        "center": [40.4168, -3.7038],
        "bbox": [-4.00, 40.20, -3.40, 40.60]
    },
    "Greater London, UK": {
        "center": [51.5072, -0.1276],
        "bbox": [-0.50, 51.30, 0.20, 51.70]
    },
    "New York City, USA": {
        "center": [40.7128, -74.0060],
        "bbox": [-74.30, 40.50, -73.70, 41.00]
    },
    "São Paulo, Brazil": {
        "center": [-23.5505, -46.6333],
        "bbox": [-46.90, -23.80, -46.30, -23.30]
    },
    "Sydney, Australia": {
        "center": [-33.8688, 151.2093],
        "bbox": [150.80, -34.10, 151.40, -33.60]
    }
}

# ==============================================================================
# 5. DIRECTORY & FILE PATHS
# ==============================================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data", "processed")
os.makedirs(DATA_DIR, exist_ok=True)

PROCESSED_CSV_PATH = os.path.join(DATA_DIR, "no2_monthly_data.csv")
STAT_SUMMARY_CSV_PATH = os.path.join(DATA_DIR, "no2_statistical_summary.csv")
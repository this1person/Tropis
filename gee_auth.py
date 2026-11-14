"""
gee_auth.py
-----------
Handles authentication, initialization, and dataset schema validation for Google Earth Engine.
"""

import sys
import ee
from config import GOOGLE_CLOUD_PROJECT_ID, EE_DATASET_ID, TARGET_BAND, QA_BAND

def initialize_gee(project_id=GOOGLE_CLOUD_PROJECT_ID):
    """
    Authenticates and initializes Google Earth Engine with a specified Cloud Project ID.
    """
    if project_id == "YOUR_GOOGLE_CLOUD_PROJECT_ID" or not project_id:
        print("[ERROR] Please update config.py with your valid Google Cloud Project ID.")
        sys.exit(1)

    try:
        print(f"[INFO] Initializing Earth Engine with Project ID: {project_id}...")
        ee.Initialize(project=project_id)
        print("[SUCCESS] Earth Engine successfully initialized.")
    except Exception as e:
        print(f"[WARNING] Standard initialization failed: {e}")
        print("[INFO] Requesting Earth Engine Authentication...")
        try:
            ee.Authenticate()
            ee.Initialize(project=project_id)
            print("[SUCCESS] Earth Engine authenticated and initialized.")
        except Exception as auth_err:
            print(f"[FATAL] Failed to authenticate with Earth Engine: {auth_err}")
            sys.exit(1)

def verify_dataset_schema():
    """
    Inspects Sentinel-5P dataset schema, available bands, quality mask bands, and metadata.
    """
    print(f"\n[INFO] Verifying dataset schema for {EE_DATASET_ID}...")
    try:
        col = ee.ImageCollection(EE_DATASET_ID).filterDate("2020-01-01", "2020-01-15")
        sample_image = col.first()
        
        band_names = sample_image.bandNames().getInfo()
        print(f"[INFO] Available Bands ({len(band_names)}): {band_names}")

        if TARGET_BAND not in band_names:
            raise ValueError(f"Target band '{TARGET_BAND}' not found in dataset!")
        
        print(f"[SUCCESS] Target band '{TARGET_BAND}' verified.")
        print(f"[INFO] Note: GEE Level-3 NO2 product pre-applies qa_value >= 0.75 quality filtering.")
        
        properties = sample_image.propertyNames().getInfo()
        print(f"[INFO] Sample Image Metadata Properties (Count: {len(properties)})")
        return True
    except Exception as e:
        print(f"[ERROR] Schema verification failed: {e}")
        return False
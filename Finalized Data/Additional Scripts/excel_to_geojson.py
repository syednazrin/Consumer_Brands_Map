"""
Excel to GeoJSON Converter

This script converts Excel files containing retail outlet data to GeoJSON format.
It processes all category folders in the "Finalized Data" directory, with special
handling to skip DC subfolders for specific categories.

Output: Each Excel file is converted to a GeoJSON file in a "GEOJSON Data" subfolder
within each category folder.
"""

import pandas as pd
import json
from pathlib import Path
import numpy as np


def _parse_coordinates(value):
    """
    Parse a 'lat, lon' or 'lat, \\nlon' string into (lat, lon) floats.
    
    Args:
        value: String containing coordinates in format "lat, lon" or similar
        
    Returns:
        Tuple of (lat, lon) as floats, or (pd.NA, pd.NA) if invalid
    """
    if pd.isna(value):
        return pd.NA, pd.NA
    try:
        # Handle various formats: "lat, lon", "lat,lon", "lat\nlon", etc.
        value_str = str(value).replace("\\n", " ").replace("\n", " ").strip()
        parts = value_str.split(",")
        if len(parts) >= 2:
            lat = float(str(parts[0]).strip())
            lon = float(str(parts[1]).strip())
            # Validate coordinates are reasonable (Malaysia is roughly 0-10°N, 95-125°E)
            if 0 <= lat <= 10 and 95 <= lon <= 125:
                return lat, lon
            else:
                print(f"  Warning: Coordinates out of range: {lat}, {lon}")
    except Exception as e:
        print(f"  Warning: Could not parse coordinate '{value}': {e}")
    return pd.NA, pd.NA


def find_coordinate_column(df):
    """
    Find the coordinate column in the dataframe.
    Checks for: "Coordinates", "Coordinate", "Map", "position", "position "
    
    Args:
        df: pandas DataFrame
        
    Returns:
        Column name if found, None otherwise
    """
    if "Coordinates" in df.columns:
        return "Coordinates"
    elif "Coordinate" in df.columns:
        return "Coordinate"
    elif "Map" in df.columns:
        return "Map"
    elif "position" in df.columns:
        return "position"
    elif "position " in df.columns:
        return "position "
    return None


def excel_to_geojson(excel_path, output_path):
    """
    Convert an Excel file to GeoJSON format.
    
    Args:
        excel_path: Path to the input Excel file
        output_path: Path where the GeoJSON file should be saved
        
    Returns:
        Tuple of (success: bool, features_count: int, error_message: str)
    """
    try:
        # Read Excel file
        df = pd.read_excel(excel_path)
        
        if df.empty:
            print(f"  Warning: {excel_path.name} is empty")
            # Create empty FeatureCollection
            geojson = {
                "type": "FeatureCollection",
                "features": []
            }
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(geojson, f, indent=2, ensure_ascii=False)
            return True, 0, None
        
        # Normalize column names (strip whitespace)
        df.columns = [c.strip() for c in df.columns]
        
        # Find coordinate column
        coord_column = find_coordinate_column(df)
        
        if not coord_column:
            error_msg = f"No coordinate column found. Available columns: {list(df.columns)}"
            print(f"  Error: {error_msg}")
            return False, 0, error_msg
        
        # Parse coordinates
        coords = df[coord_column].apply(_parse_coordinates)
        df["latitude"] = coords.apply(lambda x: x[0])
        df["longitude"] = coords.apply(lambda x: x[1])
        
        # Filter rows with valid coordinates
        valid_mask = df["latitude"].notna() & df["longitude"].notna()
        df_valid = df[valid_mask].copy()
        
        if len(df_valid) == 0:
            print(f"  Warning: No valid coordinates found in {excel_path.name}")
            # Create empty FeatureCollection
            geojson = {
                "type": "FeatureCollection",
                "features": []
            }
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(geojson, f, indent=2, ensure_ascii=False)
            return True, 0, None
        
        # Convert to GeoJSON features
        features = []
        for idx, row in df_valid.iterrows():
            # Get all columns except latitude/longitude for properties
            properties = {}
            for col in df_valid.columns:
                if col not in ["latitude", "longitude"]:
                    value = row[col]
                    # Convert pandas NA to None for JSON serialization
                    if pd.isna(value):
                        properties[col] = None
                    else:
                        # Convert numpy/pandas types to Python native types for JSON serialization
                        if isinstance(value, (np.integer, np.int64, np.int32)):
                            properties[col] = int(value)
                        elif isinstance(value, (np.floating, np.float64, np.float32)):
                            properties[col] = float(value)
                        elif isinstance(value, (pd.Timestamp, pd.DatetimeTZDtype)):
                            properties[col] = str(value)
                        else:
                            properties[col] = value
            
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(row["longitude"]), float(row["latitude"])]  # GeoJSON uses [lon, lat]
                },
                "properties": properties
            }
            features.append(feature)
        
        # Create FeatureCollection
        geojson = {
            "type": "FeatureCollection",
            "features": features
        }
        
        # Write GeoJSON file
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(geojson, f, indent=2, ensure_ascii=False)
        
        return True, len(features), None
        
    except Exception as e:
        error_msg = f"Error processing {excel_path.name}: {str(e)}"
        print(f"  Error: {error_msg}")
        return False, 0, error_msg


def process_category_folder(category_path, skip_dc=False):
    """
    Process all Excel files in a category folder.
    
    Args:
        category_path: Path to the category folder
        skip_dc: If True, skip DC subfolder
        
    Returns:
        Dictionary with processing statistics
    """
    category_name = category_path.name
    print(f"\nProcessing category: {category_name}")
    
    stats = {
        "category": category_name,
        "processed": 0,
        "successful": 0,
        "failed": 0,
        "skipped": 0,
        "total_features": 0
    }
    
    # Create output directory
    output_dir = category_path / "GEOJSON Data"
    output_dir.mkdir(exist_ok=True)
    
    # Get all Excel files in the category folder
    excel_files = list(category_path.glob("*.xlsx"))
    
    if skip_dc:
        print(f"  Skipping DC subfolder (if present)")
    
    for excel_file in excel_files:
        # Skip if file is in DC folder (shouldn't happen if skip_dc logic is correct, but double-check)
        if "DC" in excel_file.parts:
            stats["skipped"] += 1
            continue
        
        print(f"  Processing: {excel_file.name}")
        stats["processed"] += 1
        
        # Generate output filename
        output_filename = excel_file.stem + ".geojson"
        output_path = output_dir / output_filename
        
        # Convert to GeoJSON
        success, feature_count, error = excel_to_geojson(excel_file, output_path)
        
        if success:
            stats["successful"] += 1
            stats["total_features"] += feature_count
            print(f"    [OK] Converted: {feature_count} features")
        else:
            stats["failed"] += 1
            print(f"    [FAILED] {error}")
    
    return stats


def main():
    """
    Main function to process all category folders.
    """
    # Set root directory
    root_dir = Path(__file__).parent.parent  # Go up from "Additional Scripts" to "Finalized Data"
    
    if not root_dir.exists():
        print(f"Error: Root directory not found: {root_dir}")
        return
    
    print(f"Root directory: {root_dir}")
    
    # Categories that should skip DC subfolders
    skip_dc_categories = ["99 SpeedMart", "MR DIY + MR TOY", "Food and Beverages"]
    
    # Get all category folders (directories, not files)
    category_folders = [d for d in root_dir.iterdir() if d.is_dir() and d.name != "Additional Scripts"]
    
    if not category_folders:
        print("No category folders found!")
        return
    
    print(f"\nFound {len(category_folders)} category folders")
    
    # Process each category
    all_stats = []
    for category_path in sorted(category_folders):
        skip_dc = category_path.name in skip_dc_categories
        stats = process_category_folder(category_path, skip_dc=skip_dc)
        all_stats.append(stats)
    
    # Print summary
    print("\n" + "="*60)
    print("CONVERSION SUMMARY")
    print("="*60)
    
    total_processed = 0
    total_successful = 0
    total_failed = 0
    total_features = 0
    
    for stats in all_stats:
        print(f"\n{stats['category']}:")
        print(f"  Processed: {stats['processed']}")
        print(f"  Successful: {stats['successful']}")
        print(f"  Failed: {stats['failed']}")
        print(f"  Skipped: {stats['skipped']}")
        print(f"  Total features: {stats['total_features']}")
        
        total_processed += stats['processed']
        total_successful += stats['successful']
        total_failed += stats['failed']
        total_features += stats['total_features']
    
    print("\n" + "="*60)
    print("OVERALL TOTALS:")
    print(f"  Files processed: {total_processed}")
    print(f"  Files converted successfully: {total_successful}")
    print(f"  Files failed: {total_failed}")
    print(f"  Total GeoJSON features created: {total_features}")
    print("="*60)


if __name__ == "__main__":
    main()

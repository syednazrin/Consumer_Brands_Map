"""
District Statistics to GeoJSON Converter

This script converts the District Statistics Excel file to GeoJSON format.
Note: This file contains district-level statistics but NO coordinates.
The output will be a simple JSON representation that can be used with
the existing malaysia.district.geojson polygon data.
"""

import pandas as pd
import json
from pathlib import Path


def district_stats_to_geojson(excel_path, output_path):
    """
    Convert District Statistics Excel to a simple GeoJSON-compatible format.
    
    Since this file has no coordinates, we create a FeatureCollection with
    null geometries, preserving all the district statistics as properties.
    
    Args:
        excel_path: Path to the District Statistics Excel file
        output_path: Path where the GeoJSON file should be saved
    """
    try:
        # Read Excel file
        df = pd.read_excel(excel_path)
        
        if df.empty:
            print(f"Warning: {excel_path.name} is empty")
            return False
        
        # Normalize column names (strip whitespace)
        df.columns = [c.strip() for c in df.columns]
        
        print(f"Columns found: {list(df.columns)}")
        print(f"Total rows: {len(df)}")
        
        # Expected columns based on the memory and code analysis
        expected_columns = ['State', 'District', 'Population (k)', 'Income per capita', 'Income']
        
        # Verify columns exist
        missing_columns = [col for col in expected_columns if col not in df.columns]
        if missing_columns:
            print(f"Warning: Missing expected columns: {missing_columns}")
        
        # Convert to GeoJSON features (with null geometry since no coordinates)
        features = []
        for idx, row in df.iterrows():
            # Build properties from all columns
            properties = {}
            for col in df.columns:
                value = row[col]
                # Convert pandas NA to None for JSON serialization
                if pd.isna(value):
                    properties[col] = None
                else:
                    # Convert to native Python types
                    if isinstance(value, (pd.Int64Dtype, int)):
                        properties[col] = int(value)
                    elif isinstance(value, (pd.Float64Dtype, float)):
                        properties[col] = float(value)
                    else:
                        properties[col] = str(value)
            
            # Create feature with null geometry (no coordinates available)
            feature = {
                "type": "Feature",
                "geometry": None,  # No coordinates in this dataset
                "properties": properties
            }
            features.append(feature)
        
        # Create FeatureCollection
        geojson = {
            "type": "FeatureCollection",
            "features": features,
            "metadata": {
                "description": "District-level statistics for Malaysia",
                "note": "This file contains no geometry data. Use with malaysia.district.geojson for spatial visualization.",
                "columns": list(df.columns)
            }
        }
        
        # Write GeoJSON file
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(geojson, f, indent=2, ensure_ascii=False)
        
        print(f"Successfully converted {len(features)} district records to GeoJSON")
        return True
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return False


def main():
    """Main function to convert District Statistics to GeoJSON."""
    
    # Input file
    input_file = Path(__file__).parent / "District Statistics .xlsx"
    
    if not input_file.exists():
        print(f"Error: Input file not found: {input_file}")
        return
    
    # Output file
    output_file = Path(__file__).parent / "District Statistics.geojson"
    
    print(f"Converting: {input_file}")
    print(f"Output to: {output_file}")
    print()
    
    success = district_stats_to_geojson(input_file, output_file)
    
    if success:
        print(f"\n[SUCCESS] Conversion complete!")
        print(f"Output file: {output_file}")
    else:
        print(f"\n[FAILED] Conversion failed")


if __name__ == "__main__":
    main()

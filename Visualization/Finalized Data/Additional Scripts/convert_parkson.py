"""
Special script to convert Parkson.xlsx to GeoJSON.
The columns in this file are shifted - coordinates are in 'Name' and actual name is in 'Address'.
"""

import pandas as pd
import json
import os

def parse_coordinates(value):
    """Parse coordinate string into lat, lon."""
    try:
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
    return None, None

def convert_parkson():
    """Convert Parkson.xlsx to GeoJSON."""
    
    excel_path = r"D:\Ambank Project\Consumer_Brands_Map\Finalized Data\Department Stores\Parkson.xlsx"
    output_dir = r"D:\Ambank Project\Consumer_Brands_Map\Finalized Data\Department Stores\GEOJSON Data"
    output_path = os.path.join(output_dir, "Parkson.geojson")
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Reading {excel_path}...")
    df = pd.read_excel(excel_path)
    
    print(f"Total rows: {len(df)}")
    
    # The correct column mapping:
    # 'Name' contains the actual store name
    # 'Address' contains the coordinates
    # 'Coordinates' column contains the full address
    # 'Postcode' contains postcode
    # 'State ' contains state (note the space)
    # 'District' contains district
    
    features = []
    valid_count = 0
    invalid_count = 0
    
    for idx, row in df.iterrows():
        # Parse coordinates from 'Address' column
        coord_str = row['Address']
        lat, lon = parse_coordinates(coord_str)
        
        if lat is None or lon is None:
            invalid_count += 1
            print(f"  Skipping row {idx}: {row['Name']}")
            continue
        
        # Extract actual address from 'Coordinates' column
        full_address = str(row['Coordinates']) if pd.notna(row['Coordinates']) else ''
        
        # The actual store name is in the Name column
        store_name = str(row['Name']) if pd.notna(row['Name']) else f"Parkson {idx+1}"
        
        # Create GeoJSON feature
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat]  # GeoJSON uses [lon, lat]
            },
            "properties": {
                "Name": store_name,
                "Address": full_address,
                "Postcode": str(row['Postcode']) if pd.notna(row['Postcode']) else '',
                "State": str(row['State ']).strip() if pd.notna(row['State ']) else '',  # Note: 'State ' has a space
                "District": str(row['District']) if pd.notna(row['District']) else ''
            }
        }
        
        features.append(feature)
        valid_count += 1
    
    # Create GeoJSON
    geojson = {
        "type": "FeatureCollection",
        "features": features
    }
    
    # Write to file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, indent=2, ensure_ascii=False)
    
    print(f"\n[OK] Converted Parkson.xlsx:")
    print(f"  Valid features: {valid_count}")
    print(f"  Invalid features: {invalid_count}")
    print(f"  Output: {output_path}")

if __name__ == "__main__":
    convert_parkson()

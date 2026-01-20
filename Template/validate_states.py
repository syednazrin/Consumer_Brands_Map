"""
State Validation Script
Validates state values against 15 valid Malaysian states and generates a report
of problematic entries with filename and store name for manual fixing.

Target Categories:
- Convenience Stores
- Eco-Shop
- Fast Fashion
- Food and Beverages
- MR DIY + MR TOY
"""

import pandas as pd
import os
import sys

# Add parent directory to path to import from app.py if needed
# For standalone script, we'll replicate the necessary functions

# Valid Malaysian States (15 total)
VALID_STATES = {
    # 13 States
    'Johor',
    'Kedah',
    'Kelantan',
    'Melaka',
    'Negeri Sembilan',
    'Pahang',
    'Perak',
    'Perlis',
    'Pulau Pinang',
    'Sabah',
    'Sarawak',
    'Selangor',
    'Terengganu',
    # 3 Federal Territories
    'Wp Kuala Lumpur',
    'Wp Labuan',
    'Wp Putrajaya'
}

# Target categories to validate
TARGET_CATEGORIES = [
    'Convenience Stores',
    'Eco-Shop',
    'Fast Fashion',
    'Food and Beverages',
    'MR DIY + MR TOY'
]


def _parse_coordinates(value):
    """Parse a 'lat, lon' or 'lat, \\nlon' string into (lat, lon) floats."""
    if pd.isna(value):
        return pd.NA, pd.NA
    try:
        value_str = str(value).replace("\\n", " ").replace("\n", " ").strip()
        parts = value_str.split(",")
        if len(parts) >= 2:
            lat = float(str(parts[0]).strip())
            lon = float(str(parts[1]).strip())
            if 0 <= lat <= 10 and 95 <= lon <= 125:
                return lat, lon
    except Exception:
        pass
    return pd.NA, pd.NA


def _load_brand_file(filename, brand_key, brand_name, has_type_column=False):
    """
    Generic loader for brand Excel files.
    Replicates logic from app.py
    """
    base_dir = os.path.dirname(__file__)
    candidates = [
        os.path.join(base_dir, "..", filename),
        os.path.join(base_dir, "..", "Finalized Data", filename),
        os.path.join(base_dir, "..", "Data", filename),
        os.path.join(base_dir, filename),
        filename,  # Try as absolute path
    ]

    df = None
    for path in candidates:
        try:
            if os.path.exists(path):
                df = pd.read_excel(path)
                break
        except (FileNotFoundError, Exception):
            continue

    if df is None:
        raise FileNotFoundError(f"{filename} not found in expected locations.")

    df = df.copy()
    df.columns = [c.strip() for c in df.columns]

    # Coordinates
    coord_column = None
    if "Coordinates" in df.columns:
        coord_column = "Coordinates"
    elif "Coordinate" in df.columns:
        coord_column = "Coordinate"
    elif "Map" in df.columns:
        coord_column = "Map"
    elif "position" in df.columns or "position " in df.columns:
        coord_column = "position " if "position " in df.columns else "position"
    
    if coord_column:
        coords = df[coord_column].apply(_parse_coordinates)
        df["latitude"] = coords.apply(lambda x: x[0])
        df["longitude"] = coords.apply(lambda x: x[1])
    else:
        df["latitude"] = pd.NA
        df["longitude"] = pd.NA

    df["brand"] = brand_name
    df["brand_key"] = brand_key

    # Handle store name
    if "Name" in df.columns:
        df["Store Name"] = df["Name"].fillna("")
    elif "data" in df.columns:
        df["Store Name"] = df["data"].fillna("")
    else:
        df["Store Name"] = pd.Series(index=df.index, dtype="object").fillna("")
    
    df["Address"] = df.get("Address", pd.Series(index=df.index, dtype="object")).fillna("")
    df["Postcode"] = df.get("Postcode", pd.Series(index=df.index, dtype="object")).fillna("")
    df["State"] = df.get("State", pd.Series(index=df.index, dtype="object")).fillna("")
    df["District"] = df.get("District", pd.Series(index=df.index, dtype="object")).fillna("")

    if "City" in df.columns:
        if df["District"].isna().all() or (df["District"] == "").all():
            df["District"] = df["City"]
    df["City"] = df["District"]

    if has_type_column:
        df["Type"] = df.get("Type", pd.Series(index=df.index, dtype="object")).fillna("")
    else:
        df["Type"] = ""

    # Filter valid coordinates (optional for validation, but keep for consistency)
    df = df[
        pd.to_numeric(df["latitude"], errors="coerce").notna()
        & pd.to_numeric(df["longitude"], errors="coerce").notna()
    ].copy()
    if len(df) > 0:
        df["latitude"] = df["latitude"].astype(float)
        df["longitude"] = df["longitude"].astype(float)

    return df


def _extract_brand_name_from_filename(filename):
    """Extract brand name from Excel filename."""
    name = filename.replace('.xlsx', '').strip()
    name = name.replace('_CLEANED', '').replace('_DONE', '').replace(' done', '').replace(' DONE', '')
    name = name.replace('Locations', '').replace('Data', '').replace(' done', '').strip()
    
    if 'Parkson' in name and ('Aeon' in name or 'aeon' in name):
        return 'Parkson Aeon'
    if name == '711' or name.startswith('711'):
        return '7-Eleven'
    if '7-Eleven' in name or '7Eleven' in name:
        return '7-Eleven'
    if 'Aeon_updated' in name or (name.startswith('Aeon') and 'updated' in name.lower()):
        return 'Aeon'
    if name == 'Aeon' or name.lower() == 'aeon':
        return 'Aeon'
    if 'MRDiy' in name or 'MR DIY' in name:
        return 'MR DIY'
    if 'MRToy' in name or 'MR Toy' in name:
        return 'MR Toy'
    if 'Eco-Shop' in name or 'EcoShop' in name:
        return 'Eco-Shop'
    if '99 SpeedMart' in name or '99SpeedMart' in name:
        return '99 SpeedMart'
    if 'OldTown' in name or 'Old Town' in name:
        return 'OldTown White Coffee'
    if 'Oriental Kopi' in name or 'OrientalKopi' in name:
        return 'Oriental Kopi'
    if 'Tea Garden' in name or 'TeaGarden' in name:
        return 'Tea Garden'
    if 'Family Mart' in name or 'FamilyMart' in name:
        return 'Family Mart'
    if 'KK Mart' in name or 'KKMart' in name or 'KK Supermart' in name:
        return 'KK Mart'
    if 'MyNews' in name or 'My News' in name or 'MyNews Mart' in name:
        return 'MyNews Mart'
    if 'Poh Kong' in name or 'PohKong' in name:
        return 'Poh Kong'
    if 'Wah Chan' in name or 'WahChan' in name:
        return 'Wah Chan'
    if 'Habib' in name and 'Jewels' in name:
        return 'Habib Jewels'
    if 'H&M' in name or 'HNM' in name:
        return 'H&M'
    
    name = name.strip()
    if name:
        words = name.split()
        name = ' '.join(word.capitalize() for word in words)
    
    return name


def _filename_to_brand_key(filename):
    """Convert filename to normalized brand_key."""
    name = _extract_brand_name_from_filename(filename).lower()
    key = ''.join(ch for ch in name if ch.isalnum() or ch == ' ')
    key = key.replace(' ', '').strip()
    
    if '7-eleven' in key or '7eleven' in key or key == '711':
        return '7eleven'
    if 'parkson' in key and 'aeon' in key:
        return 'parksonaeon'
    if key == 'aeon' or key == 'aeonupdated':
        return 'aeon'
    if 'mrdiy' in key or 'mr diy' in key:
        return 'mrdiy'
    if 'mrtoy' in key or 'mr toy' in key:
        return 'mrtoy'
    if 'orientalkopi' in key or 'oriental kopi' in key:
        return 'orientalkopi'
    if 'oldtown' in key or 'old town' in key:
        return 'oldtown'
    if 'teagarden' in key or 'tea garden' in key:
        return 'teagarden'
    if 'familymart' in key or 'family mart' in key:
        return 'familymart'
    if 'kkmart' in key or 'kk mart' in key or 'kksupermart' in key:
        return 'kkmart'
    if 'mynews' in key or 'my news' in key:
        return 'mynews'
    if 'speedmart' in key or '99 speedmart' in key:
        return 'speedmart'
    if 'ecoshop' in key or 'eco-shop' in key:
        return 'ecoshop'
    if 'pohkong' in key or 'poh kong' in key:
        return 'pohkong'
    if 'wahchan' in key or 'wah chan' in key:
        return 'wahchan'
    if 'habib' in key:
        return 'habib'
    
    return key


def _scan_finalized_data_folder():
    """
    Dynamically scan the Finalized Data folder structure.
    Returns a list of tuples: (filepath, category, brand_name, brand_key, has_type_column)
    """
    base_dir = os.path.dirname(__file__)
    
    finalized_data_candidates = [
        os.path.join(base_dir, "..", "Finalized Data"),
        os.path.join(os.path.dirname(base_dir), "Finalized Data"),
        "Finalized Data",
        os.path.join("/var/task", "Finalized Data"),
    ]
    
    finalized_data_path = None
    for candidate in finalized_data_candidates:
        if os.path.exists(candidate):
            finalized_data_path = candidate
            break
    
    if finalized_data_path is None:
        raise FileNotFoundError(
            f"Finalized Data folder not found. Tried: {finalized_data_candidates}. "
            f"Current working directory: {os.getcwd()}, Base dir: {base_dir}"
        )
    
    discovered_files = []
    
    # Scan root level files
    if os.path.exists(finalized_data_path):
        try:
            for item in os.listdir(finalized_data_path):
                item_path = os.path.join(finalized_data_path, item)
                if os.path.isfile(item_path) and item.lower().endswith('.xlsx'):
                    filename = os.path.basename(item)
                    brand_name = _extract_brand_name_from_filename(filename)
                    brand_key = _filename_to_brand_key(filename)
                    
                    if brand_key.lower() in ['mrdiy', 'mrtoy']:
                        category = 'MR DIY + MR TOY'
                    else:
                        category = brand_name
                    
                    has_type = 'padini' in brand_key.lower()
                    discovered_files.append((item_path, category, brand_name, brand_key, has_type))
        except Exception as e:
            print(f"Warning: Error scanning root files: {e}")
    
    # Scan subfolders
    if os.path.exists(finalized_data_path):
        try:
            for item in os.listdir(finalized_data_path):
                item_path = os.path.join(finalized_data_path, item)
                if os.path.isdir(item_path):
                    category = item
                    for subitem in os.listdir(item_path):
                        subitem_path = os.path.join(item_path, subitem)
                        if os.path.isfile(subitem_path) and subitem.lower().endswith('.xlsx'):
                            filename = os.path.basename(subitem)
                            brand_name = _extract_brand_name_from_filename(filename)
                            brand_key = _filename_to_brand_key(filename)
                            has_type = 'padini' in brand_key.lower()
                            discovered_files.append((subitem_path, category, brand_name, brand_key, has_type))
        except Exception as e:
            print(f"Warning: Error scanning subfolders: {e}")
    
    return discovered_files


def validate_states():
    """
    Main validation function.
    Scans target categories and identifies state values that don't match valid states.
    """
    print("=" * 80)
    print("State Validation Script")
    print("=" * 80)
    print(f"\nValid States ({len(VALID_STATES)} total):")
    for state in sorted(VALID_STATES):
        print(f"  - {state}")
    print(f"\nTarget Categories: {', '.join(TARGET_CATEGORIES)}")
    print("\n" + "=" * 80)
    
    # Scan for files
    print("\nScanning Finalized Data folder...")
    discovered_files = _scan_finalized_data_folder()
    
    # Filter for target categories
    target_files = [
        (filepath, category, brand_name, brand_key, has_type)
        for filepath, category, brand_name, brand_key, has_type in discovered_files
        if category in TARGET_CATEGORIES
    ]
    
    print(f"Found {len(target_files)} files in target categories")
    
    # Collect problematic entries
    problematic_entries = []
    state_summary = {}  # Track all state values found
    
    # Process each file
    for filepath, category, brand_name, brand_key, has_type_column in target_files:
        filename = os.path.basename(filepath)
        print(f"\nProcessing: {filename} ({category} - {brand_name})")
        
        try:
            df = _load_brand_file(filepath, brand_key, brand_name, has_type_column)
            df["category"] = category
            
            print(f"  Loaded {len(df)} rows")
            
            # Check each row
            for idx, row in df.iterrows():
                state_value = str(row.get('State', '')).strip()
                store_name = str(row.get('Store Name', '')).strip()
                
                # Track all state values
                if state_value not in state_summary:
                    state_summary[state_value] = {
                        'count': 0,
                        'is_valid': state_value in VALID_STATES,
                        'files': set(),
                        'categories': set()
                    }
                state_summary[state_value]['count'] += 1
                state_summary[state_value]['files'].add(filename)
                state_summary[state_value]['categories'].add(category)
                
                # Check if state is invalid
                if state_value not in VALID_STATES:
                    problematic_entries.append({
                        'Filename': filename,
                        'Category': category,
                        'Brand': brand_name,
                        'Store Name': store_name,
                        'Current State': state_value,
                        'City': str(row.get('City', '')).strip(),
                        'District': str(row.get('District', '')).strip(),
                        'Address': str(row.get('Address', '')).strip()[:100]  # First 100 chars
                    })
        
        except Exception as e:
            print(f"  ERROR: Failed to process {filename}: {e}")
            continue
    
    # Create DataFrames
    if problematic_entries:
        problematic_df = pd.DataFrame(problematic_entries)
    else:
        problematic_df = pd.DataFrame(columns=[
            'Filename', 'Category', 'Brand', 'Store Name', 'Current State',
            'City', 'District', 'Address'
        ])
    
    # Create summary DataFrame
    summary_rows = []
    for state_value, data in sorted(state_summary.items(), key=lambda x: x[1]['count'], reverse=True):
        summary_rows.append({
            'State Value': state_value,
            'Count': data['count'],
            'Is Valid': 'Yes' if data['is_valid'] else 'No',
            'Files': ', '.join(sorted(data['files'])),
            'Categories': ', '.join(sorted(data['categories']))
        })
    
    summary_df = pd.DataFrame(summary_rows)
    
    # Output results
    output_file = 'state_validation_report.xlsx'
    print("\n" + "=" * 80)
    print("VALIDATION RESULTS")
    print("=" * 80)
    print(f"\nTotal unique state values found: {len(state_summary)}")
    print(f"Valid states: {sum(1 for d in state_summary.values() if d['is_valid'])}")
    print(f"Invalid states: {sum(1 for d in state_summary.values() if not d['is_valid'])}")
    print(f"Total problematic entries: {len(problematic_entries)}")
    
    # Show invalid states summary
    invalid_states = [(s, d) for s, d in state_summary.items() if not d['is_valid']]
    if invalid_states:
        print("\nInvalid State Values Found:")
        for state_value, data in sorted(invalid_states, key=lambda x: x[1]['count'], reverse=True):
            print(f"  '{state_value}' - {data['count']} occurrences")
            print(f"    Files: {', '.join(sorted(data['files']))}")
    
    # Write to Excel
    print(f"\nWriting report to: {output_file}")
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        # Sheet 1: Problematic entries (for manual fixing)
        problematic_df.to_excel(writer, sheet_name='Problematic Entries', index=False)
        
        # Sheet 2: State summary (all states found)
        summary_df.to_excel(writer, sheet_name='State Summary', index=False)
        
        # Sheet 3: Valid states reference
        valid_states_df = pd.DataFrame({
            'Valid State': sorted(VALID_STATES)
        })
        valid_states_df.to_excel(writer, sheet_name='Valid States Reference', index=False)
    
    print(f"✓ Report saved successfully!")
    print(f"\nSheet 1: 'Problematic Entries' - Contains all rows with invalid states")
    print(f"Sheet 2: 'State Summary' - Summary of all state values found")
    print(f"Sheet 3: 'Valid States Reference' - List of 15 valid states")
    
    return problematic_df, summary_df


if __name__ == '__main__':
    try:
        validate_states()
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)




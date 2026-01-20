from flask import Flask, render_template, jsonify, send_from_directory
import pandas as pd
import json
import os

app = Flask(__name__)


def _parse_coordinates(value):
    """Parse a 'lat, lon' or 'lat, \\nlon' string into (lat, lon) floats."""
    if pd.isna(value):
        return pd.NA, pd.NA
    try:
        # Handle various formats: "lat, lon", "lat,lon", "lat\nlon", etc.
        value_str = str(value).replace("\\n", " ").replace("\n", " ").strip()
        parts = value_str.split(",")
        if len(parts) >= 2:
            lat = float(str(parts[0]).strip())
            lon = float(str(parts[1]).strip())
            # Validate coordinates are reasonable (Malaysia is roughly 0-7°N, 100-120°E)
            if 0 <= lat <= 10 and 95 <= lon <= 125:
                return lat, lon
            else:
                print(f"  Warning: Coordinates out of range: {lat}, {lon}")
    except Exception as e:
        print(f"  Warning: Could not parse coordinate '{value}': {e}")
    return pd.NA, pd.NA


def _load_brand_file(filename, brand_key, brand_name, has_type_column=False):
    """
    Generic loader for the new brand Excel files.

    Expected common columns:
    - 'Name'
    - 'Address'
    - 'Postcode'
    - 'Coordinates'
    - 'State'
    - 'District'

    For Padini: an extra 'Type' column is present.
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
                print(f"Loaded {brand_name} data from {path} with {len(df)} rows")
                break
        except (FileNotFoundError, Exception) as e:
            continue

    if df is None:
        raise FileNotFoundError(f"{filename} not found in expected locations.")

    df = df.copy()
    df.columns = [c.strip() for c in df.columns]

    # Coordinates - handle "Coordinates", "Coordinate", "Map", and "position"
    # Also check "Address" as fallback if Coordinates doesn't contain valid lat/lon
    coord_column = None
    if "Coordinates" in df.columns:
        coord_column = "Coordinates"
    elif "Coordinate" in df.columns:
        coord_column = "Coordinate"
    elif "Map" in df.columns:
        coord_column = "Map"
    elif "position" in df.columns or "position " in df.columns:
        # Handle "position" or "position " (with trailing space)
        coord_column = "position " if "position " in df.columns else "position"
    
    if coord_column:
        coords = df[coord_column].apply(_parse_coordinates)
        df["latitude"] = coords.apply(lambda x: x[0])
        df["longitude"] = coords.apply(lambda x: x[1])
        
        # Check if we got valid coordinates - if not, try Address column as fallback
        valid_coords_count = df["latitude"].notna().sum()
        if valid_coords_count == 0 and "Address" in df.columns:
            print(f"  Warning: '{coord_column}' column did not yield valid coordinates, trying 'Address' column as fallback")
            coords = df["Address"].apply(_parse_coordinates)
            df["latitude"] = coords.apply(lambda x: x[0])
            df["longitude"] = coords.apply(lambda x: x[1])
            valid_coords_count = df["latitude"].notna().sum()
            if valid_coords_count > 0:
                print(f"  Using 'Address' column for coordinates (found {valid_coords_count} valid coordinates)")
            else:
                print(f"  Warning: 'Address' column also did not yield valid coordinates")
        else:
            print(f"  Using '{coord_column}' column for coordinates (found {valid_coords_count} valid coordinates)")
    else:
        # Try Address as last resort
        if "Address" in df.columns:
            print(f"  No standard coordinate column found, trying 'Address' column")
            coords = df["Address"].apply(_parse_coordinates)
            df["latitude"] = coords.apply(lambda x: x[0])
            df["longitude"] = coords.apply(lambda x: x[1])
            valid_coords_count = df["latitude"].notna().sum()
            if valid_coords_count > 0:
                print(f"  Using 'Address' column for coordinates (found {valid_coords_count} valid coordinates)")
            else:
                df["latitude"] = pd.NA
                df["longitude"] = pd.NA
                print(f"  Warning: 'Address' column did not yield valid coordinates. Available columns: {list(df.columns)}")
        else:
            df["latitude"] = pd.NA
            df["longitude"] = pd.NA
            print(f"  Warning: No coordinate column found. Available columns: {list(df.columns)}")

    # Core columns
    df["brand"] = brand_name
    df["brand_key"] = brand_key

    # Handle store name - check "Name" first, then "data"
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

    # For compatibility with the existing frontend, treat District as City
    # If District column is empty/missing but City column exists, use City as District
    if "City" in df.columns:
        if df["District"].isna().all() or (df["District"] == "").all():
            df["District"] = df["City"]
    df["City"] = df["District"]

    # Optional type column (Padini)
    if has_type_column:
        df["Type"] = df.get("Type", pd.Series(index=df.index, dtype="object")).fillna("")
    else:
        df["Type"] = ""

    # Clean lat/lon and filter invalid rows
    df = df[
        pd.to_numeric(df["latitude"], errors="coerce").notna()
        & pd.to_numeric(df["longitude"], errors="coerce").notna()
    ].copy()
    df["latitude"] = df["latitude"].astype(float)
    df["longitude"] = df["longitude"].astype(float)

    return df


def _load_district_stats():
    """
    Load district-level statistics for choropleth overlay.

    Expected columns in Excel:
    - 'State'
    - 'District'
    - 'Population (k)'
    - 'Income per capita'
    - 'Income'
    """
    base_dir = os.path.dirname(__file__)
    candidates = [
        os.path.join(base_dir, '..', 'District Data', 'District Statistics .xlsx'),
        os.path.join(base_dir, '..', 'District Data', 'District Statistics.xlsx'),
        os.path.join(os.path.dirname(base_dir), 'District Data', 'District Statistics .xlsx'),
        os.path.join(os.path.dirname(base_dir), 'District Data', 'District Statistics.xlsx'),
        os.path.join('/var/task', 'District Data', 'District Statistics .xlsx'),  # Vercel path
        os.path.join('/var/task', 'District Data', 'District Statistics.xlsx'),  # Vercel path
    ]

    df = None
    for path in candidates:
        try:
            if os.path.exists(path):
                df = pd.read_excel(path)
                print(f"Loaded district stats from {path} with {len(df)} rows")
                break
        except (FileNotFoundError, Exception) as e:
            print(f"Warning: Could not load from {path}: {e}")
            continue

    if df is None:
        raise FileNotFoundError(
            f"District Statistics Excel file not found. Tried: {candidates}. "
            f"Current working directory: {os.getcwd()}"
        )

    df = df.copy()
    df.columns = [c.strip() for c in df.columns]

    # Rename columns to simpler keys for the frontend
    rename_map = {
        'State': 'state',
        'District': 'district',
        'Population (k)': 'population_k',
        'Income per capita': 'income_pc',
        'Income': 'income_total',
    }
    for old, new in rename_map.items():
        if old in df.columns:
            df[new] = df[old]
        else:
            # Ensure the column exists (filled with NaN) so frontend is consistent
            df[new] = pd.NA

    # Keep only the normalized columns we care about
    df = df[['state', 'district', 'population_k', 'income_pc', 'income_total']]

    return df


def _normalize_key(state: str, district: str) -> str:
    """Create a normalized join key from state + district names."""
    def norm(s: str) -> str:
        if s is None:
            return ''
        return ''.join(ch.lower() for ch in str(s) if ch.isalnum())

    return f"{norm(state)}|{norm(district)}"


def _extract_brand_name_from_filename(filename: str) -> str:
    """Extract brand name from Excel filename, cleaning it up."""
    # Remove .xlsx extension
    name = filename.replace('.xlsx', '').strip()
    
    # Handle common patterns
    name = name.replace('_CLEANED', '').replace('_DONE', '').replace(' done', '').replace(' DONE', '')
    name = name.replace('Locations', '').replace('Data', '').replace(' done', '').strip()
    
    # Handle special cases first
    if 'Parkson' in name and ('Aeon' in name or 'aeon' in name):
        return 'Parkson Aeon'
    # Handle Parkson.xlsx - recognize as Parkson
    if name == 'Parkson' or name.lower() == 'parkson':
        return 'Parkson'
    # Handle 711.xlsx - recognize as 7-Eleven
    if name == '711' or name.startswith('711'):
        return '7-Eleven'
    if '7-Eleven' in name or '7Eleven' in name or '7-Eleven' in name:
        return '7-Eleven'
    # Handle Aeon_updated.xlsx - recognize as Aeon
    if 'Aeon_updated' in name or (name.startswith('Aeon') and 'updated' in name.lower()):
        return 'Aeon'
    if name == 'Aeon' or name.lower() == 'aeon':
        return 'Aeon'
    if 'MRDiy' in name or 'MR DIY' in name or 'MRDiy' in name:
        return 'MR DIY'
    if 'MRToy' in name or 'MR Toy' in name or 'MRToy' in name:
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
    
    # Clean up remaining name
    name = name.strip()
    # Capitalize properly
    if name:
        # Split by spaces and capitalize each word
        words = name.split()
        name = ' '.join(word.capitalize() for word in words)
    
    return name


def _filename_to_brand_key(filename: str) -> str:
    """Convert filename to normalized brand_key."""
    name = _extract_brand_name_from_filename(filename).lower()
    
    # Remove special characters, keep only alphanumeric
    key = ''.join(ch for ch in name if ch.isalnum() or ch == ' ')
    key = key.replace(' ', '').strip()
    
    # Handle special cases
    if '7-eleven' in key or '7eleven' in key or key == '711':
        return '7eleven'
    if 'parkson' in key and 'aeon' in key:
        return 'parksonaeon'
    if key == 'parkson':
        return 'parkson'
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


# Brand color mapping based on user specifications
BRAND_COLORS = {
    'mrdiy': '#FFC82E',
    'ecoshop': '#4CAF50',
    'mrtoy': '#E53935',
    'familymart': '#FF6B35',  # Bright orange-red for Family Mart (more distinct from 7-Eleven)
    'mynews': '#D50000',
    'kkmart': '#FB8C00',
    'speedmart': '#FF9800',  # Orange
    'orientalkopi': '#2196F3',  # Blue for Oriental Kopi
    'oldtown': '#8D6E63',
    'teagarden': '#81C784',
    'papparich': '#880E4F',
    'padini': '#9B59B6',  # Purple for Padini (changed from black for better visibility)
    'hnm': '#E74C3C',  # Bright red for H&M (more distinct from Uniqlo)
    'uniqlo': '#E60012',  # Keep Uniqlo red as requested
    'hla': '#3498DB',  # Bright blue for HLA (changed from dark blue for better visibility)
    'parkson': '#9C27B0',  # Purple
    'parksonaeon': '#9C27B0',  # Purple
    'aeon': '#FF5722',  # Deep Orange (changed from dark purple to differentiate from Parkson Aeon)
    'tomei': '#FFD700',  # Gold (brightened for better visibility)
    'pohkong': '#00BCD4',  # Cyan/Teal (changed to differentiate from other gold shops)
    'habib': '#FF6B6B',  # Coral/Pink (changed to differentiate from other gold shops)
    'wahchan': '#4A90E2',  # Blue (changed to differentiate from other gold shops)
    '7eleven': '#2ECC71',  # Bright green for 7-Eleven (more distinct from Family Mart)
    'memangmeow': '#9C27B0',  # Purple (existing)
}


def _scan_finalized_data_folder():
    """
    Dynamically scan the Finalized Data folder structure.
    Returns a list of tuples: (filepath, category, brand_name, brand_key, has_type_column)
    """
    base_dir = os.path.dirname(__file__)
    
    # Try multiple path candidates for robustness in different environments
    finalized_data_candidates = [
        os.path.join(base_dir, "..", "Finalized Data"),
        os.path.join(os.path.dirname(base_dir), "Finalized Data"),
        "Finalized Data",  # Try relative to current working directory
        os.path.join("/var/task", "Finalized Data"),  # Vercel serverless path
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
    
    # Scan root level files (these become their own categories)
    root_files = []
    if os.path.exists(finalized_data_path):
        try:
            for item in os.listdir(finalized_data_path):
                item_path = os.path.join(finalized_data_path, item)
                if os.path.isfile(item_path) and item.lower().endswith('.xlsx'):
                    filename = os.path.basename(item)
                    brand_name = _extract_brand_name_from_filename(filename)
                    brand_key = _filename_to_brand_key(filename)
                    
                    # Group MR DIY and MR TOY into the same category
                    if brand_key.lower() in ['mrdiy', 'mrtoy']:
                        category = 'MR DIY + MR TOY'  # Same category for both
                    else:
                        category = brand_name  # Root files become their own category
                    
                    # Check if it's Padini (has Type column)
                    has_type = 'padini' in brand_key.lower()
                    
                    discovered_files.append((item_path, category, brand_name, brand_key, has_type))
                    root_files.append(filename)
        except Exception as e:
            print(f"Warning: Error scanning root files in {finalized_data_path}: {e}")
    
    # Scan subfolders (folder name = category)
    if os.path.exists(finalized_data_path):
        try:
            for item in os.listdir(finalized_data_path):
                item_path = os.path.join(finalized_data_path, item)
                if os.path.isdir(item_path):
                    category = item  # Folder name is the category
                    
                    try:
                        for subitem in os.listdir(item_path):
                            subitem_path = os.path.join(item_path, subitem)
                            # Skip temporary Excel files (starting with ~$)
                            if subitem.startswith('~$'):
                                continue
                            if os.path.isfile(subitem_path) and subitem.lower().endswith('.xlsx'):
                                filename = os.path.basename(subitem)
                                
                                brand_name = _extract_brand_name_from_filename(filename)
                                brand_key = _filename_to_brand_key(filename)
                                
                                # Check if it's Padini (has Type column)
                                has_type = 'padini' in brand_key.lower()
                                
                                discovered_files.append((subitem_path, category, brand_name, brand_key, has_type))
                    except Exception as e:
                        print(f"Warning: Error scanning subfolder {item_path}: {e}")
                        continue
        except Exception as e:
            print(f"Warning: Error scanning subfolders in {finalized_data_path}: {e}")
    
    if not discovered_files:
        raise ValueError(f"No Excel files found in {finalized_data_path}")
    
    return discovered_files


def load_data():
    """
    Load and combine all brand datasets into a single dataframe.
    Dynamically scans the Finalized Data folder structure.
    """
    dataframes = []
    discovered_files = _scan_finalized_data_folder()
    
    # Load each discovered file
    for filepath, category, brand_name, brand_key, has_type_column in discovered_files:
        try:
            # Use absolute path directly since _load_brand_file now handles it
            df = _load_brand_file(filepath, brand_key, brand_name, has_type_column=has_type_column)
            df["category"] = category  # Store the category
            dataframes.append(df)
        except Exception as e:
            print(f"Warning: Failed to load {filepath}: {e}")
            continue
    
    if not dataframes:
        raise ValueError("No data files found in Finalized Data folder")
    
    combined = pd.concat(dataframes, ignore_index=True)
    
    # Use category as sector (for backward compatibility with existing frontend)
    combined["sector"] = combined.get("category", "").fillna("")
    
    return combined

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/favicon.ico')
def favicon():
    return '', 204  # Return empty response with 204 status

@app.route('/api/data')
def get_data():
    try:
        df = load_data()
        # Clean the data for API output
        df_clean = df.copy()
        df_clean['City'] = df_clean.get('City', '').fillna('Unknown').astype(str)
        df_clean['State'] = df_clean.get('State', '').fillna('Unknown').astype(str)
        df_clean['Store Name'] = df_clean.get('Store Name', '').fillna('Unknown Store').astype(str)
        df_clean['brand'] = df_clean.get('brand', '').fillna('Unknown').astype(str)
        df_clean['brand_key'] = df_clean.get('brand_key', '').fillna('').astype(str)
        df_clean['Type'] = df_clean.get('Type', '').fillna('').astype(str)
        df_clean['sector'] = df_clean.get('sector', '').fillna('').astype(str)
        df_clean['category'] = df_clean.get('category', '').fillna('').astype(str)

        # Build per-store GeoJSON features (one point per store)
        features = []
        for idx, row in df_clean.iterrows():
            brand_key = str(row.get('brand_key', '')).lower()
            category = str(row.get('category', ''))
            # Get brand color
            brand_color = BRAND_COLORS.get(brand_key, '#666666')
            
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(row['longitude']), float(row['latitude'])]
                },
                "properties": {
                    "id": int(idx),
                    "store_code": str(row.get('Type', '')),
                    "store_name": str(row['Store Name']),
                    "address": str(row.get('Address', '')).replace('\\n', ', '),
                    "city": str(row.get('City', '')),
                    "state": str(row.get('State', '')),
                    "brand": str(row.get('brand', '')),
                    "brand_key": brand_key,
                    "sector": str(row.get('sector', '')),
                    "category": category,
                    "color": brand_color,
                }
            }
            features.append(feature)

        return jsonify({
            "type": "FeatureCollection",
            "features": features
        })
    except Exception as e:
        import traceback
        return jsonify({
            "error": "Failed to load data",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500

@app.route('/api/categories')
def get_categories():
    """
    Return all available categories with their companies.
    """
    try:
        discovered_files = _scan_finalized_data_folder()
        
        # Group by category
        categories = {}
        for filepath, category, brand_name, brand_key, has_type_column in discovered_files:
            if category not in categories:
                categories[category] = []
            
            color = BRAND_COLORS.get(brand_key.lower(), '#666666')
            categories[category].append({
                'brand_name': brand_name,
                'brand_key': brand_key,
                'color': color
            })
        
        # Convert to list format for frontend
        result = []
        for category, companies in sorted(categories.items()):
            result.append({
                'category': category,
                'companies': sorted(companies, key=lambda x: x['brand_name'])
            })
        
        return jsonify(result)
    except Exception as e:
        import traceback
        return jsonify({
            "error": "Failed to load categories",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500


@app.route('/api/brand-colors')
def get_brand_colors():
    """Return the complete brand color mapping."""
    return jsonify(BRAND_COLORS)


@app.route('/api/stats')
def get_stats():
    try:
        df = load_data()
        
        # Calculate basic statistics
        # Clean the data first
        df_clean = df.copy()
        df_clean['City'] = df_clean.get('City', '').fillna('Unknown').astype(str)
        df_clean['State'] = df_clean.get('State', '').fillna('Unknown').astype(str)
        df_clean['brand'] = df_clean.get('brand', '').fillna('Unknown').astype(str)
        
        # Remove rows with 'nan' or empty values
        df_clean = df_clean[df_clean['City'] != 'nan']
        df_clean = df_clean[df_clean['State'] != 'nan']
        df_clean = df_clean[df_clean['City'] != '']
        df_clean = df_clean[df_clean['State'] != '']
        
        stats = {
            "total_locations": len(df),
            "cities": df_clean['City'].value_counts().head(10).to_dict() if 'City' in df_clean.columns else {},
            "states": df_clean['State'].value_counts().to_dict() if 'State' in df_clean.columns else {},
            "brands": df_clean['brand'].value_counts().to_dict(),
            "data_columns": list(df.columns)
        }
        
        return jsonify(stats)
    except Exception as e:
        import traceback
        return jsonify({
            "error": "Failed to load stats",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500


@app.route('/api/district_stats')
def get_district_stats():
    """
    Return district statistics for choropleth overlay.

    The frontend will geocode these districts client-side using Mapbox
    and build approximate polygons to color by the chosen metric.
    """
    try:
        df = _load_district_stats()
        # Ensure numeric types where possible
        for col in ['population_k', 'income_pc', 'income_total']:
            df[col] = pd.to_numeric(df[col], errors='coerce')

        records = df.to_dict(orient='records')
        return jsonify(records)
    except Exception as e:
        import traceback
        return jsonify({
            "error": "Failed to load district stats",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500


@app.route('/api/districts')
def get_districts():
    """
    Return district polygons with attached statistics for choropleth overlay.

    Expects a GeoJSON file at static/malaysia.district.geojson with district polygons.
    Joins Excel stats to GeoJSON features by normalized (state, district) name.
    """
    try:
        base_dir = os.path.dirname(__file__)
        geojson_path = os.path.join(base_dir, 'static', 'malaysia.district.geojson')

        # Load district stats
        stats_df = _load_district_stats()
        for col in ['population_k', 'income_pc', 'income_total']:
            stats_df[col] = pd.to_numeric(stats_df[col], errors='coerce')

        # Helper function to normalize district names (handle W.P. vs Wp variations)
        def normalize_district_name(name):
            if not name:
                return name
            name_str = str(name).strip()
            # Remove periods and normalize spacing
            normalized = name_str.replace('.', '').strip()
            # Handle W.P. variations - convert to consistent "Wp" format
            if normalized.upper().startswith('WP '):
                normalized = 'Wp ' + normalized[3:].strip()
            elif normalized.upper().startswith('W P '):
                normalized = 'Wp ' + normalized[4:].strip()
            elif normalized.upper().startswith('WP'):
                normalized = 'Wp ' + normalized[2:].strip()
            return normalized

        stats_df['join_key'] = stats_df.apply(
            lambda r: _normalize_key(r['state'], r['district']),
            axis=1
        )
        stats_map = {
            key: {
                'population_k': row['population_k'],
                'income_pc': row['income_pc'],
                'income_total': row['income_total'],
            }
            for key, row in stats_df.set_index('join_key').iterrows()
        }
        
        # Create a secondary map for federal territories by district name only
        # This handles the Excel data issue where State/District columns are swapped
        ft_district_map = {}
        for _, row in stats_df.iterrows():
            state_val = str(row['state']).strip() if pd.notna(row['state']) else ''
            district_val = str(row['district']).strip() if pd.notna(row['district']) else ''
            # For federal territories, create a map by normalized district name
            if 'Wp' in state_val or 'W.P.' in state_val or 'Wp' in district_val or 'W.P.' in district_val:
                normalized_dist = normalize_district_name(district_val) if district_val else ''
                if normalized_dist:
                    # Use district name as key (handles swapped columns)
                    ft_key = _normalize_key('', normalized_dist)  # Empty state, just district
                    if ft_key not in ft_district_map:
                        ft_district_map[ft_key] = {
                            'population_k': row['population_k'],
                            'income_pc': row['income_pc'],
                            'income_total': row['income_total'],
                        }
        
        # Create a secondary map for federal territories by district name only
        # This handles the Excel data issue where State/District columns are swapped
        ft_district_map = {}
        for _, row in stats_df.iterrows():
            state_val = str(row['state']).strip() if pd.notna(row['state']) else ''
            district_val = str(row['district']).strip() if pd.notna(row['district']) else ''
            # For federal territories, create a map by normalized district name
            if 'Wp' in state_val or 'W.P.' in state_val or 'Wp' in district_val or 'W.P.' in district_val:
                normalized_dist = normalize_district_name(district_val) if district_val else ''
                if normalized_dist:
                    # Use district name as key (handles swapped columns)
                    ft_key = _normalize_key('', normalized_dist)  # Empty state, just district
                    if ft_key not in ft_district_map:
                        ft_district_map[ft_key] = {
                            'population_k': row['population_k'],
                            'income_pc': row['income_pc'],
                            'income_total': row['income_total'],
                        }

        # Load district GeoJSON
        try:
            with open(geojson_path, 'r', encoding='utf-8') as f:
                geo = json.load(f)
        except FileNotFoundError:
            return jsonify({'error': 'District GeoJSON not found', 'path': geojson_path}), 404

        # Map of state codes (from GeoJSON) to full state names (from Excel)
        # Note: GeoJSON uses KUL, LBN, PJY for federal territories, but Excel uses Wp prefix
        state_code_map = {
            'JHR': 'Johor',
            'KDH': 'Kedah',
            'KTN': 'Kelantan',
            'MLK': 'Melaka',
            'NSN': 'Negeri Sembilan',
            'PHG': 'Pahang',
            'PRK': 'Perak',
            'PLS': 'Perlis',
            'PNG': 'Pulau Pinang',
            'SBH': 'Sabah',
            'SWK': 'Sarawak',
            'SGR': 'Selangor',
            'TRG': 'Terengganu',
            'WPK': 'Wp Kuala Lumpur',
            'WPL': 'Wp Labuan',
            'WPP': 'Wp Putrajaya',
            # Add actual GeoJSON state codes
            'KUL': 'Wp Kuala Lumpur',
            'LBN': 'Wp Labuan',
            'PJY': 'Wp Putrajaya',
        }

        # Attach stats to each feature where possible
        unmatched_districts = []
        for feature in geo.get('features', []):
            props = feature.setdefault('properties', {})

            # Try a few common property names
            raw_state = (
                props.get('state')
                or props.get('State')
                or props.get('STATE')
            )
            # Many district files use 'name' for district name
            raw_district = (
                props.get('district')
                or props.get('District')
                or props.get('DISTRICT')
                or props.get('name')
            )

            # Normalize state: convert 3-letter codes (e.g. 'JHR') to full names (e.g. 'Johor')
            if isinstance(raw_state, str) and len(raw_state) == 3 and raw_state.isupper():
                state = state_code_map.get(raw_state, raw_state)
            else:
                state = raw_state

            district = normalize_district_name(raw_district)

            # Try multiple matching strategies
            key = _normalize_key(state, district)
            stats = stats_map.get(key)

            # Fallback 1: For federal territories, try matching district name as state name
            if not stats and state and 'Wp' in state:
                # Try matching with just the district name (federal territories often have same name for state and district)
                alt_key = _normalize_key(state, state.replace('Wp ', '').strip())
                stats = stats_map.get(alt_key)
                if not stats:
                    # Try with "W.P." prefix variations
                    for alt_state in [state, state.replace('Wp ', 'W.P. '), state.replace('Wp ', 'Wp ')]:
                        alt_key = _normalize_key(alt_state, district)
                        stats = stats_map.get(alt_key)
                        if stats:
                            break

            # Fallback 2: For federal territories, match by district name only (handles swapped Excel columns)
            if not stats and district and (state and ('Wp' in state or 'W.P.' in state) or district and ('Wp' in district or 'W.P.' in district)):
                normalized_dist = normalize_district_name(district)
                # Try matching by district name only (ignoring state column in Excel)
                ft_key = _normalize_key('', normalized_dist)
                ft_stats = ft_district_map.get(ft_key)
                if ft_stats:
                    stats = ft_stats
                else:
                    # Try with the district name as both state and district (for cases where Excel has same in both columns)
                    alt_key = _normalize_key(normalized_dist, normalized_dist)
                    alt_stats = stats_map.get(alt_key)
                    if alt_stats:
                        stats = alt_stats

            # Fallback 3: Handle Excel data issue where Kuala Lumpur/Putrajaya rows have swapped columns
            if not stats:
                # Check if this is a federal territory district that might have swapped data
                if state and ('Wp' in state or 'W.P.' in state) and district:
                    # Try swapping: look for rows where State column matches this district name
                    # and District column matches this state name
                    swapped_key = _normalize_key(district, state)
                    swapped_stats = stats_map.get(swapped_key)
                    if swapped_stats:
                        stats = swapped_stats
                    # Also try with normalized variations
                    if not stats:
                        normalized_district = normalize_district_name(district)
                        normalized_state = normalize_district_name(state)
                        swapped_key = _normalize_key(normalized_district, normalized_state)
                        swapped_stats = stats_map.get(swapped_key)
                        if swapped_stats:
                            stats = swapped_stats

            # Fallback 4: Try alternative district name variations
            if not stats and district:
                # Try without "Wp" prefix
                alt_district = district.replace('Wp ', '').replace('W.P. ', '').replace('WP ', '').strip()
                if alt_district != district:
                    alt_key = _normalize_key(state, alt_district)
                    stats = stats_map.get(alt_key)
            
            # Fallback 5: Handle cases where Excel has "District State" format (e.g., "Petaling Selangor")
            if not stats and district and state:
                # Try matching where Excel district column contains both district and state name
                # e.g., Excel has "Petaling Selangor" but GeoJSON has district="Petaling", state="Selangor"
                combined_name = f"{district} {state}".strip()
                alt_key = _normalize_key(state, combined_name)
                stats = stats_map.get(alt_key)
                if not stats:
                    # Also try with just the combined name as district (in case state column is empty in Excel)
                    alt_key = _normalize_key('', combined_name)
                    stats = stats_map.get(alt_key)
                if not stats:
                    # Try reverse: "State District" format
                    reverse_combined = f"{state} {district}".strip()
                    alt_key = _normalize_key(state, reverse_combined)
                    stats = stats_map.get(alt_key)
            
            # Fallback 6: Try fuzzy matching - check if any Excel row has district name that contains our district
            # This handles cases like Excel has "Petaling Selangor" and we're looking for "Petaling"
            if not stats and district and state:
                normalized_district = ''.join(ch.lower() for ch in str(district) if ch.isalnum())
                normalized_state = ''.join(ch.lower() for ch in str(state) if ch.isalnum())
                for excel_key, excel_stats in stats_map.items():
                    # excel_key format is "state|district"
                    if '|' in excel_key:
                        excel_state_part = excel_key.split('|')[0]
                        excel_district_part = excel_key.split('|')[1]
                        # Check if Excel district contains our district name (e.g., "petalingselangor" contains "petaling")
                        # and state matches (e.g., "selangor" matches)
                        if normalized_district and excel_district_part:
                            district_match = normalized_district in excel_district_part or excel_district_part in normalized_district
                            state_match = normalized_state in excel_state_part or excel_state_part in normalized_state or not excel_state_part
                            # Only match if district is a clear substring match and state matches
                            if district_match and state_match and len(normalized_district) >= 4:  # Require at least 4 chars to avoid false matches
                                stats = excel_stats
                                break

            if stats:
                props['population_k'] = float(stats['population_k']) if pd.notna(stats['population_k']) else None
                props['income_pc'] = float(stats['income_pc']) if pd.notna(stats['income_pc']) else None
                props['income_total'] = float(stats['income_total']) if pd.notna(stats['income_total']) else None
            else:
                # Log unmatched districts for debugging
                unmatched_districts.append(f"{state}|{district}")
                # Ensure properties exist even if no stats match
                props.setdefault('population_k', None)
                props.setdefault('income_pc', None)
                props.setdefault('income_total', None)

        # Log unmatched districts (for debugging - can be removed in production)
        if unmatched_districts:
            print(f"Warning: {len(unmatched_districts)} districts could not be matched: {unmatched_districts[:10]}")

        return jsonify(geo)
    except Exception as e:
        import traceback
        return jsonify({
            "error": "Failed to load districts",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500

@app.route('/api/states')
def get_states():
    try:
        base_dir = os.path.dirname(__file__)
        geojson_path = os.path.join(base_dir, 'static', 'malaysia.state.geojson')
        with open(geojson_path, 'r', encoding='utf-8') as f:
            geojson_data = json.load(f)
        return jsonify(geojson_data)
    except Exception as e:
        import traceback
        return jsonify({
            "error": "Failed to load states",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500


@app.route('/api/distribution-centers')
def get_distribution_centers():
    """
    Return 99 SpeedMart distribution centers from JSON file.
    Converts the JSON structure to GeoJSON format for the map.
    """
    try:
        base_dir = os.path.dirname(__file__)
        json_path = os.path.join(base_dir, "..", "Finalized Data", "99speedmart-distribution-centers.json")
        
        # Try multiple path candidates
        candidates = [
            json_path,
            os.path.join(os.path.dirname(base_dir), "Finalized Data", "99speedmart-distribution-centers.json"),
            "Finalized Data/99speedmart-distribution-centers.json",
            os.path.join("/var/task", "Finalized Data", "99speedmart-distribution-centers.json"),  # Vercel path
        ]
        
        json_data = None
        for path in candidates:
            try:
                if os.path.exists(path):
                    with open(path, 'r', encoding='utf-8') as f:
                        json_data = json.load(f)
                    print(f"Loaded distribution centers from {path}")
                    break
            except Exception as e:
                continue
        
        if json_data is None:
            return jsonify({
                "type": "FeatureCollection",
                "features": []
            })
        
        # Convert to GeoJSON format
        features = []
        for state_group in json_data:
            for location in state_group.get('locations', []):
                # Parse GPS coordinates (format: "lat, lon")
                gps_str = location.get('gps', '')
                if gps_str:
                    try:
                        parts = gps_str.split(',')
                        if len(parts) >= 2:
                            lat = float(parts[0].strip())
                            lon = float(parts[1].strip())
                            
                            feature = {
                                "type": "Feature",
                                "geometry": {
                                    "type": "Point",
                                    "coordinates": [lon, lat]  # GeoJSON uses [lon, lat]
                                },
                                "properties": {
                                    "code": location.get('code', ''),
                                    "name": location.get('name', ''),
                                    "address": location.get('address', ''),
                                    "state": state_group.get('state', ''),
                                    "gps": gps_str,
                                    "google_maps_url": location.get('google_maps_url', ''),
                                    "type": "distribution_center"
                                }
                            }
                            features.append(feature)
                    except (ValueError, IndexError) as e:
                        print(f"Warning: Could not parse GPS coordinates '{gps_str}': {e}")
                        continue
        
        return jsonify({
            "type": "FeatureCollection",
            "features": features
        })
    except Exception as e:
        import traceback
        return jsonify({
            "error": "Failed to load distribution centers",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500

@app.route('/api/mrdiy-distribution-centers')
def get_mrdiy_distribution_centers():
    """
    Return MR DIY distribution centers from JSON file.
    Converts the JSON structure to GeoJSON format for the map.
    """
    try:
        base_dir = os.path.dirname(__file__)
        json_path = os.path.join(base_dir, "..", "Finalized Data", "mr_diy_distribution_centers.json")
        
        # Try multiple path candidates
        candidates = [
            json_path,
            os.path.join(os.path.dirname(base_dir), "Finalized Data", "mr_diy_distribution_centers.json"),
            "Finalized Data/mr_diy_distribution_centers.json",
            os.path.join("/var/task", "Finalized Data", "mr_diy_distribution_centers.json"),  # Vercel path
        ]
        
        json_data = None
        for path in candidates:
            try:
                if os.path.exists(path):
                    with open(path, 'r', encoding='utf-8') as f:
                        json_data = json.load(f)
                    print(f"Loaded MR DIY distribution centers from {path}")
                    break
            except Exception as e:
                continue
        
        if json_data is None:
            return jsonify({
                "type": "FeatureCollection",
                "features": []
            })
        
        # Convert to GeoJSON format
        features = []
        for state_group in json_data:
            for location in state_group.get('locations', []):
                # Parse GPS coordinates (format: "lat, lon")
                gps_str = location.get('gps', '')
                if gps_str:
                    try:
                        parts = gps_str.split(',')
                        if len(parts) >= 2:
                            lat = float(parts[0].strip())
                            lon = float(parts[1].strip())
                            
                            feature = {
                                "type": "Feature",
                                "geometry": {
                                    "type": "Point",
                                    "coordinates": [lon, lat]  # GeoJSON uses [lon, lat]
                                },
                                "properties": {
                                    "code": location.get('code', ''),
                                    "name": location.get('name', ''),
                                    "address": location.get('address', ''),
                                    "state": state_group.get('state', ''),
                                    "gps": gps_str,
                                    "google_maps_url": location.get('google_maps_url', ''),
                                    "type": "distribution_center"
                                }
                            }
                            features.append(feature)
                    except (ValueError, IndexError) as e:
                        print(f"Warning: Could not parse GPS coordinates '{gps_str}': {e}")
                        continue
        
        return jsonify({
            "type": "FeatureCollection",
            "features": features
        })
    except Exception as e:
        import traceback
        return jsonify({
            "error": "Failed to load MR DIY distribution centers",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500

@app.route('/api/orientalkopi-distribution-centers')
def get_orientalkopi_distribution_centers():
    """
    Return Oriental Kopi distribution centers from JSON file.
    Converts the JSON structure to GeoJSON format for the map.
    """
    try:
        base_dir = os.path.dirname(__file__)
        json_path = os.path.join(base_dir, "..", "Finalized Data", "oriental_kopi_distribution_centers.json")
        
        # Try multiple path candidates
        candidates = [
            json_path,
            os.path.join(os.path.dirname(base_dir), "Finalized Data", "oriental_kopi_distribution_centers.json"),
            "Finalized Data/oriental_kopi_distribution_centers.json",
            os.path.join("/var/task", "Finalized Data", "oriental_kopi_distribution_centers.json"),  # Vercel path
        ]
        
        json_data = None
        for path in candidates:
            try:
                if os.path.exists(path):
                    with open(path, 'r', encoding='utf-8') as f:
                        json_data = json.load(f)
                    print(f"Loaded Oriental Kopi distribution centers from {path}")
                    break
            except Exception as e:
                continue
        
        if json_data is None:
            return jsonify({
                "type": "FeatureCollection",
                "features": []
            })
        
        # Convert to GeoJSON format
        features = []
        for state_group in json_data:
            for location in state_group.get('locations', []):
                # Parse GPS coordinates (format: "lat, lon")
                gps_str = location.get('gps', '')
                if gps_str:
                    try:
                        parts = gps_str.split(',')
                        if len(parts) >= 2:
                            lat = float(parts[0].strip())
                            lon = float(parts[1].strip())
                            
                            feature = {
                                "type": "Feature",
                                "geometry": {
                                    "type": "Point",
                                    "coordinates": [lon, lat]  # GeoJSON uses [lon, lat]
                                },
                                "properties": {
                                    "code": location.get('code', ''),
                                    "name": location.get('name', ''),
                                    "address": location.get('address', ''),
                                    "state": state_group.get('state', ''),
                                    "postcode": location.get('postcode', ''),
                                    "district": location.get('district', ''),
                                    "gps": gps_str,
                                    "google_maps_url": location.get('google_maps_url', ''),
                                    "type": "distribution_center"
                                }
                            }
                            features.append(feature)
                    except (ValueError, IndexError) as e:
                        print(f"Warning: Could not parse GPS coordinates '{gps_str}': {e}")
                        continue
        
        return jsonify({
            "type": "FeatureCollection",
            "features": features
        })
    except Exception as e:
        import traceback
        return jsonify({
            "error": "Failed to load Oriental Kopi distribution centers",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500

@app.route('/logos/<path:filename>')
def serve_logo(filename: str):
    """
    Serve brand logos from the shared Logos directory at the project root.

    This lets the frontend access logos via /logos/<filename>,
    e.g. /logos/Padini Logo.png
    """
    base_dir = os.path.dirname(__file__)
    logos_dir = os.path.join(base_dir, "..", "Logos")
    return send_from_directory(logos_dir, filename)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

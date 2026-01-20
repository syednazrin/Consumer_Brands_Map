from flask import Flask, render_template, jsonify
import pandas as pd
import json

app = Flask(__name__)

# Load the data
def load_data():
    try:
        # Try to load from Excel file first
        df = pd.read_excel('cleaned_99speedmart_addresses.xlsx')
        print(f"Successfully loaded Excel file with {len(df)} rows")
    except FileNotFoundError:
        print("Excel file not found, trying CSV...")
        try:
            df = pd.read_csv('99speedmart-stores.csv')
            print(f"Successfully loaded CSV file with {len(df)} rows")
        except FileNotFoundError:
            print("Neither Excel nor CSV file found. Creating sample data...")
            # Create sample data if no files are found
            df = pd.DataFrame({
                'Store Name': ['99 Speedmart Store 1', '99 Speedmart Store 2', '99 Speedmart Store 3'],
                'Address': ['123 Main St', '456 Oak Ave', '789 Pine Rd'],
                'City': ['Kuala Lumpur', 'Petaling Jaya', 'Shah Alam'],
                'State': ['Selangor', 'Selangor', 'Selangor'],
                'Latitude': [3.1390, 3.1073, 3.0733],
                'Longitude': [101.6869, 101.6067, 101.5185],
                'Store Code': ['1001', '1002', '1003']
            })
    except Exception as e:
        print(f"Error loading data: {e}")
        # Create sample data as fallback
        df = pd.DataFrame({
            'Store Name': ['99 Speedmart Store 1', '99 Speedmart Store 2', '99 Speedmart Store 3'],
            'Address': ['123 Main St', '456 Oak Ave', '789 Pine Rd'],
            'City': ['Kuala Lumpur', 'Petaling Jaya', 'Shah Alam'],
            'State': ['Selangor', 'Selangor', 'Selangor'],
            'Latitude': [3.1390, 3.1073, 3.0733],
            'Longitude': [101.6869, 101.6067, 101.5185],
            'Store Code': ['1001', '1002', '1003']
        })
    
    return df

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/favicon.ico')
def favicon():
    return '', 204  # Return empty response with 204 status

@app.route('/api/data')
def get_data():
    """
    Return store data as GeoJSON for mapping
    """
    df = load_data()
    
    # Clean the data first
    df_clean = df.copy()
    df_clean['State'] = df_clean['State'].fillna('Unknown').astype(str)
    df_clean['City'] = df_clean['City'].fillna('Unknown').astype(str)
    df_clean['Store Name'] = df_clean['Store Name'].fillna('Unknown Store').astype(str)
    
    # Remove rows with 'nan' or empty values or missing coordinates
    df_clean = df_clean[df_clean['State'] != 'nan']
    df_clean = df_clean[df_clean['State'] != '']
    df_clean = df_clean[df_clean['City'] != 'nan']
    df_clean = df_clean[df_clean['City'] != '']
    df_clean = df_clean[df_clean['Latitude'].notna()]
    df_clean = df_clean[df_clean['Longitude'].notna()]
    
    features = []
    for idx, row in df_clean.iterrows():
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [float(row['Longitude']), float(row['Latitude'])]
            },
            "properties": {
                "id": idx,
                "store_code": str(row.get('Store Code', 'N/A')),
                "store_name": str(row['Store Name']),
                "address": str(row['Address']),
                "city": str(row['City']),
                "state": str(row['State'])
            }
        }
        features.append(feature)
    
    return jsonify({
        "type": "FeatureCollection",
        "features": features
    })

@app.route('/api/stats')
def get_stats():
    """
    Return statistics about the stores
    """
    df = load_data()
    
    # Clean the data first
    df_clean = df.copy()
    df_clean['City'] = df_clean['City'].fillna('Unknown').astype(str)
    df_clean['State'] = df_clean['State'].fillna('Unknown').astype(str)
    
    # Remove rows with 'nan' or empty values
    df_clean = df_clean[df_clean['City'] != 'nan']
    df_clean = df_clean[df_clean['State'] != 'nan']
    df_clean = df_clean[df_clean['City'] != '']
    df_clean = df_clean[df_clean['State'] != '']
    
    stats = {
        "total_locations": len(df_clean),
        "cities": df_clean['City'].value_counts().head(10).to_dict() if 'City' in df_clean.columns else {},
        "states": df_clean['State'].value_counts().to_dict() if 'State' in df_clean.columns else {},
        "data_columns": list(df.columns)
    }
    
    return jsonify(stats)

@app.route('/api/states')
def get_states():
    """
    Return Malaysia state boundaries GeoJSON
    """
    try:
        with open('static/malaysia.state.geojson', 'r', encoding='utf-8') as f:
            geojson_data = json.load(f)
        return jsonify(geojson_data)
    except FileNotFoundError:
        return jsonify({"error": "GeoJSON file not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/state-summary')
def get_state_summary():
    """
    Return aggregated store counts by state with center coordinates
    """
    df = load_data()
    
    # Clean the data first
    df_clean = df.copy()
    df_clean['State'] = df_clean['State'].fillna('Unknown').astype(str)
    df_clean['City'] = df_clean['City'].fillna('Unknown').astype(str)
    
    # Remove rows with 'nan' or empty values
    df_clean = df_clean[df_clean['State'] != 'nan']
    df_clean = df_clean[df_clean['State'] != '']
    
    # Group by state and create state-level features
    state_groups = df_clean.groupby('State').agg({
        'Store Name': 'count',
        'City': lambda x: x.nunique(),
        'Address': 'first'  # Just to have some data
    }).reset_index()
    
    state_groups.columns = ['state', 'store_count', 'city_count', 'sample_address']
    
    # State center coordinates (approximate centers of Malaysian states)
    state_centers = {
        'Selangor': [101.5185, 3.0733],
        'Johor': [103.7638, 1.4927],
        'Perak': [101.0901, 4.5921],
        'Kedah': [100.3601, 6.1254],
        'Sarawak': [110.3592, 1.5533],
        'Negeri Sembilan': [102.2430, 2.7258],
        'Wp Kuala Lumpur': [101.6869, 3.1390],
        'Kuala Lumpur': [101.6869, 3.1390],
        'Pahang': [102.2562, 3.8077],
        'Sabah': [116.0753, 5.9788],
        'Pulau Pinang': [100.3327, 5.4164],
        'Penang': [100.3327, 5.4164],
        'Melaka': [102.2501, 2.1896],
        'Terengganu': [103.1408, 5.3117],
        'Kelantan': [102.2386, 6.1256],
        'Perlis': [100.2049, 6.4414],
        'Wp Putrajaya': [101.6964, 2.9264],
        'Putrajaya': [101.6964, 2.9264],
        'Wp Labuan': [115.2415, 5.2763],
        'Labuan': [115.2415, 5.2763]
    }
    
    features = []
    for idx, row in state_groups.iterrows():
        state_name = row['state']
        coordinates = state_centers.get(state_name, [101.6869, 3.1390])  # Default to KL if not found
        
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": coordinates
            },
            "properties": {
                "id": idx,
                "state": state_name,
                "store_count": int(row['store_count']),
                "city_count": int(row['city_count']),
                "sample_address": str(row['sample_address']) if pd.notna(row['sample_address']) else ''
            }
        }
        features.append(feature)
    
    return jsonify({
        "type": "FeatureCollection",
        "features": features
    })

if __name__ == '__main__':
    app.run(debug=True, port=5001)


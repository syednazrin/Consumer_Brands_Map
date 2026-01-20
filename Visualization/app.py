"""
Flask server for Mapbox Store & District Visualization System
"""

from flask import Flask, render_template, send_from_directory, jsonify
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/data/<path:filename>')
def serve_finalized_data(filename):
    """Serve files from Finalized Data directory"""
    data_root = os.path.join('..', 'Finalized Data')
    return send_from_directory(data_root, filename)

@app.route('/district-data/<path:filename>')
def serve_district_data(filename):
    """Serve files from District Data directory"""
    district_root = os.path.join('..', 'District Data')
    return send_from_directory(district_root, filename)

@app.route('/api/categories')
def get_categories():
    """Return list of available categories"""
    try:
        data_root = os.path.join('..', 'Finalized Data')
        categories = []
        
        if os.path.exists(data_root):
            for item in os.listdir(data_root):
                item_path = os.path.join(data_root, item)
                if os.path.isdir(item_path) and item != 'Additional Scripts':
                    # Check if it has a GEOJSON Data folder
                    geojson_path = os.path.join(item_path, 'GEOJSON Data')
                    if os.path.exists(geojson_path):
                        categories.append(item)
        
        categories.sort()
        return jsonify(categories)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/category/<category_name>/files')
def get_category_files(category_name):
    """Return list of GeoJSON files for a category"""
    try:
        geojson_path = os.path.join('..', 'Finalized Data', category_name, 'GEOJSON Data')
        files = []
        
        if os.path.exists(geojson_path):
            for file in os.listdir(geojson_path):
                if file.endswith('.geojson'):
                    files.append(file)
        
        return jsonify(files)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print('='*60)
    print('Mapbox Store & District Visualization System')
    print('='*60)
    print('Server starting on http://localhost:5001')
    print('Open your browser to view the visualization')
    print('='*60)
    app.run(debug=True, port=5001, host='0.0.0.0')

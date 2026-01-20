from flask import Flask, render_template, jsonify, send_from_directory
import pandas as pd
import json
import os
import sys

# Add the Template directory to the path so we can import app functions
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import all the functions from app.py
from app import (
    app,
    _parse_coordinates,
    _load_brand_file,
    _load_district_stats,
    _normalize_key,
    _extract_brand_name_from_filename,
    _filename_to_brand_key,
    BRAND_COLORS,
    _scan_finalized_data_folder,
    load_data
)

# This is the handler for Vercel serverless functions
def handler(request):
    return app(request.environ, lambda status, headers: None)

# For Vercel, we need to export the app
# Vercel will automatically detect Flask apps
app.config['TEMPLATE_FOLDER'] = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates')
app.config['STATIC_FOLDER'] = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static')

# Export for Vercel
handler = app







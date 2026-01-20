import json

# Load both files
with open('District Data/malaysia.district.geojson', encoding='utf-8') as f:
    geom = json.load(f)
    
with open('District Data/District Statistics.geojson', encoding='utf-8') as f:
    stats = json.load(f)

print('=== GEOMETRY DISTRICTS (first 15) ===')
for i, f in enumerate(geom['features'][:15]):
    print(f'{i+1}. {f["properties"]["name"]}')

print('\n=== STATS DISTRICTS (first 15) ===')
for i, f in enumerate(stats['features'][:15]):
    print(f'{i+1}. {f["properties"]["District"]}')

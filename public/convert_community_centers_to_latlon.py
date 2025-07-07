import json
from pyproj import Transformer

# Input and output file paths
input_path = 'public/houston-texas-community-centers.geojson'
output_path = 'public/houston-texas-community-centers-latlon.geojson'

# Set up the transformer from EPSG:3857 to EPSG:4326
transformer = Transformer.from_crs('EPSG:3857', 'EPSG:4326', always_xy=True)

# Read the original GeoJSON
with open(input_path, 'r') as f:
    data = json.load(f)

# Convert coordinates for each feature
for feature in data['features']:
    coords = feature['geometry']['coordinates']
    lon, lat = transformer.transform(coords[0], coords[1])
    feature['geometry']['coordinates'] = [lon, lat]

# Update CRS to EPSG:4326
if 'crs' in data:
    data['crs']['properties']['name'] = 'urn:ogc:def:crs:EPSG::4326'

# Write the new GeoJSON
with open(output_path, 'w') as f:
    json.dump(data, f, indent=2)

print(f"Converted coordinates and saved to {output_path}") 
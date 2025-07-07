import json
from shapely.geometry import Point, mapping
from shapely.ops import transform
from pyproj import Transformer
import math

INPUT_GEOJSON = 'public/houston-texas-community-centers-latlon.geojson'
OUTPUT_GEOJSON = 'public/community_center_1mile_circles.geojson'
RADIUS_METERS = 1609  # 1 mile
NUM_POINTS = 64  # Number of points to approximate the circle

# Helper to create a circle polygon in EPSG:4326
def create_circle(lon, lat, radius_m):
    aeqd_proj = f"+proj=aeqd +lat_0={lat} +lon_0={lon} +datum=WGS84 +units=m +no_defs"
    transformer_to_aeqd = Transformer.from_crs('EPSG:4326', aeqd_proj, always_xy=True)
    transformer_to_wgs = Transformer.from_crs(aeqd_proj, 'EPSG:4326', always_xy=True)
    center_aeqd = transformer_to_aeqd.transform(lon, lat)
    circle = Point(center_aeqd).buffer(radius_m, resolution=NUM_POINTS)
    circle_wgs = transform(lambda x, y: transformer_to_wgs.transform(x, y), circle)
    return mapping(circle_wgs)

def main():
    with open(INPUT_GEOJSON, 'r') as f:
        data = json.load(f)
    features = []
    for feature in data['features']:
        props = feature['properties']
        coords = feature['geometry']['coordinates']
        lon, lat = coords[0], coords[1]
        circle_geom = create_circle(lon, lat, RADIUS_METERS)
        features.append({
            'type': 'Feature',
            'geometry': circle_geom,
            'properties': {
                'Name': props.get('Name', 'Unknown')
            }
        })
    geojson_out = {
        'type': 'FeatureCollection',
        'features': features
    }
    with open(OUTPUT_GEOJSON, 'w') as f:
        json.dump(geojson_out, f, indent=2)

if __name__ == '__main__':
    main() 
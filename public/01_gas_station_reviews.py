import json
import requests
import time
from datetime import datetime
import csv
import os

# Try to import from config file first, then fall back to environment variable
try:
    from config import GOOGLE_API_KEY
except ImportError:
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')

if not GOOGLE_API_KEY:
    raise Exception('GOOGLE_API_KEY not found in config.py or environment variable')

NEARBY_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json'
DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json'
RADIUS_METERS = 1609  # 1 mile
INPUT_GEOJSON = 'public/houston-texas-community-centers-latlon.geojson'
CSV_OUTPUT = 'public/02_gas_station_reviews_Jan_June.csv'
GEOJSON_OUTPUT = 'public/02_gas_station_reviews_Jan_June.geojson'

DATE_START = datetime(2024, 1, 1)
DATE_END = datetime(2024, 6, 30, 23, 59, 59)

def haversine(lon1, lat1, lon2, lat2):
    from math import radians, cos, sin, asin, sqrt
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371000  # Radius of earth in meters
    return c * r

def get_gas_stations(lat, lon):
    params = {
        'location': f'{lat},{lon}',
        'radius': RADIUS_METERS,
        'type': 'gas_station',
        'key': GOOGLE_API_KEY
    }
    results = []
    next_page_token = None
    while True:
        if next_page_token:
            params['pagetoken'] = next_page_token
            time.sleep(2)
        resp = requests.get(NEARBY_URL, params=params)
        data = resp.json()
        if data.get('status') != 'OK':
            break
        results.extend(data.get('results', []))
        next_page_token = data.get('next_page_token')
        if not next_page_token:
            break
    return results

def get_reviews(place_id):
    params = {
        'place_id': place_id,
        'fields': 'name,reviews,formatted_address,geometry',
        'key': GOOGLE_API_KEY
    }
    resp = requests.get(DETAILS_URL, params=params)
    data = resp.json()
    result = data.get('result', {})
    return result.get('name'), result.get('formatted_address'), result.get('geometry', {}), result.get('reviews', [])

def main():
    with open(INPUT_GEOJSON, 'r') as f:
        geojson = json.load(f)
    features = geojson['features']
    station_map = {}
    for feature in features:
        center_name = feature['properties'].get('Name', 'Unknown')
        coords = feature['geometry']['coordinates']
        lon, lat = coords[0], coords[1]
        print(f'Processing {center_name}...')
        try:
            stations = get_gas_stations(lat, lon)
        except Exception as e:
            print(f'Error fetching stations for {center_name}: {e}')
            continue
        for station in stations:
            place_id = station.get('place_id')
            if not place_id:
                continue
            location = station.get('geometry', {}).get('location', {})
            lat2 = location.get('lat')
            lon2 = location.get('lng')
            if not (lat2 and lon2):
                continue
            distance = haversine(lon, lat, lon2, lat2)
            if distance > RADIUS_METERS:
                continue
            if place_id not in station_map:
                station_map[place_id] = {
                    'place_id': place_id,
                    'lat': lat2,
                    'lon': lon2,
                    'nearby_centers': set(),
                }
            station_map[place_id]['nearby_centers'].add(center_name)
    # Now fetch reviews and output
    csv_rows = []
    geojson_features = []
    for place_id, info in station_map.items():
        try:
            name, address, geometry, reviews = get_reviews(place_id)
        except Exception as e:
            print(f'Error fetching reviews for {place_id}: {e}')
            name = ''
            address = ''
            reviews = []
        period_reviews = [r for r in reviews if DATE_START <= datetime.fromtimestamp(r['time']) <= DATE_END]
        review_texts = ' | '.join([r.get('text', '') for r in period_reviews])
        csv_rows.append([
            place_id,
            name,
            address,
            len(period_reviews),
            review_texts,
            '; '.join(info['nearby_centers']),
            info['lat'],
            info['lon']
        ])
        geojson_features.append({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [info['lon'], info['lat']]
            },
            'properties': {
                'place_id': place_id,
                'name': name,
                'address': address,
                'review_count': len(period_reviews),
                'review_texts': review_texts,
                'nearby_centers': list(info['nearby_centers'])
            }
        })
        print(f"{place_id}: {name} - Jan-Jun reviews: {len(period_reviews)}")
        time.sleep(0.1)
    # Write CSV
    with open(CSV_OUTPUT, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['place_id', 'name', 'address', 'review_count', 'review_texts', 'nearby_centers', 'lat', 'lon'])
        writer.writerows(csv_rows)
    # Write GeoJSON
    with open(GEOJSON_OUTPUT, 'w', encoding='utf-8') as f:
        json.dump({'type': 'FeatureCollection', 'features': geojson_features}, f, indent=2)
    print(f"Done! {len(csv_rows)} rows written to {CSV_OUTPUT} and {len(geojson_features)} features to {GEOJSON_OUTPUT}.")

if __name__ == '__main__':
    main() 
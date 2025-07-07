import json
import requests
import os
import time
from datetime import datetime
from math import radians, cos, sin, asin, sqrt

API_KEY = os.getenv('GOOGLE_API_KEY')
NEARBY_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json'
DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json'
RADIUS_METERS = 1609  # 1 mile
INPUT_GEOJSON = 'public/houston-texas-community-centers-latlon.geojson'
RED_OUTPUT = 'public/gas_stations_1mile_july_reviews.geojson'
BLUE_OUTPUT = 'public/gas_stations_1mile_no_july_reviews.geojson'
DATE_START = datetime(2024, 7, 6)
DATE_END = datetime(2024, 7, 30, 23, 59, 59)

if not API_KEY:
    raise Exception('GOOGLE_API_KEY environment variable not set.')

def haversine(lon1, lat1, lon2, lat2):
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
        'key': API_KEY
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
        'key': API_KEY
    }
    resp = requests.get(DETAILS_URL, params=params)
    data = resp.json()
    result = data.get('result', {})
    return result.get('name'), result.get('formatted_address'), result.get('geometry', {}), result.get('reviews', [])

def review_in_date_range(review):
    dt = datetime.fromtimestamp(review['time'])
    return DATE_START <= dt <= DATE_END

def main():
    with open(INPUT_GEOJSON, 'r') as f:
        geojson = json.load(f)
    features = geojson['features']
    # Use place_id as unique key, but track all nearby centers
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
            # Get location from API result
            location = station.get('geometry', {}).get('location', {})
            lat2 = location.get('lat')
            lon2 = location.get('lng')
            if not (lat2 and lon2):
                continue
            distance = haversine(lon, lat, lon2, lat2)
            if distance > RADIUS_METERS:
                continue
            # If we've already seen this place_id, just add this center to its list
            if place_id in station_map:
                station_map[place_id]['properties']['nearby_centers'].add(center_name)
                continue
            # Otherwise, fetch reviews
            try:
                name, address, details_geometry, reviews = get_reviews(place_id)
            except Exception as e:
                print(f'Error fetching reviews for {place_id}: {e}')
                continue
            july_reviews = [r for r in reviews if review_in_date_range(r)]
            station_map[place_id] = {
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [lon2, lat2]
                },
                'properties': {
                    'name': name,
                    'address': address,
                    'place_id': place_id,
                    'distance_meters': distance,
                    'july_reviews': [
                        {
                            'author_name': r.get('author_name'),
                            'rating': r.get('rating'),
                            'text': r.get('text'),
                            'date': datetime.fromtimestamp(r['time']).strftime('%Y-%m-%d')
                        } for r in july_reviews
                    ],
                    'nearby_centers': set([center_name])
                }
            }
            print(f"  Added: {name} ({address}) with {len(july_reviews)} July reviews, distance: {distance:.1f}m.")
            time.sleep(0.1)
    # Now split into red and blue
    red_features = []
    blue_features = []
    for feat in station_map.values():
        feat['properties']['nearby_centers'] = list(feat['properties']['nearby_centers'])
        if feat['properties']['july_reviews']:
            red_features.append(feat)
        else:
            blue_features.append(feat)
    with open(RED_OUTPUT, 'w', encoding='utf-8') as f:
        json.dump({'type': 'FeatureCollection', 'features': red_features}, f, indent=2)
    with open(BLUE_OUTPUT, 'w', encoding='utf-8') as f:
        json.dump({'type': 'FeatureCollection', 'features': blue_features}, f, indent=2)
    print(f"Done! {len(red_features)} red (reviewed) and {len(blue_features)} blue (not reviewed) gas stations saved.")

if __name__ == '__main__':
    main() 
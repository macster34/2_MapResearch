import csv
import json
import math

DEBRIS_KEYWORDS = [
    'debris', 'tree down', 'tree fallen', 'tree debris', 'tree limb', 'tree branch', 'branches', 'limbs',
    'fallen tree', 'fallen branch', 'fallen limb', 'brush', 'yard waste', 'storm debris', 'natural debris', 'uprooted',
    'obstruction', 'blockage', 'street blocked', 'road blocked', 'pile'
]
# Exclusion keywords for building/infrastructure debris
EXCLUDE_KEYWORDS = [
    'fence', 'sign', 'building', 'roof', 'wall', 'construction', 'material', 'garage', 'porch', 'balcony',
    'attic', 'ceiling', 'floor', 'property', 'house', 'home', 'apartment', 'structure', 'barricade', 'barricaded', 'closed for construction', 'city barricade'
]
MAINTENANCE_KEYWORDS = [
    'missed garbage', 'missed recycling', 'missed heavy trash', 'container replacement',
    'routine service', 'garbage pickup', 'recycling pickup', 'trash pickup',
    'waste collection', 'cart replacement', 'bin replacement', 'heavy trash'
]
BUILDING_DAMAGE_KEYWORDS = [
    'building damage', 'roof damage', 'collapsed', 'wall down', 'ceiling collapse',
    'window broken', 'door broken', 'fire damage', 'major damage', 'structural',
    'foundation', 'crack in wall', 'crack in ceiling', 'crack in foundation',
    'partial collapse', 'total collapse', 'chimney damage', 'garage damage',
    'balcony damage', 'porch damage', 'interior damage', 'exterior damage',
    'floor damage', 'attic damage', 'water damage to building', 'damaged house',
    'damaged home', 'damaged apartment', 'damaged structure', 'damaged property'
]
START_DATE = '2024-07-08'
END_DATE = '2024-07-30'

def contains_keyword(text, keywords):
    text = text.lower() if text else ''
    return any(k in text for k in keywords)

def main():
    with open('public/311_july_Beryl_Filter.geojson', 'r') as f:
        data = json.load(f)
    filtered = []
    # Load power outage request_ids to exclude from debris
    power_outage_ids = set()
    try:
        with open('public/311_power_outages_Beryl_refined.csv', 'r') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                power_outage_ids.add(str(row['request_id']))
    except Exception as e:
        print(f"Could not read power outage CSV for exclusions: {e}")
    # Read building damage CSV to get all request_ids that should be excluded from debris
    building_damage_ids = set()
    try:
        with open('building_damage_calls_2024-07-08_to_2024-07-30.csv', 'r') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                building_damage_ids.add(row['request_id'])
    except Exception as e:
        print(f"Could not read building damage CSV for exclusions: {e}")
    # Explicitly include these request_ids (tree debris misclassified)
    INCLUDE_REQUEST_IDS = {'2400280615', '2400280557'}
    # Explicitly remove this duplicate request_id
    REMOVE_DUPLICATE_ID = '2400280615'
    # --- Add logic to also include all tree-related reports removed from infrastructure ---
    # Read infrastructure CSV to get all request_ids that were excluded due to tree-related keywords
    infra_excluded_tree_ids = set()
    try:
        with open('public/infrastructure_damage_calls_2024-07-08_to_2024-07-30.csv', 'r') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                # If the report was excluded from infrastructure due to tree-related keywords, add to debris
                title = row['title'].lower() if row['title'] else ''
                desc = row['description'].lower() if row['description'] else ''
                if 'tree' in title or 'tree' in desc or contains_keyword(title, DEBRIS_KEYWORDS) or contains_keyword(desc, DEBRIS_KEYWORDS):
                    infra_excluded_tree_ids.add(row['request_id'])
    except Exception as e:
        print(f"Could not read infrastructure CSV for tree-related exclusions: {e}")

    for feat in data['features']:
        props = feat.get('properties', {})
        title = str(props.get('title', '')).lower()
        desc = str(props.get('description', '')).lower()
        date = str(props.get('created_date', ''))[:10]
        dist = props.get('distance_meters', None)
        rid = str(props.get('request_id', ''))
        if rid == REMOVE_DUPLICATE_ID:
            continue
        if not (START_DATE <= date <= END_DATE):
            continue
        if dist is None or dist > 1609.34:
            continue
        # Exclude maintenance and true building damage
        if contains_keyword(title, MAINTENANCE_KEYWORDS) or contains_keyword(desc, MAINTENANCE_KEYWORDS):
            continue
        if rid in building_damage_ids and rid not in INCLUDE_REQUEST_IDS:
            continue
        # Exclude if in power outage list
        if rid in power_outage_ids:
            continue
        # Must have debris keyword (even if also infrastructure), or be a tree-related report excluded from infrastructure, or be in INCLUDE_REQUEST_IDS
        if not (contains_keyword(title, DEBRIS_KEYWORDS) or contains_keyword(desc, DEBRIS_KEYWORDS) or rid in infra_excluded_tree_ids or rid in INCLUDE_REQUEST_IDS):
            continue
        # Exclude if any exclusion keyword is present
        if contains_keyword(title, EXCLUDE_KEYWORDS) or contains_keyword(desc, EXCLUDE_KEYWORDS):
            continue
        filtered.append({
            'request_id': props.get('request_id', ''),
            'title': props.get('title', ''),
            'description': props.get('description', ''),
            'created_date': props.get('created_date', ''),
            'nearby_center': props.get('nearby_center', ''),
            'distance_meters': dist
        })
    print(f"Debris calls (within 1 mile, {START_DATE} to {END_DATE}): {len(filtered)}")
    # Print a sample for context review
    for i, row in enumerate(filtered[:10]):
        print(f"\nSample {i+1}:")
        print(f"Title: {row['title']}")
        print(f"Description: {row['description']}")
        print(f"Date: {row['created_date']}")
        print(f"Nearby Center: {row['nearby_center']}")
        print(f"Distance (m): {row['distance_meters']}")
    # Write to CSV
    out_csv = f"public/debris_calls_{START_DATE}_to_{END_DATE}.csv"
    with open(out_csv, 'w', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=['request_id', 'title', 'description', 'created_date', 'nearby_center', 'distance_meters'])
        writer.writeheader()
        writer.writerows(filtered)
    print(f"Saved to {out_csv}")

    # Write to GeoJSON
    out_geojson = f"public/debris_calls_{START_DATE}_to_{END_DATE}.geojson"
    geojson_features = []
    seen_ids = set()
    for row in filtered:
        rid = str(row['request_id'])
        if rid in seen_ids:
            continue
        for feat in data['features']:
            props = feat.get('properties', {})
            lat = feat.get('geometry', {}).get('coordinates', [None, None])[1]
            lon = feat.get('geometry', {}).get('coordinates', [None, None])[0]
            # Clean NaN in coordinates
            if lat is not None and (isinstance(lat, float) and math.isnan(lat)):
                lat = None
            if lon is not None and (isinstance(lon, float) and math.isnan(lon)):
                lon = None
            # Clean NaN in properties
            clean_props = {}
            for k, v in props.items():
                if isinstance(v, float) and math.isnan(v):
                    clean_props[k] = None
                else:
                    clean_props[k] = v
            if str(props.get('request_id', '')) == rid and lat is not None and lon is not None:
                geojson_features.append({
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [lon, lat]
                    },
                    "properties": clean_props
                })
                seen_ids.add(rid)
                break
    geojson = {
        "type": "FeatureCollection",
        "features": geojson_features
    }
    with open(out_geojson, 'w') as f:
        json.dump(geojson, f, indent=2, allow_nan=False)
    print(f"Saved to {out_geojson} ({len(geojson_features)} features with lat/lon)")

if __name__ == '__main__':
    main() 
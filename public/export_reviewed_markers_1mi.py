import json
import csv

INPUT_GEOJSON = 'public/gas_stations_1mile_july_reviews.geojson'
OUTPUT_CSV = 'public/UPDATE_reviewed_markers_1mi.csv'

with open(INPUT_GEOJSON, 'r') as f:
    data = json.load(f)

with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(['community_centers', 'gas_station_name', 'place_id', 'review_quote'])
    for feature in data['features']:
        props = feature['properties']
        centers = '; '.join(props.get('nearby_centers', []))
        name = props.get('name', '')
        place_id = props.get('place_id', '')
        reviews = props.get('july_reviews', [])
        if isinstance(reviews, str):
            try:
                reviews = json.loads(reviews)
            except Exception:
                reviews = []
        if reviews:
            for review in reviews:
                quote = review.get('text', '')
                writer.writerow([centers, name, place_id, quote])
        else:
            writer.writerow([centers, name, place_id, ''])
print(f"Exported reviewed markers to {OUTPUT_CSV}") 
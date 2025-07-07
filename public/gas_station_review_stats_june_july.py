import json
import csv
from datetime import datetime

JUNE_START = datetime(2024, 6, 1)
JUNE_END = datetime(2024, 6, 30, 23, 59, 59)
JULY_START = datetime(2024, 7, 6)
JULY_END = datetime(2024, 7, 30, 23, 59, 59)

JUNE_REVIEWS_CSV = 'public/gas_station_reviews_june5_july1_2024.csv'  # Should contain reviews for June
JULY_REVIEWS_GEOJSON = 'public/gas_stations_1mile_july_reviews.geojson'  # Already filtered for July 6-30
OUTPUT_CSV = 'public/gas_station_review_stats_june_july.csv'

# Load June reviews
june_place_ids = set()
june_reviews = {}
with open(JUNE_REVIEWS_CSV, newline='', encoding='utf-8') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        date_str = row.get('date')
        place_id = row.get('place_id')
        if not date_str or not place_id:
            continue
        try:
            dt = datetime.strptime(date_str, '%Y-%m-%d')
        except Exception:
            continue
        if JUNE_START <= dt <= JUNE_END:
            june_place_ids.add(place_id)
            june_reviews.setdefault(place_id, []).append(row)

# Load July reviews (already filtered for July 6-30)
july_place_ids = set()
july_reviews = {}
with open(JULY_REVIEWS_GEOJSON, 'r') as f:
    data = json.load(f)
    for feature in data['features']:
        props = feature['properties']
        place_id = props.get('place_id')
        reviews = props.get('july_reviews', [])
        if isinstance(reviews, str):
            try:
                reviews = json.loads(reviews)
            except Exception:
                reviews = []
        if reviews:
            july_place_ids.add(place_id)
            july_reviews[place_id] = reviews

# Output stats
print(f"Gas stations with reviews in June 2024: {len(june_place_ids)}")
print(f"Gas stations with reviews in July 6-30, 2024: {len(july_place_ids)}")

# Output CSV comparing both months
gas_station_ids = june_place_ids | july_place_ids
with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(['place_id', 'reviewed_in_june', 'reviewed_in_july', 'june_review_count', 'july_review_count'])
    for pid in gas_station_ids:
        reviewed_in_june = pid in june_place_ids
        reviewed_in_july = pid in july_place_ids
        june_count = len(june_reviews.get(pid, []))
        july_count = len(july_reviews.get(pid, []))
        writer.writerow([pid, reviewed_in_june, reviewed_in_july, june_count, july_count])
print(f"Stats written to {OUTPUT_CSV}") 
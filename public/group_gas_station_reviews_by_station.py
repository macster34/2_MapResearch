import csv
from collections import defaultdict

INPUT_CSV = 'public/gas_station_reviews_july1_july30_2024.csv'
OUTPUT_CSV = 'public/simplified_reviews_and_comms.csv'

gas_station_map = defaultdict(lambda: {
    'community_centers': set(),
    'reviews': defaultdict(lambda: {'community_centers': set()})
})

with open(INPUT_CSV, newline='', encoding='utf-8') as infile:
    reader = csv.DictReader(infile)
    for row in reader:
        key = (row['gas_station_name'], row['gas_station_address'])
        review_key = (
            row['review_text'],
            row['review_date'],
            row['reviewer_name'],
            row['rating']
        )
        gas_station_map[key]['community_centers'].add(row['community_center'])
        gas_station_map[key]['reviews'][review_key]['community_centers'].add(row['community_center'])
        gas_station_map[key]['reviews'][review_key].update({
            'review_date': row['review_date'],
            'review_text': row['review_text'],
            'reviewer_name': row['reviewer_name'],
            'rating': row['rating']
        })

with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as outfile:
    fieldnames = ['gas_station_name', 'gas_station_address', 'community_centers', 'review_date', 'review_text', 'reviewer_name', 'rating']
    writer = csv.DictWriter(outfile, fieldnames=fieldnames)
    writer.writeheader()
    for (name, address), data in gas_station_map.items():
        centers = '; '.join(sorted(data['community_centers']))
        for review_data in data['reviews'].values():
            writer.writerow({
                'gas_station_name': name,
                'gas_station_address': address,
                'community_centers': '; '.join(sorted(review_data['community_centers'])),
                'review_date': review_data['review_date'],
                'review_text': review_data['review_text'],
                'reviewer_name': review_data['reviewer_name'],
                'rating': review_data['rating']
            }) 
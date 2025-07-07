import pandas as pd
import json
import os
from datetime import datetime
import time
from math import radians, cos, sin, asin, sqrt

def haversine(lon1, lat1, lon2, lat2):
    """Calculate distance between two points in meters"""
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371000  # Radius of earth in meters
    return c * r

def load_community_centers():
    """Load community centers from GeoJSON"""
    try:
        with open('public/houston-texas-community-centers-latlon.geojson', 'r') as f:
            geojson = json.load(f)
        centers = []
        for feature in geojson['features']:
            coords = feature['geometry']['coordinates']
            centers.append({
                'name': feature['properties'].get('Name', 'Unknown'),
                'lon': coords[0],
                'lat': coords[1]
            })
        return centers
    except FileNotFoundError:
        print("Community centers GeoJSON not found. Please ensure the file exists.")
        return []

def filter_power_outage_requests(df):
    """Filter for power outage, storm, and related requests"""
    # Expanded keywords
    keywords = [
        'power', 'electricity', 'outage', 'blackout', 'no power', 'power off',
        'electrical', 'transformer', 'power line', 'utility', 'centerpoint', 'energy', 'electrical service', 'power outage',
        'storm', 'rain', 'flood', 'debris', 'tree', 'wind', 'downed', 'branch', 'weather', 'hurricane', 'tornado', 'lightning', 'storm damage', 'flooding', 'blocked', 'obstruction'
    ]
    
    title_filter = pd.Series([False] * len(df))
    desc_filter = pd.Series([False] * len(df))
    
    if 'Title' in df.columns:
        title_filter = df['Title'].str.contains('|'.join(keywords), case=False, na=False)
    if 'Description' in df.columns:
        desc_filter = df['Description'].str.contains('|'.join(keywords), case=False, na=False)
    
    return df[title_filter | desc_filter]

def filter_date_range(df, month=None, year=2024):
    """Filter for a specific month (or all if month=None)"""
    if 'Created Date Local' not in df.columns:
        print("Warning: 'Created Date Local' column not found. Cannot filter by date.")
        return df
    try:
        df['date_parsed'] = pd.to_datetime(df['Created Date Local'], errors='coerce')
        if month:
            start_date = datetime(year, month, 1)
            if month == 12:
                end_date = datetime(year + 1, 1, 1) - pd.Timedelta(seconds=1)
            else:
                end_date = datetime(year, month + 1, 1) - pd.Timedelta(seconds=1)
        else:
            # All three months: June, July, August
            start_date = datetime(year, 6, 1)
            end_date = datetime(year, 9, 1) - pd.Timedelta(seconds=1)
        date_filter = (df['date_parsed'] >= start_date) & (df['date_parsed'] <= end_date)
        filtered_df = df[date_filter].copy()
        filtered_df = filtered_df.drop('date_parsed', axis=1)
        return filtered_df
    except Exception as e:
        print(f"Error filtering by date: {e}")
        return df

def process_311_file(file_path, chunk_size=10000):
    """Process 311 data file in chunks to avoid memory issues"""
    print(f"Processing 311 data file: {file_path}")
    
    # Load community centers
    centers = load_community_centers()
    if not centers:
        print("No community centers found. Cannot filter by distance.")
        return
    
    # Determine file format and delimiter
    if file_path.endswith('.csv'):
        delimiter = ','
    elif file_path.endswith('.txt'):
        # For Houston 311 data, it's pipe-delimited
        delimiter = '|'
    else:
        print("Unsupported file format. Please use .csv or .txt files.")
        return
    
    print(f"Using delimiter: '{delimiter}'")
    
    # Prepare output containers for each month and all months
    results = {
        'June': [],
        'July': [],
        'August': [],
        'JJA': []
    }
    
    try:
        # Skip header lines (first 5 lines are metadata, header is on line 6)
        skip_rows = 5
        
        for chunk in pd.read_csv(file_path, delimiter=delimiter, chunksize=chunk_size, 
                                skiprows=skip_rows, low_memory=False, on_bad_lines='skip'):
            # For each month and all three months
            for label, month in [('June', 6), ('July', 7), ('August', 8), ('JJA', None)]:
                date_filtered = filter_date_range(chunk, month=month)
                if len(date_filtered) == 0:
                    continue
                power_requests = filter_power_outage_requests(date_filtered)
                if len(power_requests) == 0:
                    continue
                for _, request in power_requests.iterrows():
                    lat = None
                    lon = None
                    try:
                        if 'Latitude' in request.index and pd.notna(request['Latitude']):
                            lat = float(request['Latitude'])
                        if 'Longitude' in request.index and pd.notna(request['Longitude']):
                            lon = float(request['Longitude'])
                    except (ValueError, TypeError):
                        continue
                    if lat is not None and lon is not None:
                        for center in centers:
                            distance = haversine(center['lon'], center['lat'], lon, lat)
                            if distance <= 1609:  # 1 mile in meters
                                results[label].append({
                                    'request_id': request.get('365 Case Number', 'Unknown'),
                                    'title': request.get('Title', 'Unknown'),
                                    'description': request.get('Description', 'Unknown'),
                                    'created_date': request.get('Created Date Local', 'Unknown'),
                                    'status': request.get('Status', 'Unknown'),
                                    'lat': lat,
                                    'lon': lon,
                                    'distance_meters': distance,
                                    'nearby_center': center['name']
                                })
                                break  # Only count once per request
        
        # Write CSV and GeoJSON for each (after processing all chunks)
        for label in results:
            if results[label]:
                df = pd.DataFrame(results[label])
                csv_out = f"public/311_{label}.csv"
                geojson_out = f"public/311_{label}.geojson"
                df.to_csv(csv_out, index=False)
                features = [
                    {
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [row['lon'], row['lat']]
                        },
                        "properties": {
                            k: row[k] for k in row.index if k not in ['lat', 'lon']
                        }
                    }
                    for _, row in df.iterrows()
                ]
                with open(geojson_out, 'w') as f:
                    json.dump({"type": "FeatureCollection", "features": features}, f, indent=2)
                print(f"Saved {csv_out} and {geojson_out} ({len(df)} requests)")
    
    except Exception as e:
        print(f"Error processing file: {e}")
        return
    
    print("\nProcessing complete!")

def main():
    """Main function to process 311 data"""
    print("311 Data Processor for Power Outage Analysis (May-September 2024)")
    print("=" * 60)
    
    # Look for 311 data files
    possible_files = []
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.lower().endswith(('.csv', '.txt')) and '311' in file.lower():
                possible_files.append(os.path.join(root, file))
    
    if not possible_files:
        print("No 311 data files found. Please place your 311 data file in the project directory.")
        print("Expected file names: *311*.csv or *311*.txt")
        return
    
    print("Found 311 data files:")
    for i, file in enumerate(possible_files, 1):
        print(f"  {i}. {file}")
    
    if len(possible_files) == 1:
        selected_file = possible_files[0]
    else:
        try:
            choice = int(input(f"\nSelect file to process (1-{len(possible_files)}): ")) - 1
            selected_file = possible_files[choice]
        except (ValueError, IndexError):
            print("Invalid selection. Using first file.")
            selected_file = possible_files[0]
    
    print(f"\nProcessing: {selected_file}")
    
    # Process the file
    process_311_file(selected_file)

if __name__ == '__main__':
    main() 
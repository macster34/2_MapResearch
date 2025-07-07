#!/usr/bin/env python3
"""
Refined 311 Power Outage Analysis for Hurricane Beryl (July 8-30, 2024)
This script filters for ACTUAL power outages only, excluding traffic lights, storm debris, etc.
"""

import pandas as pd
import json
from datetime import datetime
import math
import os

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points using Haversine formula"""
    R = 6371000  # Earth's radius in meters
    
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

def load_community_centers():
    """Load community center data"""
    try:
        with open('community_centers.geojson', 'r') as f:
            data = json.load(f)
        
        centers = []
        for feature in data['features']:
            coords = feature['geometry']['coordinates']
            props = feature['properties']
            centers.append({
                'name': props.get('name', 'Unknown'),
                'lat': coords[1],
                'lon': coords[0]
            })
        return centers
    except FileNotFoundError:
        print("Warning: community_centers.geojson not found. Distance calculations will be skipped.")
        return []

def is_actual_power_outage(title, description):
    """
    Refined filter to identify ACTUAL power outages only.
    Excludes storm debris, garbage, and other unrelated calls, but includes traffic lights and street lights.
    """
    # Convert to lowercase for case-insensitive matching
    title_lower = title.lower()
    desc_lower = description.lower()
    
    # Keywords that indicate ACTUAL power outages
    power_outage_keywords = [
        'power out', 'electricity out', 'no power', 'lost power', 'power outage',
        'electrical outage', 'power failure', 'electricity failure', 'power down',
        'electricity down', 'power off', 'electricity off', 'power cut',
        'electricity cut', 'power loss', 'electricity loss'
    ]
    
    # Keywords that indicate power line issues (actual outages)
    power_line_keywords = [
        'power line down', 'power line hanging', 'power line broken',
        'power line damaged', 'power line fallen', 'power line on ground',
        'electrical line down', 'electrical line hanging', 'electrical line broken',
        'electrical line damaged', 'electrical line fallen', 'electrical line on ground'
    ]
    
    # Keywords that indicate utility/power company issues
    utility_keywords = [
        'centerpoint', 'center point', 'electric company', 'power company',
        'utility company', 'electrical company'
    ]
    
    # Keywords that indicate Beryl-related power issues
    beryl_power_keywords = [
        'beryl power', 'hurricane beryl power', 'beryl electricity',
        'hurricane beryl electricity', 'beryl outage', 'hurricane beryl outage'
    ]
    
    # Keywords for traffic lights and street lights (keeping these)
    traffic_street_light_keywords = [
        'traffic light', 'traffic signal', 'street light', 'street lamp',
        'lights out', 'light out', 'lights not working', 'light not working',
        'flashing red', 'flashing lights', 'traffic lights out', 'traffic light out'
    ]
    
    # Check for actual power outage indicators
    for keyword in power_outage_keywords + power_line_keywords + utility_keywords + beryl_power_keywords + traffic_street_light_keywords:
        if keyword in title_lower or keyword in desc_lower:
            return True
    
    # Additional context checks for power-related issues
    if any(word in title_lower or word in desc_lower for word in ['outage', 'out', 'down', 'off', 'cut', 'loss']):
        # But exclude storm debris, garbage, and other non-power issues
        exclude_keywords = [
            'storm debris', 'tree debris', 'garbage', 'trash', 'recycling',
            'water', 'sewer', 'drainage', 'flooding', 'parking', 'graffiti',
            'building code', 'nuisance', 'occupancy', 'health code',
            'missed garbage', 'missed trash', 'missed recycling', 'missed heavy trash',
            'container replacement', 'bandit sign', 'fire hydrant'
        ]
        
        # If it contains exclusion keywords, it's not a power outage
        for exclude in exclude_keywords:
            if exclude in title_lower or exclude in desc_lower:
                return False
        
        # If it passed the exclusion check and contains power-related words, it might be a power outage
        power_indicators = ['power', 'electric', 'electrical', 'electricity', 'utility', 'light']
        if any(indicator in title_lower or indicator in desc_lower for indicator in power_indicators):
            return True
    
    return False

def process_311_data(input_file, output_prefix):
    """Process 311 data with refined power outage filtering"""
    print(f"Processing {input_file}...")
    
    # Load community centers
    centers = load_community_centers()
    
    # Define date range for Beryl (July 8-30, 2024)
    start_date = datetime(2024, 7, 8)
    end_date = datetime(2024, 7, 30, 23, 59, 59)
    
    # Process in chunks to handle large files
    chunk_size = 10000
    all_power_outages = []
    
    # The header row has line breaks, so we need to handle it manually
    column_names = [
        '365 Case Number', 'Case Number', 'Incident Address', 'Latitude', 'Longitude', 
        'Status', 'Created Date Local', 'Closed Date', 'Title', 'Incident Case Type',
        'SLA Time', 'Resolve By Time', 'Service Area', 'Council District', 'Key Map',
        'Department', 'Division', 'AVA Case Type', 'State Code', 'State Code Name',
        'SLA Start Time', 'X', 'Y', 'Incident Street', 'Incident City', 'Incident State',
        'Zip Code', 'TaxID', 'Created Date UTC', 'Customer SuperNeighborhood',
        'Management District', 'Garbage Route', 'Garbage Day', 'SWM Quadrant',
        'Recycling Route', 'Recycling Day', 'Recycling Quadrant', 'Recycling Areas',
        'Heavy Trash Day', 'Heavy Trash Quadrant', 'Queue', 'ETJ', 'SLA Name',
        'Channel', 'Extract Date', 'Latest Case Notes', 'Sample Case Confilcts Notes',
        'Description', 'Resolution Notes'
    ]
    for chunk_num, chunk in enumerate(pd.read_csv(input_file, delimiter='|', chunksize=chunk_size, low_memory=False, skiprows=6, header=None, on_bad_lines='skip')):
        print(f"Processing chunk {chunk_num + 1}...")
        chunk.columns = column_names
        
        # Convert date column (using 'Created Date Local' column)
        chunk['Created Date Local'] = pd.to_datetime(chunk['Created Date Local'], errors='coerce')
        
        # Filter by date range
        date_filter = (chunk['Created Date Local'] >= start_date) & (chunk['Created Date Local'] <= end_date)
        chunk = chunk[date_filter]
        
        if chunk.empty:
            continue
        
        # Apply refined power outage filter
        power_outage_filter = chunk.apply(
            lambda row: is_actual_power_outage(str(row['Title']), str(row['Description'])), 
            axis=1
        )
        
        power_outages = chunk[power_outage_filter].copy()
        
        if not power_outages.empty:
            # Calculate distances to community centers
            for idx, row in power_outages.iterrows():
                min_distance = float('inf')
                nearest_center = None
                
                for center in centers:
                    try:
                        distance = haversine_distance(
                            float(row['Latitude']), float(row['Longitude']),
                            center['lat'], center['lon']
                        )
                        if distance < min_distance:
                            min_distance = distance
                            nearest_center = center['name']
                    except (ValueError, TypeError):
                        continue
                
                power_outages.at[idx, 'distance_meters'] = min_distance if min_distance != float('inf') else None
                power_outages.at[idx, 'nearby_center'] = nearest_center
            
            all_power_outages.append(power_outages)
    
    if not all_power_outages:
        print("No power outages found in the specified date range.")
        return
    
    # Combine all results
    final_df = pd.concat(all_power_outages, ignore_index=True)
    
    # Sort by date
    final_df = final_df.sort_values('Created Date Local', ascending=False)
    
    # Select and rename columns for output
    output_columns = {
        '365 Case Number': 'request_id',
        'Title': 'title', 
        'Description': 'description',
        'Created Date Local': 'created_date',
        'Status': 'status',
        'Latitude': 'lat',
        'Longitude': 'lon',
        'distance_meters': 'distance_meters',
        'nearby_center': 'nearby_center'
    }
    
    final_df = final_df[list(output_columns.keys())].rename(columns=output_columns)
    
    # Save to CSV
    csv_filename = f"{output_prefix}.csv"
    final_df.to_csv(csv_filename, index=False)
    print(f"Saved {len(final_df)} power outages to {csv_filename}")
    
    # Create GeoJSON
    geojson_data = {
        "type": "FeatureCollection",
        "features": []
    }
    
    for _, row in final_df.iterrows():
        try:
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(row['lon']), float(row['lat'])]
                },
                "properties": {
                    "request_id": row['request_id'],
                    "title": row['title'],
                    "description": row['description'],
                    "created_date": str(row['created_date']),
                    "status": row['status'],
                    "distance_meters": row['distance_meters'],
                    "nearby_center": row['nearby_center']
                }
            }
            geojson_data["features"].append(feature)
        except (ValueError, TypeError):
            continue
    
    geojson_filename = f"{output_prefix}.geojson"
    with open(geojson_filename, 'w') as f:
        json.dump(geojson_data, f, indent=2)
    print(f"Saved GeoJSON to {geojson_filename}")
    
    # Print summary statistics
    print(f"\nSummary:")
    print(f"Total power outages found: {len(final_df)}")
    print(f"Date range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
    
    if not final_df.empty:
        print(f"Earliest outage: {final_df['created_date'].min()}")
        print(f"Latest outage: {final_df['created_date'].max()}")
        
        # Count by status
        print(f"\nStatus breakdown:")
        status_counts = final_df['status'].value_counts()
        for status, count in status_counts.items():
            print(f"  {status}: {count}")

def main():
    """Main function"""
    input_file = input("Enter the path to your 311 data file (e.g., public/311.txt): ").strip()
    
    if not os.path.exists(input_file):
        print(f"Error: File {input_file} not found.")
        return
    
    # Generate refined power outage analysis
    output_prefix = "public/311_power_outages_Beryl_refined"
    process_311_data(input_file, output_prefix)

if __name__ == "__main__":
    main() 
import overpy
import json
import time
import os
from math import ceil

def download_houston_buildings():
    api = overpy.Overpass(url='https://overpass.kumi.systems/api/interpreter')
    
    # Houston coordinates split into smaller chunks
    lat_min, lon_min = 29.4, -95.8
    lat_max, lon_max = 30.1, -95.1
    
    # Split area into 4x4 grid
    lat_step = (lat_max - lat_min) / 4
    lon_step = (lon_max - lon_min) / 4
    
    features = []
    total_ways = 0
    
    print("Downloading building data from OpenStreetMap in chunks...")
    
    for i in range(4):
        for j in range(4):
            chunk_lat_min = lat_min + (i * lat_step)
            chunk_lat_max = lat_min + ((i + 1) * lat_step)
            chunk_lon_min = lon_min + (j * lon_step)
            chunk_lon_max = lon_min + ((j + 1) * lon_step)
            
            bbox = f"{chunk_lat_min},{chunk_lon_min},{chunk_lat_max},{chunk_lon_max}"
            
            query = f"""
            [out:json][timeout:300];
            (
              way["building"]["height"]({bbox});
              way["building"]["building:levels"]({bbox});
              way["building"]({bbox});
            );
            out body;
            >;
            out skel qt;
            """
            
            max_retries = 3
            retry_delay = 10  # seconds
            
            for attempt in range(max_retries):
                try:
                    print(f"Downloading chunk {(i*4)+j+1}/16...")
                    result = api.query(query)
                    
                    # Process buildings in this chunk
                    for way in result.ways:
                        try:
                            # Create coordinates list
                            coords = [[float(node.lon), float(node.lat)] for node in way.nodes]
                            
                            # Close the polygon by repeating the first point
                            if coords[0] != coords[-1]:
                                coords.append(coords[0])
                            
                            # Get building height
                            height = None
                            if 'height' in way.tags:
                                try:
                                    height = float(way.tags['height'])
                                except ValueError:
                                    pass
                            elif 'building:levels' in way.tags:
                                try:
                                    # Approximate height: levels * 3 meters
                                    height = float(way.tags['building:levels']) * 3
                                except ValueError:
                                    pass
                            
                            # Create GeoJSON feature
                            feature = {
                                'type': 'Feature',
                                'geometry': {
                                    'type': 'Polygon',
                                    'coordinates': [coords]
                                },
                                'properties': {
                                    'height': height,
                                    'building': way.tags.get('building', 'yes'),
                                    'osm_id': str(way.id)
                                }
                            }
                            features.append(feature)
                            
                        except Exception as e:
                            print(f"Error processing way {way.id}: {str(e)}")
                            continue
                    
                    total_ways += len(result.ways)
                    print(f"Processed {len(result.ways)} buildings in this chunk")
                    
                    # Success - break the retry loop
                    break
                    
                except overpy.exception.OverpassGatewayTimeout:
                    if attempt < max_retries - 1:
                        print(f"Timeout error, retrying in {retry_delay} seconds... (Attempt {attempt + 1}/{max_retries})")
                        time.sleep(retry_delay)
                        retry_delay *= 2  # Exponential backoff
                    else:
                        print(f"Failed to download chunk after {max_retries} attempts, skipping...")
                
                except Exception as e:
                    print(f"Error downloading chunk: {str(e)}")
                    break
                
            # Small delay between chunks to avoid overwhelming the server
            time.sleep(2)
    
    # Create GeoJSON
    geojson = {
        'type': 'FeatureCollection',
        'features': features
    }
    
    # Save to file
    output_file = 'houston_buildings.geojson'
    with open(output_file, 'w') as f:
        json.dump(geojson, f)
    
    print(f"\nDownload complete!")
    print(f"Total buildings processed: {len(features)}")
    print(f"Results saved to: {os.path.abspath(output_file)}")

if __name__ == "__main__":
    download_houston_buildings()

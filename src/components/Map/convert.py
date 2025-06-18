import json
import os
from typing import Dict, List
import math
import geopandas as gpd

def convert_to_geojson(input_file='dc_area_peering.json', output_file='../../../public/dc_peering_layers.json'):
    """Convert PeeringDB data to multiple GeoJSON layers for the map"""
    
    # Create output directory if it doesn't exist
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(input_file, 'r') as f:
        data = json.load(f)
        
    # Debug input data
    print("\nInput data contains:")
    print(f"- {len(data.get('facilities', []))} facilities")
    print(f"- {len(data.get('ixps', []))} IXPs")
    print(f"- {len(data.get('netixlan', []))} network-to-IX connections")
    
    # Debug IXP data structure
    print("\nFirst IXP structure:")
    if data.get('ixps'):
        ixp = data['ixps'][0]
        print("Keys:", list(ixp.keys()))
        print("fac_id:", ixp.get('fac_id'))
        print("facility_id:", ixp.get('facility_id'))
    
    # Debug netixlan data structure
    print("\nFirst netixlan structure:")
    if data.get('netixlan'):
        netix = data['netixlan'][0]
        print("Keys:", list(netix.keys()))
        print("fac_id:", netix.get('fac_id'))
        print("ix_id:", netix.get('ix_id'))
    
    # Debug coordinate availability
    print("\nCoordinate check:")
    print(f"Facilities with coordinates: {sum(1 for f in data['facilities'] if f.get('latitude') and f.get('longitude'))}")
    print(f"IXPs with coordinates: {sum(1 for i in data['ixps'] if i.get('latitude') and i.get('longitude'))}")
    
    # Sample a few IXPs to see their structure
    print("\nSample IXP data:")
    for ixp in list(data['ixps'])[:2]:  # Look at first 2 IXPs
        print(f"IXP {ixp.get('id')}:")
        print(f"- name: {ixp.get('name')}")
        print(f"- lat: {ixp.get('latitude')}")
        print(f"- lon: {ixp.get('longitude')}")
    
    # Create lookup dictionaries
    facility_coords = {
        f['id']: (float(f['longitude']), float(f['latitude']))
        for f in data['facilities']
        if f.get('latitude') and f.get('longitude')
    }
    
    # Create IXP to facility mapping using ix_count
    ixp_to_facility = {}
    for facility in data['facilities']:
        if facility.get('ix_count', 0) > 0:
            # Find IXPs in this city
            city_ixps = [
                ixp for ixp in data['ixps']
                if ixp.get('city') == facility.get('city')
            ]
            for ixp in city_ixps:
                ixp_to_facility[ixp['id']] = facility['id']
    
    output = {
        "type": "FeatureCollection",
        "features": []
    }
    
    # Convert facilities
    for facility in data['facilities']:
        if facility.get('latitude') and facility.get('longitude'):
            output['features'].append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [
                        float(facility['longitude']), 
                        float(facility['latitude'])
                    ]
                },
                "properties": {
                    "id": facility['id'],
                    "name": facility['name'],
                    "address": facility.get('address1', ''),
                    "net_count": facility.get('net_count', 0),
                    "ix_count": facility.get('ix_count', 0),
                    "type": "facility"
                }
            })
    
    # Convert IXPs using city-based facility mapping
    for ixp in data['ixps']:
        if ixp['id'] in ixp_to_facility:
            fac_id = ixp_to_facility[ixp['id']]
            if fac_id in facility_coords:
                output['features'].append({
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": facility_coords[fac_id]
                    },
                    "properties": {
                        "id": ixp['id'],
                        "name": ixp['name'],
                        "net_count": ixp.get('net_count', 0),
                        "type": "ixp"
                    }
                })
    
    # Create connections using city-based mapping
    seen_connections = set()
    connection_counts = {}  # Track number of connections per facility
    for netix in data['netixlan']:
        ix_id = netix.get('ix_id')
        if ix_id in ixp_to_facility:
            fac_id = ixp_to_facility[ix_id]
            if fac_id in facility_coords:
                conn_id = (fac_id, ix_id)
                if conn_id not in seen_connections:
                    seen_connections.add(conn_id)
                    
                    # Count connections for this facility
                    connection_counts[fac_id] = connection_counts.get(fac_id, 0) + 1
                    
                    # Create offset endpoint
                    base_coords = facility_coords[fac_id]
                    end_coords = create_offset_point(
                        base_coords, 
                        connection_counts[fac_id], 
                        10  # Maximum number of visible connections per facility
                    )
                    
                    output['features'].append({
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "coordinates": [
                                base_coords,
                                end_coords
                            ]
                        },
                        "properties": {
                            "speed": netix.get('speed', 0),
                            "type": "connection"
                        }
                    })
    
    # Save to file
    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"\nConverted to single FeatureCollection with:")
    print(f"- {len([f for f in output['features'] if f['properties']['type'] == 'facility'])} facilities")
    print(f"- {len([f for f in output['features'] if f['properties']['type'] == 'ixp'])} IXPs")
    print(f"- {len([f for f in output['features'] if f['properties']['type'] == 'connection'])} connections")

def create_offset_point(base_coords, index, total):
    """Create a slightly offset point to show connections visually"""
    radius = 0.05  # Increased from 0.01 to 0.05 (about 5km offset)
    angle = (index * 2 * math.pi) / total
    return [
        base_coords[0] + radius * math.cos(angle),
        base_coords[1] + radius * math.sin(angle)
    ]

def convert_shapefiles_to_geojson(input_dir='../../../public/kx-houston-texas-census-block-group-boundaries-2010-SHP', 
                                 output_dir='../../../public'):
    """Convert shapefiles to GeoJSON format"""
    
    # Get absolute paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_dir = os.path.abspath(os.path.join(script_dir, input_dir))
    output_dir = os.path.abspath(os.path.join(script_dir, output_dir))
    
    print(f"🔍 Looking for shapefiles in: {input_dir}")
    print(f"📂 Will save GeoJSON files to: {output_dir}")
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        # Construct input shapefile path
        input_path = os.path.join(input_dir, "houston-texas-census-block-group-boundaries-2010.shp")
        
        # Read shapefile using geopandas
        print(f"\nProcessing Houston census blocks...")
        gdf = gpd.read_file(input_path)
        
        # Convert to EPSG:4326 (WGS84) if it's not already
        if gdf.crs != 'EPSG:4326':
            gdf = gdf.to_crs('EPSG:4326')
        
        # Construct output path
        output_file = os.path.join(output_dir, "houston-census-blocks.geojson")
        
        # Save as GeoJSON
        gdf.to_file(output_file, driver='GeoJSON')
        
        print(f"✅ Converted to {output_file}")
        print(f"Features: {len(gdf)}")
        print(f"Columns: {list(gdf.columns)}")
        
    except Exception as e:
        print(f"❌ Error processing shapefile: {str(e)}")
    
    print("\nConversion complete!")

if __name__ == "__main__":
    convert_shapefiles_to_geojson()

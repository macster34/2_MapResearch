# Houston Map Visualization - GeoJSON Data Bundles

This directory contains zip bundles of GeoJSON files required for the Houston Map Visualization project.

## Available Bundles

1. **houston_all_geojson.zip** (~191 MB compressed)
   - Contains all GeoJSON files needed for the project
   - This is the complete dataset in a single file

2. **houston_large_files.zip** (~129 MB compressed)
   - Contains only the largest GeoJSON files:
     - `houston_buildings.geojson` (~276 MB uncompressed)
     - `Pipelines.geojson` (~417 MB uncompressed)

3. **houston_medium_files.zip** (~87 MB compressed)
   - Contains medium-sized GeoJSON files:
     - `Segments_-_Line.geojson` (~91 MB uncompressed)
     - `Subdivision_Boundary.geojson` (~67 MB uncompressed)
     - `Surface_Water.geojson` (~52 MB uncompressed)
     - `2-Year_Time_of_Travel_Capture_Zone.geojson` (~18 MB uncompressed)
     - `Area_of_Primary_Influence.geojson` (~28 MB uncompressed)
     - `PWS_Reservoir.geojson` (~17 MB uncompressed)

4. **houston_small_files.zip** (~11 MB compressed)
   - Contains all smaller GeoJSON files (< 10 MB each)
   - Includes various points of interest, census blocks, and other smaller datasets

## Usage

These bundles are meant to be extracted directly to the `remote/public` directory of the project.

### Using the Download Script

The project includes a `download_data.sh` script that can download and extract these files automatically. To use it:

1. Make the script executable:
   ```bash
   chmod +x download_data.sh
   ```

2. Run the script:
   ```bash
   ./download_data.sh
   ```

3. Follow the prompts to select which bundle(s) to download and provide the URL where they are hosted.

### Manual Download and Extraction

If you've downloaded these bundles manually, you can extract them using:

```bash
# Create the directory if it doesn't exist
mkdir -p remote/public

# Extract a bundle
unzip houston_all_geojson.zip -d remote/public/
```

## File Size Information

The compressed and uncompressed sizes of the key files are:

| File | Compressed Size | Uncompressed Size |
|------|----------------|-------------------|
| houston_buildings.geojson | ~39 MB (in zip) | ~276 MB |
| Pipelines.geojson | ~96 MB (in zip) | ~417 MB |
| Segments_-_Line.geojson | ~32 MB (in zip) | ~91 MB |
| Subdivision_Boundary.geojson | ~21 MB (in zip) | ~67 MB |
| Surface_Water.geojson | ~17 MB (in zip) | ~52 MB |

The compressed sizes shown above are approximate and represent the space each file occupies within the zip bundles. 
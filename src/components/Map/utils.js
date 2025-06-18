import mapboxgl from 'mapbox-gl';
import { DC_BOUNDS } from './constants';
import { analyzeCensusData } from './hooks/useCensusData';
import { AINavigator } from './hooks/useAINavigator';
import { askClaude } from '../../services/claude';
import { 
  initializeParticleLayers, 
  initializePowerGrid 
} from './hooks/mapAnimations';
import { 
  MAP_CONFIG, 
  BUILDING_COLORS,
  MIAMI_BOUNDS 
} from './constants';
import styled from 'styled-components';
import { createRoot } from 'react-dom/client';
import { brickellGEOIDs } from './constants/geoIds';
import { buffer, bbox } from '@turf/turf';

// Coordinate generation
export const generateRandomLocation = (bounds) => {
  const lat = bounds.south + Math.random() * (bounds.north - bounds.south);
  const lng = bounds.west + Math.random() * (bounds.east - bounds.west);
  return [lng, lat];
};

// Building data generation
export const generateBuildingData = (id, bounds) => {
  const coords = generateRandomLocation(bounds);
  const propertyTypes = ['office', 'datacenter', 'mixed-use', 'industrial'];
  const neighborhoods = ['Downtown', 'Navy Yard', 'NoMa', 'Capitol Hill', 'Georgetown', 'Foggy Bottom'];
  
  return {
    type: "Feature",
    properties: {
      id: id,
      address: generateAddress(coords),
      property_type: propertyTypes[Math.floor(Math.random() * propertyTypes.length)],
      neighborhood: getNeighborhoodFromCoords(coords, neighborhoods),
      powerScore: Math.random().toFixed(2),
      coolingScore: Math.random().toFixed(2),
      squareFeet: Math.floor(Math.random() * (1000000 - 50000) + 50000),
      yearBuilt: Math.floor(Math.random() * (2023 - 1950) + 1950),
      location: {
        latitude: coords[1],
        longitude: coords[0],
        address: generateAddress(coords)
      }
    },
    geometry: {
      type: "Point",
      coordinates: coords
    }
  };
};

// Generate mock data for multiple buildings
export const generateMockData = (count = 50) => {
  const features = [];
  for (let i = 0; i < count; i++) {
    features.push(generateBuildingData(i, DC_BOUNDS));
  }
  return {
    type: "FeatureCollection",
    features: features
  };
};

export const generateAddress = (coordinates) => {
  const streets = [
    'K St NW', 'M St NW', 'Pennsylvania Ave', 'Connecticut Ave', 
    'Wisconsin Ave', 'Massachusetts Ave', 'Rhode Island Ave', 'New York Ave'
  ];
  const numbers = ['1200', '1400', '1600', '1800', '2000', '2200'];
  
  const streetIndex = Math.floor((coordinates[0] * 10) % streets.length);
  const numberIndex = Math.floor((coordinates[1] * 10) % numbers.length);
  
  return `${numbers[numberIndex]} ${streets[streetIndex]}`;
};

export const getNeighborhoodFromCoords = (coordinates) => {
  const neighborhoods = [
    { name: 'Downtown', lat: 38.9, lon: -77.03 },
    { name: 'Navy Yard', lat: 38.87, lon: -77.00 },
    { name: 'NoMa', lat: 38.91, lon: -77.01 },
    { name: 'Capitol Hill', lat: 38.89, lon: -77.00 },
    { name: 'Foggy Bottom', lat: 38.9, lon: -77.05 },
    { name: 'Georgetown', lat: 38.91, lon: -77.06 }
  ];
  
  let closest = neighborhoods[0];
  let minDistance = Infinity;
  
  neighborhoods.forEach(hood => {
    const distance = Math.sqrt(
      Math.pow(coordinates[1] - hood.lat, 2) + 
      Math.pow(coordinates[0] - hood.lon, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closest = hood;
    }
  });
  
  return closest.name;
};

export const distanceToLineSegment = (point, start, end) => {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length === 0) {
    return Math.sqrt(
      Math.pow(point[0] - start[0], 2) + 
      Math.pow(point[1] - start[1], 2)
    );
  }

  const t = Math.max(0, Math.min(1, 
    ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (length * length)
  ));

  const projection = [
    start[0] + t * dx,
    start[1] + t * dy
  ];

  return Math.sqrt(
    Math.pow(point[0] - projection[0], 2) + 
    Math.pow(point[1] - projection[1], 2)
  );
};

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const easeOutCubic = (x) => {
  return 1 - Math.pow(1 - x, 3);
};

export const initializeLayers = (map) => {
  if (!map) return;

  // Initialize base layers
  initializeMapLayers(map);
  
  // Initialize particle system
  initializeParticleLayers(map);
  
  // Initialize power grid
  initializePowerGrid(map);
};

export const calculateBuildingEfficiency = (building) => {
  const height = building.properties.height || 0;
  const area = calculateBuildingArea(building.geometry.coordinates[0]);
  return height > 30 && area > 200 && Math.random() > 0.6;
};

export const calculateBuildingArea = (coordinates) => {
  if (!coordinates || coordinates.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    area += coordinates[i][0] * coordinates[i + 1][1] - coordinates[i + 1][0] * coordinates[i][1];
  }
  return Math.abs(area) / 2;
};

export const initializeAIAnalysis = async (map, onUpdate) => {
  if (!map) {
    console.error('Map not initialized');
    return;
  }
  
  console.log('Initializing AI analysis...');
  
  try {
    const censusData = await analyzeCensusData();
    console.log('Census data loaded:', censusData ? 'yes' : 'no');
    
    const navigator = new AINavigator({
      map: map,
      censusData,
      onUpdate: (newSource) => {
        console.log('Updating map source...');
        if (map.getSource('buildings')) {
          map.getSource('buildings').setData(newSource);
        }
      }
    });
    
    return navigator;
  } catch (error) {
    console.error('Error initializing AI:', error);
    return null;
  }
};

export const highlightPOIBuildings = (map, poiTypes, color) => {
  const features = map.queryRenderedFeatures({
    layers: ['3d-buildings'],
    filter: ['has', 'height']
  });
  
  const buildingCounts = new Map();
  
  features.forEach(building => {
    const pois = map.queryRenderedFeatures(
      map.project(building.geometry.coordinates[0][0]),
      { layers: ['miami-pois'] }
    );
    
    const relevantPOIs = pois.filter(poi => 
      poiTypes.includes(poi.properties.type.toLowerCase())
    );
    
    if (relevantPOIs.length > 0) {
      buildingCounts.set(building.id, relevantPOIs.length);
      map.setFeatureState(
        { source: 'composite', sourceLayer: 'building', id: building.id },
        { isHighlighted: true }
      );
    }
  });
  
  return { buildings: buildingCounts };
};

export const parseClaudeResponse = (response) => {
  console.log('Raw Claude response:', response);
  try {
    if (response?.content?.[0]?.text) {
      const parsed = JSON.parse(response.content[0].text);
      return {
        mainText: parsed.explanation,
        poiInfo: parsed.poiInfo,
        followUps: parsed.followUpSuggestions
      };
    }
    throw new Error('Unexpected response format');
  } catch (e) {
    console.error("Error parsing response:", e);
    return { 
      mainText: "Could not process the response. Please try again.",
      poiInfo: null,
      followUps: []
    };
  }
};

export const handleQuestion = async (question) => {
  try {
    const response = await askClaude(question);
    return parseClaudeResponse(response);
  } catch (error) {
    console.error('Error handling question:', error);
    return null;
  }
};

export const initializeMap = (container, config) => {
  const map = new mapboxgl.Map({
    container,
    style: config.style,
    center: config.center,
    zoom: config.zoom || 1,
    minZoom: config.minZoom,
    maxZoom: config.maxZoom,
    pitch: 0
  });

  return map;
};

export const setupMapEventListeners = (map, handlers) => {
  if (!map) return () => {};

  const { onLoad } = handlers;

  // Setup load handler
  map.on('load', () => {
    console.log('🌎 Map loaded - initializing layers');
    onLoad?.();
  });

  // Setup hover handlers only
  map.on('mouseenter', '3d-buildings', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', '3d-buildings', () => {
    map.getCanvas().style.cursor = '';
  });

  // Return cleanup function
  return () => {
    map.off('load', onLoad);
    map.off('mouseenter', '3d-buildings');
    map.off('mouseleave', '3d-buildings');
  };
};

export const initializeMapLayers = async (map) => {
  try {
    if (!map.isStyleLoaded()) {
      await new Promise(resolve => map.once('style.load', resolve));
    }

    // Load census blocks
    const censusResponse = await fetch('/data_bundles/houston_small_files/houston-census-blocks.geojson');
    const censusData = await censusResponse.json();
    
    map.addSource('census-blocks', {
      type: 'geojson',
      data: censusData
    });

    // Add census blocks layer
    map.addLayer({
      'id': 'census-blocks',
      'type': 'fill',
      'source': 'census-blocks',
      'paint': {
        'fill-color': '#FF0000',
        'fill-opacity': 0.4,
        'fill-outline-color': '#000000'
      }
    });

    // Add 3D buildings with delay
    setTimeout(() => {
      add3DBuildings(map);
    }, 1000);

  } catch (error) {
    console.error('Error initializing map layers:', error);
  }
};

export const add3DBuildings = (map) => {
  map.addLayer({
    'id': '3d-buildings',
    'source': 'composite',
    'source-layer': 'building',
    'filter': [
      'all',
      ['has', 'height'],
      ['>', ['get', 'height'], 0]
    ],
    'type': 'fill-extrusion',
    'minzoom': 0,
    'paint': {
      'fill-extrusion-color': '#ffffff',
      'fill-extrusion-height': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, ['*', ['get', 'height'], 2],
        10, ['*', ['get', 'height'], 1.5],
        15, ['get', 'height']
      ],
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': 1,
      'fill-extrusion-vertical-gradient': true,
      'fill-extrusion-ambient-occlusion-intensity': 0.6,
      'fill-extrusion-ambient-occlusion-radius': 3
    },
    'layout': {
      'visibility': 'visible'
    }
  });

  map.triggerRepaint();
};

// Add this new styled component definition at the top
const POIToggleContainer = styled.div`
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(26, 26, 26, 0.9);
  padding: 8px 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 1;

  input[type="checkbox"] {
    appearance: none;
    width: 16px;
    height: 16px;
    border: 2px solid #FF4500;
    border-radius: 4px;
    cursor: pointer;
    position: relative;
    
    &:checked {
      background: #FF4500;
      &:after {
        content: "✓";
        color: white;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 12px;
      }
    }
  }

  label {
    cursor: pointer;
    user-select: none;
  }
`;

export const createPOIToggle = (map, container, initialState = true) => {
  const toggleContainer = document.createElement('div');
  const root = createRoot(toggleContainer);
  
  const POIToggle = ({ onChange, checked }) => (
    <POIToggleContainer>
      <label>
        <input
          type="checkbox"
          checked={checked}
          onChange={e => {
            const newState = e.target.checked;
            onChange(newState);
            if (map.current) {
              map.current.setLayoutProperty(
                'miami-pois',
                'visibility',
                newState ? 'visible' : 'none'
              );
            }
          }}
        />
        <span>Show POI Markers</span>
      </label>
    </POIToggleContainer>
  );

  let currentState = initialState;
  
  const render = () => {
    root.render(
      <POIToggle 
        onChange={(newState) => {
          currentState = newState;
          render(); // Re-render with new state
        }} 
        checked={currentState} 
      />
    );
  };

  render(); // Initial render
  container.appendChild(toggleContainer);

  return {
    setVisibility: (visible) => {
      currentState = visible;
      render();
    },
    cleanup: () => {
      root.unmount();
      container.removeChild(toggleContainer);
    }
  };
};

export const addGeoIdTags = (map, geoIds, setIsGeoIDVisible) => {
    console.log('🏷️ Starting to add tags for GEOIDs:', geoIds);

    // Remove existing markers
    const existingMarkers = document.querySelectorAll('.mapboxgl-marker');
    existingMarkers.forEach(marker => marker.remove());

    // Calculate how many GEOIDs to show (40% of total)
    const numberOfTagsToShow = Math.floor(geoIds.length * 0.4);
    
    // Randomly select GEOIDs to show
    const selectedGeoIds = [...geoIds]
      .sort(() => Math.random() - 0.5)  // Shuffle array
      .slice(0, numberOfTagsToShow);    // Take first 40%

    selectedGeoIds.forEach(geoId => {
        const features = map.querySourceFeatures('pmt-boundaries', {
            filter: ['==', ['get', 'GEOID'], geoId]
        });

        if (features.length && features[0].geometry) {
            const coordinates = features[0].geometry.coordinates[0];
            const center = coordinates.reduce((acc, curr) => {
                return [acc[0] + curr[0], acc[1] + curr[1]];
            }, [0, 0]).map(coord => coord / coordinates.length);

            const el = document.createElement('div');
            el.className = 'geoid-label';
            el.innerHTML = `
                <div style="background: rgba(0,0,0,0.75); color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px;">
                    ${geoId.slice(-2)}
                </div>
            `;

            new mapboxgl.Marker({
                element: el,
                anchor: 'center'
            })
                .setLngLat(center)
                .addTo(map);
        }
    });

    console.log('✨ Added GEOID markers:', selectedGeoIds.length);
    
    // Trigger the animation by setting isGeoIDVisible to true
    setIsGeoIDVisible(true);
};

export const setupAnimation = async (map, setIsGeoIDVisible) => {
    // ... existing animation setup code ...

    // Wait for the hatch fill layer to be added
    await new Promise(resolve => {
        if (map.getLayer('hatch-fill')) {
            resolve();
        } else {
            map.once('styledata', () => {
                if (map.getLayer('hatch-fill')) {
                    resolve();
                }
            });
        }
    });

    // Add a small delay to ensure animations are running
    setTimeout(() => {
        addGeoIdTags(map, brickellGEOIDs, setIsGeoIDVisible);
    }, 1000);
};

export const initializeRoadGrid = (map, options = {}) => {
  if (map.getLayer('road-grid')) {
    map.removeLayer('road-grid');
  }
  
  map.addLayer({
    'id': 'road-grid',
    'type': 'line',
    'source': 'composite',
    'source-layer': 'road',
    'layout': {
      'line-join': 'round',
      'line-cap': 'round'
    },
    'paint': {
      'line-color': '#ffffff',
      'line-width': 0.5,
      'line-opacity': 0.44
    },
    ...options
  });
};

export const animateRoadGrid = (map) => {
  let start;
  
  function animate(timestamp) {
    if (!start) start = timestamp;
    const progress = (timestamp - start) / 1000;
    
    map.setPaintProperty('road-grid', 'line-dasharray', [
      2,
      4,
      progress % 8 // This creates the moving effect
    ]);
    
    return requestAnimationFrame(animate);
  }
  
  return requestAnimationFrame(animate);
};

export const stopRoadAnimation = (frameId) => {
  if (frameId) {
    cancelAnimationFrame(frameId);
  }
};

export const updateBounds = (map) => {
  const bounds = map.getBounds();
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  
  return {
    north: ne.lat,
    east: ne.lng,
    south: sw.lat,
    west: sw.lng
  };
};

export const loadHarveyData = async (map, showZipFloodAnalysis) => {
  try {
    console.log('[ZIP Analysis] Starting flood analysis...');
    
    // Load both Harvey datasets
    const [harvey1Response, harvey2Response] = await Promise.all([
      fetch('/harvy1.geojson'),
      fetch('/harvy2.geojson')
    ]);
    
    const harvey1Data = await harvey1Response.json();
    const harvey2Data = await harvey2Response.json();
    
    console.log('[ZIP Analysis] Harvey data loaded:', {
      harvey1Count: harvey1Data.features?.length || harvey1Data.length,
      harvey2Count: harvey2Data.features?.length || harvey2Data.length
    });

    // Combine and process the data
    const allMeasurements = [
      ...(harvey1Data.features || harvey1Data).map(m => ({
        ...m,
        source: 'harvey1'
      })),
      ...(harvey2Data.features || harvey2Data).map(m => ({
        ...m,
        source: 'harvey2'
      }))
    ];

    // Add ZIP code flood analysis
    if (showZipFloodAnalysis) {
      console.log('[ZIP Analysis] Processing', allMeasurements.length, 'total measurements');
      const zipSource = map.getSource('zipcodes');
      const zipData = zipSource._data;
      const zipMeasurements = new Map();
      const zipAverages = new Map();

      // Process each ZIP code
      for (let i = 0; i < zipData.features.length; i++) {
        const zip = zipData.features[i];
        // Check for Zip_Code property
        const zipCode = zip.properties?.Zip_Code;

        if (!zipCode) {
          console.log(`[ZIP Analysis] Missing ZIP code for feature ${i}, properties:`, zip.properties);
          continue;
        }

        try {
          // Validate geometry
          if (!zip.geometry || !zip.geometry.coordinates || !zip.geometry.coordinates[0]) {
            console.log(`[ZIP Analysis] Invalid geometry for ZIP ${zipCode}`);
            continue;
          }

          // Validate polygon has enough points
          const coordinates = zip.geometry.coordinates[0];
          if (!Array.isArray(coordinates) || coordinates.length < 4) {
            console.log(`[ZIP Analysis] Insufficient points for ZIP ${zipCode}`);
            continue;
          }

          // Create a bounding box for the ZIP code area
          const boundingBox = bbox(zip);
          console.log(`[ZIP Analysis] Processing ZIP ${zipCode}, bbox:`, boundingBox);

          // Find measurements within the bounding box
          const measurementsInZip = allMeasurements.filter(m => {
            const point = [
              parseFloat(m.longitude_dd || m.geometry?.coordinates?.[0]),
              parseFloat(m.latitude_dd || m.geometry?.coordinates?.[1])
            ];
            return !isNaN(point[0]) && !isNaN(point[1]) &&
                   point[0] >= boundingBox[0] && point[0] <= boundingBox[2] && 
                   point[1] >= boundingBox[1] && point[1] <= boundingBox[3];
          });

          console.log(`[ZIP Analysis] Found ${measurementsInZip.length} measurements in ZIP ${zipCode}`);

          if (measurementsInZip.length > 0) {
            // Process valid heights
            const validHeights = measurementsInZip
              .map(m => {
                const height = parseFloat(m.peak_stage || m.properties?.peak_stage);
                const isValid = !isNaN(height) && height >= 0 && height <= 200; // Add reasonable max height
                if (!isValid) {
                  console.log(`[ZIP Analysis] Invalid height in ZIP ${zipCode}:`, height);
                }
                return isValid ? height : null;
              })
              .filter(height => height !== null);

            if (validHeights.length > 0) {
              const avgFloodHeight = validHeights.reduce((sum, height) => sum + height, 0) / validHeights.length;
              zipMeasurements.set(zipCode, measurementsInZip);
              zipAverages.set(zipCode, avgFloodHeight);
              console.log(`[ZIP Analysis] ZIP ${zipCode}: avg height ${avgFloodHeight.toFixed(2)} from ${validHeights.length} valid measurements`);
              console.log(`[ZIP Analysis] Height distribution for ZIP ${zipCode}:`, validHeights);
            }
          }
        } catch (error) {
          console.error(`[ZIP Analysis] Error processing ZIP ${zipCode}:`, error);
        }
      }

      // Calculate min/max heights for color scale
      const heights = Array.from(zipAverages.values());
      
      // Set default values if no valid heights
      const minHeight = heights.length > 0 ? Math.min(...heights) : 0;
      const maxHeight = heights.length > 0 ? Math.max(...heights) : 10;
      
      console.log('[ZIP Analysis] Height range:', { 
        minHeight, 
        maxHeight,
        numberOfZipsWithData: heights.length,
        heightDistribution: {
          '0-2ft': heights.filter(h => h <= 2).length,
          '2-4ft': heights.filter(h => h > 2 && h <= 4).length,
          '4-6ft': heights.filter(h => h > 4 && h <= 6).length,
          '6-8ft': heights.filter(h => h > 6 && h <= 8).length,
          '8+ft': heights.filter(h => h > 8).length
        }
      });

      // Update features with flood height data
      const updatedZipFeatures = zipData.features.map(zip => {
        const zipCode = zip.properties?.Zip_Code;
        const floodHeight = zipAverages.get(zipCode);
        console.log(`[ZIP Analysis] Setting flood height for ZIP ${zipCode}:`, floodHeight);
        return {
          ...zip,
          properties: {
            ...zip.properties,
            flood_height: floodHeight !== undefined ? floodHeight : null,
            measurement_count: (zipMeasurements.get(zipCode) || []).length
          }
        };
      });

      // Update source data
      zipSource.setData({
        type: 'FeatureCollection',
        features: updatedZipFeatures
      });

      // Update the layer paint properties with the actual data range
      const colorScale = minHeight === maxHeight ? [
        'case',
        ['has', 'flood_height'],
        '#4292c6',  // Use a single medium blue color when all values are the same
        '#404040'   // Dark gray for ZIP codes without measurements
      ] : [
        'case',
        ['has', 'flood_height'],
        [
          'interpolate',
          ['linear'],
          ['get', 'flood_height'],
          minHeight, '#f7fbff',    // Very light blue for lowest heights
          minHeight + (maxHeight - minHeight) * 0.25, '#9ecae1',    // Light blue
          minHeight + (maxHeight - minHeight) * 0.5, '#4292c6',    // Medium blue
          minHeight + (maxHeight - minHeight) * 0.75, '#2171b5',    // Deep blue
          maxHeight, '#084594'     // Very dark blue for highest heights
        ],
        '#404040'  // Dark gray for ZIP codes without measurements
      ];

      map.setPaintProperty('zipcode-flood-analysis', 'fill-color', colorScale);
      map.setPaintProperty('zipcode-flood-analysis', 'fill-opacity', [
        'case',
        ['has', 'flood_height'],
        0.5,  // Changed from 0.7 to 0.5 for ZIP codes with flood data
        0.1   // Keep 0.1 for ZIP codes without measurements
      ]);
    }

    // Move wastewater outfalls layer to the front
    if (map.getLayer('wastewater-outfalls')) {
      map.moveLayer('wastewater-outfalls');
    }

    // Move waterway layer to the front
    if (map.getLayer('waterway')) {
      map.moveLayer('waterway');
    }

    // Move 3D building layers to the very top
    const buildingLayers = [
      'osm-buildings',
      'mapbox-buildings',
      'building',
      'building-extrusion',
      '3d-buildings'
    ];

    buildingLayers.forEach(layerId => {
      if (map.getLayer(layerId)) {
        map.moveLayer(layerId);
      }
    });

  } catch (error) {
    console.error('[ZIP Analysis] Error in loadHarveyData:', error);
  }
};

export const createWaterwayBuffer = async (map) => {
  try {
    const waterways = map.queryRenderedFeatures({
      layers: ['water']
    });
    
    if (waterways.length === 0) return;
    
    const buffered = buffer(waterways[0], 0.1, { units: 'kilometers' });
    
    if (map.getSource('waterway-buffer')) {
      map.getSource('waterway-buffer').setData(buffered);
    } else {
      map.addSource('waterway-buffer', {
        type: 'geojson',
        data: buffered
      });
      
      map.addLayer({
        'id': 'waterway-buffer',
        'type': 'fill',
        'source': 'waterway-buffer',
        'paint': {
          'fill-color': '#0000FF',
          'fill-opacity': 0.2
        }
      });
    }
  } catch (error) {
    console.error('Error creating waterway buffer:', error);
  }
};

// Update any ERCOT-related color constants
export const ERCOT_COLORS = {
  LOW: '#FF8C00', // Dark Orange
  MEDIUM: '#FF5500', // Bright Orange
  HIGH: '#FF2800', // Orange-Red
  CRITICAL: '#FF0000', // Bright Red
  DEFAULT: '#FFB266', // Light Orange
  OUTLINE: '#BB0000', // Dark Red
  HIGHLIGHT: '#FFAC40' // Highlight Orange
};

// Update any functions that might set colors for ERCOT layers
export const loadErcotData = async (map) => {
  try {
    //... existing code for loading data ...
    
    // If there's any code that sets colors for ERCOT data, update the color values
    if (map.getLayer('ercot-layer')) {
      map.setPaintProperty('ercot-layer', 'fill-color', [
        'interpolate',
        ['linear'],
        ['get', 'price'],
        25, ERCOT_COLORS.LOW,
        50, ERCOT_COLORS.MEDIUM,
        75, ERCOT_COLORS.HIGH,
        100, ERCOT_COLORS.CRITICAL
      ]);
      
      map.setPaintProperty('ercot-layer', 'fill-outline-color', ERCOT_COLORS.OUTLINE);
      map.setPaintProperty('ercot-layer', 'fill-opacity', 0.7);
    }
    
    // ... rest of existing function ...
  } catch (error) {
    console.error('Error loading ERCOT data:', error);
  }
};

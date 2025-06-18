import React, { useRef, useEffect, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import BuildingPopup from './BuildingPopup';
import { createRoot } from 'react-dom/client';
import { MAP_CONFIG, BUILDING_COLORS } from './constants';
import { brickellGEOIDs } from './constants/geoIds';
import { 
    initializeParticleLayers, 
    initializePowerGrid, 
    animateParticles,
    initializeGEOIDParticleLayers,
    animateGEOIDParticles,
    transitionToGridView,
    stopGEOIDAnimation
} from './hooks/mapAnimations';
import { hexGrid, booleanPointInPolygon } from '@turf/turf';
import { analyzeCensusData } from './hooks/useCensusData';
import { AINavigator } from './hooks/useAINavigator';
import { askClaude, parseClaudeResponse } from '../../services/claude';
import styled from 'styled-components';
import AIChatPanel from './AIChatPanel';
import { 
    addGeoIdTags,
    setupAnimation,
    initializeMap,
    createPOIToggle,
    setupMapEventListeners,
    highlightPOIBuildings,
    calculateBuildingArea
} from './utils';
import { initializePOILayers, applyPOIHighlights } from './layers/POILayers';
import { initializeGEOIDLayer, getGEOIDLayerId, getAllGEOIDLayerIds } from './layers/GEOIDLayer';

// Add this line to set the access token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

const MapContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;

  .callout-annotation {
    cursor: default;
    
    &:hover {
      z-index: 2;
    }
  }

  .mapboxgl-marker {
    z-index: 1;
  }

  .custom-popup .mapboxgl-popup-content {
    background: none;
    padding: 0;
    border: none;
    box-shadow: none;
  }

  .custom-popup .mapboxgl-popup-close-button {
    color: white;
    font-size: 16px;
    padding: 4px 8px;
    right: 4px;
    top: 4px;
  }

  .custom-popup .mapboxgl-popup-tip {
    display: none;
  }
`;

// First, move mapState outside the component to make it truly global
const mapState = {
  clickState: {
    isHandlingClick: false,
    lastClickTime: 0,
    blockAllClicks: false,
    blockZoom: false
  }
};

const MapComponent = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  
  // TODO: Clean up these refs and states in future PRs
  const popupRef = useRef(null);
  const frameCount = useRef(0);
  const lastAnimationTime = useRef(0);
  const animationFrame = useRef(null);
  const buildingStates = useRef(new Map());
  const isAnimating = useRef(false);
  const previouslyHighlightedSubdivision = useRef(null);
  const previouslyHighlightedPMT = useRef(null);
  const [aiAnalysisMode, setAiAnalysisMode] = useState(false);
  const [aiNavigator, setAiNavigator] = useState(null);
  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [hoverPopup, setHoverPopup] = useState(null);
  const aiControlRef = useRef(null);
  const previousHighlight = useRef([]);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);
  const [showPOIMarkers, setShowPOIMarkers] = useState(true);
  const highlightedBuildingsData = useRef(null);
  const zoomHandler = useRef(null);
  const moveHandler = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing...');
  const [isSelectingArea, setIsSelectingArea] = useState(false);
  const poiToggleRef = useRef(null);
  const currentFilter = useRef(null);
  const [poiLayerInitialized, setPoiLayerInitialized] = useState(false);
  const [isGeoIDVisible, setIsGeoIDVisible] = useState(false);
  const [geoIdAnimationFrame, setGeoIdAnimationFrame] = useState(null);
  const [clickHandlerInitialized, setClickHandlerInitialized] = useState(false);

  const loadingMessages = [
    "Analyzing spatial data...",
    "Processing urban patterns...",
    "Calculating density metrics...",
    "Mapping neighborhood features...",
    "Evaluating development zones..."
  ];

  useEffect(() => {
    let messageInterval;
    if (isLoading) {
      let index = 0;
      setLoadingMessage(loadingMessages[0]); // Set initial message
      messageInterval = setInterval(() => {
        index = (index + 1) % loadingMessages.length;
        setLoadingMessage(loadingMessages[index]);
      }, 2000);
    }
    return () => clearInterval(messageInterval);
  }, [isLoading]);

  const handleQuestion = async (question) => {
    // Clear any existing circle selection
    if (map.current) {
      try {
        // Check if the layer exists before trying to modify it
        if (map.current.getLayer('area-circle')) {
          map.current.setLayoutProperty('area-circle', 'visibility', 'none');
        }
        setIsSelectingArea(false);
      } catch (error) {
        console.warn('Error handling layer visibility:', error);
      }
    }

    setIsLoading(true);
    setMessages(prev => [...prev, { isUser: true, content: question }]);

    try {
      const bounds = map.current.getBounds();
      const mapBounds = {
        sw: bounds.getSouthWest(),
        ne: bounds.getNorthEast()
      };

      // Get response from Claude service
      const response = await askClaude(question, {}, mapBounds);
      const parsedResponse = parseClaudeResponse(response);

      if (parsedResponse.mainText !== "Could not process the response. Please try again.") {
        setMessages(prev => [...prev, {
          isUser: false,
          content: parsedResponse
        }]);
        
        // Handle map navigation and highlighting
        handleLLMResponse(parsedResponse);
      } else {
        throw new Error('Failed to parse response');
      }
    } catch (error) {
      console.error('Error in handleQuestion:', error);
      setMessages(prev => [...prev, {
        isUser: false,
        content: {
          mainText: "I apologize, but I encountered an error processing your request. Please try asking your question again.",
          poiInfo: null,
          followUps: []
        }
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeLayers = useCallback(async () => {
    try {
      // Add heat map layer before 3D buildings
      map.current.addLayer({
        'id': 'poi-heat',
        'type': 'heatmap',
        'source': {
          'type': 'geojson',
          'data': {
            'type': 'FeatureCollection',
            'features': []
          }
        },
        'paint': {
          // Increase the heatmap weight based on POI count
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'poiCount'],
            1, 0.5,
            5, 1
          ],
          // Increase the heatmap color weight by zoom level
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0.5,
            15, 1.5
          ],
          // Color gradient from orange to red
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(255,103,0,0)',
            0.2, 'rgba(255,103,0,0.2)',
            0.4, 'rgba(255,103,0,0.4)',
            0.6, 'rgba(255,103,0,0.6)',
            0.8, 'rgba(255,103,0,0.8)',
            1, 'rgba(255,0,0,1)'
          ],
          // Adjust the heatmap radius by zoom level
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 15,
            15, 25
          ],
          'heatmap-opacity': 0.7
        }
      }, 'miami-pois'); // Add before POI layer

      // Add 3D buildings layer
      if (!map.current.getLayer('3d-buildings')) {
        map.current.addLayer({
          'id': '3d-buildings',
          'source': 'composite',
          'source-layer': 'building',
          'filter': ['==', 'extrude', 'true'],
          'type': 'fill-extrusion',
          'minzoom': 12,
          'paint': {
            'fill-extrusion-color': [
              'case',
              ['boolean', ['feature-state', 'isHighlighted'], false],
              '#00A5FF',  // Bright blue for highlighted building
              ['boolean', ['feature-state', 'isGreen'], false],
              BUILDING_COLORS.BRIGHT_GREEN,
              ['boolean', ['feature-state', 'inPowerGrid'], false],
              [
                'interpolate',
                ['linear'],
                ['feature-state', 'yellowIntensity'],
                0, BUILDING_COLORS.YELLOW_FAR,
                0.5, BUILDING_COLORS.YELLOW_MID,
                1, BUILDING_COLORS.YELLOW_CLOSE
              ],
              ['boolean', ['feature-state', 'isNegative'], false],
              BUILDING_COLORS.DARK_RED,
              BUILDING_COLORS.DARK_GRAY
            ],
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15, 0,
              15.05, ['get', 'height']
            ],
            'fill-extrusion-opacity': 0.9
          }
        });

        // Add POI layer from Mapbox tiles
        try {
          // First remove the default POI layer if it exists
          if (map.current.getLayer('poi-label')) {
            map.current.removeLayer('poi-label');
          }

          map.current.addLayer({
            'id': 'miami-pois',
            'type': 'circle',
            'source': 'composite',
            'source-layer': 'poi_label',
            'minzoom': 0,
            'maxzoom': 22,
            'paint': {
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                8, 2,
                12, 4,
                16, 6
              ],
              'circle-color': [
                'match',
                ['get', 'type'],
                'Restaurant', '#ff9900',
                'Cafe', '#cc6600',
                'Bar', '#990099',
                'Fast Food', '#ff6600',
                'Shop', '#0066ff',
                'Grocery', '#00cc00',
                'Mall', '#3366ff',
                'Market', '#009933',
                'Museum', '#cc3300',
                'Theater', '#cc0066',
                'Cinema', '#990033',
                'Gallery', '#cc3366',
                'Park', '#33cc33',
                'Garden', '#339933',
                'Sports', '#3399ff',
                'Hotel', '#9933ff',
                'Bank', '#666699',
                'Post', '#666666',
                'School', '#ff3333',
                'Hospital', '#ff0000',
                '#999999'  // Default color for unmatched types
              ],
              'circle-stroke-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                8, 0.5,
                12, 1,
                16, 1.5
              ],
              'circle-stroke-color': '#ffffff'
            }
          });

          // Debug available POI types
          setTimeout(() => {
            const features = map.current.querySourceFeatures('composite', {
              sourceLayer: 'poi_label'
            });
            console.log('Available POI types:', {
              count: features.length,
              types: [...new Set(features.map(f => f.properties.type))].sort(),
              categories: [...new Set(features.map(f => f.properties.category))].sort(),
              sampleFeature: features[0]
            });
          }, 2000);

        } catch (error) {
          console.error('Error adding POI layer:', error);
        }

        // Debug POI data with more details
        const debugPOIs = () => {
          const features = map.current.queryRenderedFeatures({ 
            layers: ['miami-pois'] 
          });
          console.log('POIs found:', {
            count: features.length,
            types: [...new Set(features.map(f => f.properties.type))],
            properties: features[0]?.properties,
            zoom: map.current.getZoom()
          });
        };

        // Check POIs after map is fully loaded
        map.current.once('idle', debugPOIs);
        setTimeout(debugPOIs, 2000);

        // Remove or modify the mousemove handler for POIs
        map.current.off('mousemove', 'miami-pois'); // Remove any existing handler
        map.current.on('mousemove', 'miami-pois', (e) => {
            // Only update cursor
            map.current.getCanvas().style.cursor = 'pointer';
        });

        map.current.on('mouseleave', 'miami-pois', () => {
            map.current.getCanvas().style.cursor = '';
        });

        // Click event for showing POI details - simplified without popup
        map.current.on('click', 'miami-pois', (e) => {
            if (!e.features[0]) return;
            
            const poiCoordinates = e.features[0].geometry.coordinates;
            const properties = e.features[0].properties;
            
            // Just log the click without creating a popup
            console.log('POI clicked:', properties.name, 'at', poiCoordinates);
        });

        // Add the update building colors functionality
        const updateBuildingColors = () => {
          const bounds = map.current.getBounds();
          const features = map.current.queryRenderedFeatures(
            undefined,
            { layers: ['3d-buildings'] }
          );

          features.forEach(building => {
            if (!building.geometry || !building.geometry.coordinates) return;

            const buildingId = building.id;
            if (!buildingId) return;

            if (!buildingStates.current.has(buildingId)) {
              const height = building.properties.height || 0;
              const area = calculateBuildingArea(building.geometry.coordinates[0]);
              
              let isInPowerGrid = false;
              let isNegative = false;

              // Store the building state
              buildingStates.current.set(buildingId, {
                isInPowerGrid,
                isNegative,
                height,
                area
              });
            }
          });

          // Update the building colors based on their states
          if (map.current.getLayer('3d-buildings')) {
            map.current.setPaintProperty('3d-buildings', 'fill-extrusion-color', [
              'case',
              ['boolean', ['get', 'isNegative'], false], '#ff0000',
              ['boolean', ['get', 'isInPowerGrid'], false], '#ffff00',
              '#1a1a1a'  // Much darker gray for non-highlighted buildings
            ]);
          }
        };

        // Call updateBuildingColors initially and on map events
        map.current.on('moveend', updateBuildingColors);
        map.current.on('zoomend', updateBuildingColors);
        updateBuildingColors();

        // Add POI density layer
        const createPOIDensityLayers = async () => {
          try {
            // Load both GeoJSON files
            const [snapResponse, subdivResponse] = await Promise.all([
              fetch('/PMT_Snapshot_feat_Service_2649843124464894629.geojson'),
              fetch('/Subdivision_Boundary.geojson')
            ]);
            
            const snapData = await snapResponse.json();
            const subdivData = await subdivResponse.json();

            // Add first source (PMT Snapshot)
            map.current.addSource('pmt-boundaries', {
              type: 'geojson',
              data: snapData,
              generateId: true
            });

            // Add second source (Subdivision)
            map.current.addSource('subdivision-boundaries', {
              type: 'geojson',
              data: subdivData,
              generateId: true
            });

            // Add PMT layer
            map.current.addLayer({
              'id': 'pmt-boundaries',
              'type': 'fill',
              'source': 'pmt-boundaries',
              'paint': {
                'fill-color': [
                  'case',
                  ['boolean', ['feature-state', 'isHighlighted'], false],
                  '#ff0000',  // Red for PMT highlights
                  'rgba(0, 0, 0, 0)'  // Transparent by default
                ],
                'fill-opacity': [
                  'case',
                  ['boolean', ['feature-state', 'isHighlighted'], false],
                  0.15,  // Changed from 0.3 to 0.15 for 50% transparency
                  0     // Transparent by default
                ]
              }
            });

            // Add Subdivision layer
            map.current.addLayer({
              'id': 'subdivision-boundaries',
              'type': 'fill',
              'source': 'subdivision-boundaries',
              'paint': {
                'fill-color': [
                  'case',
                  ['boolean', ['feature-state', 'hasSchool'], false],
                  '#0066ff',  // Blue for subdivision highlights
                  'rgba(0, 0, 0, 0)'  // Transparent by default
                ],
                'fill-opacity': [
                  'case',
                  ['boolean', ['feature-state', 'hasSchool'], false],
                  0.15,  // Changed from 0.3 to 0.15 for 50% transparency
                  0     // Transparent by default
                ]
              }
            });

            // Update hover handler to highlight both layers
            map.current.on('mousemove', 'miami-pois', (e) => {
              if (!e.features[0]) return;
              
              const point = e.point;
              
              // Query both layers
              const pmtFeatures = map.current.queryRenderedFeatures(
                point,
                { layers: ['pmt-boundaries'] }
              );

              const subdivFeatures = map.current.queryRenderedFeatures(
                point,
                { layers: ['subdivision-boundaries'] }
              );

              // Clear previous PMT highlight
              if (previouslyHighlightedPMT.current) {
                map.current.setFeatureState(
                  {
                    source: 'pmt-boundaries',
                    id: previouslyHighlightedPMT.current
                  },
                  { isHighlighted: false }
                );
              }

              // Clear previous subdivision highlight
              if (previouslyHighlightedSubdivision.current) {
                map.current.setFeatureState(
                  {
                    source: 'subdivision-boundaries',
                    id: previouslyHighlightedSubdivision.current
                  },
                  { hasSchool: false }
                );
              }

              // Set new PMT highlight
              if (pmtFeatures[0]) {
                previouslyHighlightedPMT.current = pmtFeatures[0].id;
                map.current.setFeatureState(
                  {
                    source: 'pmt-boundaries',
                    id: pmtFeatures[0].id
                  },
                  { isHighlighted: true }
                );
              }

              // Set new subdivision highlight
              if (subdivFeatures[0]) {
                previouslyHighlightedSubdivision.current = subdivFeatures[0].id;
                map.current.setFeatureState(
                  {
                    source: 'subdivision-boundaries',
                    id: subdivFeatures[0].id
                  },
                  { hasSchool: true }
                );
              }
            });

            // Update mouseleave to clear both highlights
            map.current.on('mouseleave', 'miami-pois', () => {
              if (previouslyHighlightedPMT.current) {
                map.current.setFeatureState(
                  {
                    source: 'pmt-boundaries',
                    id: previouslyHighlightedPMT.current
                  },
                  { isHighlighted: false }
                );
                previouslyHighlightedPMT.current = null;
              }

              if (previouslyHighlightedSubdivision.current) {
                map.current.setFeatureState(
                  {
                    source: 'subdivision-boundaries',
                    id: previouslyHighlightedSubdivision.current
                  },
                  { hasSchool: false }
                );
                previouslyHighlightedSubdivision.current = null;
              }
            });

          } catch (error) {
            console.error('Error creating density layers:', error);
          }
        };

        // Call this after adding POI layer
        createPOIDensityLayers();

      }

      // Initialize power grid
      initializePowerGrid(map.current);

      // Initialize particle system
      initializeParticleLayers(map.current);
      
      // Start animation loop
      const animate = () => {
        animateParticles({ 
          map: map.current, 
          frameCount: frameCount.current, 
          lastAnimationTime, 
          animationFrame 
        });
        frameCount.current++;
        animationFrame.current = requestAnimationFrame(animate);
      };

      // Start animation after a short delay
      setTimeout(() => {
        console.log('Starting animation loop');
        animate();
      }, 1000);

    } catch (error) {
      console.error('Error initializing layers:', error);
    }
  }, [map]);

  useEffect(() => {
    if (map.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_CONFIG.style,
      center: MAP_CONFIG.center,
      zoom: MAP_CONFIG.zoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom
    });

    const cleanup = setupMapEventListeners(map.current, {
      onLoad: () => {
        initializeLayers();
      }
    });

    return () => {
      console.log('🗺️ Map cleanup triggered');
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      cleanup();
    };
  }, [initializeLayers, isSelectingArea]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (hoverPopup) {
        hoverPopup.remove();
        setHoverPopup(null);
      }
    };
  }, [hoverPopup]);

  // Add function to highlight buildings near POIs
  const highlightPOIBuildings = (poiTypes, highlightColor = '#FF4500') => {
    if (!map.current) return;

    // Store the highlighted buildings data globally
    const storedHighlights = {
      buildings: new Map(),
      color: highlightColor,
      poiTypes: poiTypes
    };

    // Clear any previous highlights
    if (previousHighlight.current) {
      previousHighlight.current.forEach(buildingId => {
        map.current.setFeatureState(
          { source: 'composite', sourceLayer: 'building', id: buildingId },
          { isHighlighted: false }
        );
      });
    }

    // Convert input types to Mapbox POI categories
    const mapboxPoiTypes = poiTypes.map(type => {
      switch(type.toLowerCase()) {
        case 'restaurant': return ['Restaurant', 'Fast Food', 'Cafe'];
        case 'bar': return ['Bar', 'Pub'];
        case 'nightclub': return ['Nightclub', 'Club'];
        default: return type;
      }
    }).flat();

    console.log('Searching for POI types:', mapboxPoiTypes);

    // Query for buildings and POIs in the current view
    const buildings = map.current.queryRenderedFeatures({
      layers: ['3d-buildings']
    });

    const pois = map.current.queryRenderedFeatures({
      layers: ['miami-pois']
    });

    console.log('All POIs found:', pois.map(p => p.properties.type));

    // Filter POIs by type
    const relevantPois = pois.filter(poi => 
      mapboxPoiTypes.includes(poi.properties.type)
    );

    console.log('Found relevant POIs:', relevantPois.length, 'Buildings:', buildings.length);

    // Create a map to store building IDs and their POI counts
    const buildingPOIs = new Map();

    relevantPois.forEach(poi => {
      const poiCoord = poi.geometry.coordinates;
      
      // Find the closest building to this POI
      buildings.forEach(building => {
        if (building.geometry.coordinates && building.geometry.coordinates[0]) {
          const buildingCoords = building.geometry.coordinates[0];
          
          // Check if POI is within or very close to building polygon
          const isNearby = buildingCoords.some(coord => {
            const distance = Math.sqrt(
              Math.pow(coord[0] - poiCoord[0], 2) + 
              Math.pow(coord[1] - poiCoord[1], 2)
            );
            return distance < 0.0002; // This threshold might be too large
          });

          if (isNearby && building.id) {
            buildingPOIs.set(building.id, (buildingPOIs.get(building.id) || 0) + 1);
          }
        }
      });
    });

    console.log('Buildings with POIs:', buildingPOIs);

    // Store the building POIs in the global storage
    storedHighlights.buildings = buildingPOIs;
    highlightedBuildingsData.current = storedHighlights;

    // Create heat map data points from POIs
    const heatMapFeatures = relevantPois.map(poi => ({
      type: 'Feature',
      properties: {
        poiCount: buildingPOIs.get(poi.id) || 1
      },
      geometry: {
        type: 'Point',
        coordinates: poi.geometry.coordinates
      }
    }));

    // Update heat map source
    if (map.current.getSource('poi-heat')) {
      map.current.getSource('poi-heat').setData({
        type: 'FeatureCollection',
        features: heatMapFeatures
      });
    }

    // Adjust heat map intensity based on Claude's response
    const applyHighlights = () => {
      if (!highlightedBuildingsData.current) return;
      
      const { buildings } = highlightedBuildingsData.current;
      
      // Update the 3D buildings layer paint properties
      if (map.current.getLayer('3d-buildings')) {
        map.current.setPaintProperty('3d-buildings', 'fill-extrusion-color', [
          'case',
          ['boolean', ['feature-state', 'isHighlighted'], false],
          [
            'interpolate',
            ['linear'],
            ['feature-state', 'poiCount'],
            1, '#FFB74D',  // Light orange for single POI
            5, '#FF4500'   // Deep orange for many POIs
          ],
          '#1a1a1a'  // Much darker gray for non-highlighted buildings
        ]);
      }

      // Apply the highlight state to the buildings
      buildings.forEach((poiCount, buildingId) => {
        map.current.setFeatureState(
          { source: 'composite', sourceLayer: 'building', id: buildingId },
          { 
            isHighlighted: true,
            poiCount: poiCount
          }
        );
      });

      // Update heat map intensity based on POI density
      const maxPoiCount = Math.max(...Array.from(buildingPOIs.values()));
      const intensityFactor = Math.min(maxPoiCount / 3, 2); // Cap at 2x intensity

      map.current.setPaintProperty('poi-heat', 'heatmap-intensity', [
        'interpolate',
        ['linear'],
        ['zoom'],
        12, 0.5 * intensityFactor,
        15, 1.5 * intensityFactor
      ]);
    };

    // Apply highlights initially
    applyHighlights();

    // Remove existing handlers if any
    if (moveHandler.current) {
      map.current.off('moveend', moveHandler.current);
    }
    if (zoomHandler.current) {
      map.current.off('zoom', zoomHandler.current);
    }

    // Add handlers for both zoom and movement
    moveHandler.current = applyHighlights;
    zoomHandler.current = applyHighlights;
    
    map.current.on('moveend', moveHandler.current);
    map.current.on('zoom', zoomHandler.current);

    // Inside your handleBuildingClick function where animation starts
    if (highlightedBuildingsData.current?.buildings?.size > 0) {
        if (animationFrame.current) {
            cancelAnimationFrame(animationFrame.current);
        }
        
        animationFrame.current = requestAnimationFrame(() => 
            animateParticles({ 
                map: map.current,
                highlightedBuildings: highlightedBuildingsData.current
            })
        );
    }
  };

  // Add this useEffect for circle layers
  useEffect(() => {
    if (!map.current) return;

    const initializeAreaHighlights = () => {
      // Add a source for the area circles
      map.current.addSource('area-highlights', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      // Add circle layer
      map.current.addLayer({
        id: 'area-circles',
        type: 'circle',
        source: 'area-highlights',
        paint: {
          'circle-radius': 100,
          'circle-color': '#FF4500',
          'circle-opacity': 0.2,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FF4500'
        }
      });

      // Add hover effects
      map.current.on('mouseenter', 'area-circles', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', 'area-circles', () => {
        map.current.getCanvas().style.cursor = '';
      });

      // Add click handler
      map.current.on('click', 'area-circles', (e) => {
        if (!e.features[0]) return;
        
        const properties = e.features[0].properties;
        const coordinates = e.features[0].geometry.coordinates;

        new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(`
            <h3>${properties.name}</h3>
            <p>${properties.description}</p>
          `)
          .addTo(map.current);
      });
    };

    map.current.once('load', initializeAreaHighlights);
  }, []);

  // Update the click handler useEffect
  useEffect(() => {
    if (!map.current || clickHandlerInitialized) return;

    const handleGEOIDClick = (e) => {
      e.preventDefault?.(); // Optional chaining in case preventDefault doesn't exist
      
      if (e.originalEvent) {
        e.originalEvent.preventDefault();
        e.originalEvent.stopPropagation();
        e.originalEvent.stopImmediatePropagation();
      }
      
      // Cancel the event in Mapbox
      e.cancel();
      
      // Get the clicked GEOID feature if needed
      const features = map.current.queryRenderedFeatures(e.point, {
        layers: brickellGEOIDs.map(id => `hatched-area-${id}`)
      });
      
      if (features.length > 0) {
        console.log('🎯 Clicked GEOID layer:', features[0].properties.GEOID);
      }

      // Prevent map interaction
      map.current.dragPan.disable();
      map.current.scrollZoom.disable();
      
      // Re-enable after a short delay
      setTimeout(() => {
        map.current.dragPan.enable();
        map.current.scrollZoom.enable();
      }, 300);

      return false;
    };

    // Make sure we initialize the handlers after the layers are added
    const initializeHandlers = () => {
      // Add click handlers for each GEOID layer
      brickellGEOIDs.forEach(geoid => {
        const layerId = `hatched-area-${geoid}`;
        if (map.current.getLayer(layerId)) {
          // Remove any existing handlers first
          map.current.off('click', layerId, handleGEOIDClick);
          // Add the click handler
          map.current.on('click', layerId, handleGEOIDClick);
        }
      });

      // Also prevent zoom when clicking the PMT boundaries
      if (map.current.getLayer('pmt-boundaries')) {
        map.current.off('click', 'pmt-boundaries');
        map.current.on('click', 'pmt-boundaries', (e) => {
          e.preventDefault?.();
          e.cancel();
          
          if (e.originalEvent) {
            e.originalEvent.preventDefault();
            e.originalEvent.stopPropagation();
            e.originalEvent.stopImmediatePropagation();
          }

          // Temporarily disable map interactions
          map.current.dragPan.disable();
          map.current.scrollZoom.disable();
          
          setTimeout(() => {
            map.current.dragPan.enable();
            map.current.scrollZoom.enable();
          }, 300);

          return false;
        });
      }
    };

    // Initialize handlers when map is loaded
    if (map.current.loaded()) {
      initializeHandlers();
    } else {
      map.current.once('load', initializeHandlers);
    }

    setClickHandlerInitialized(true);

    // Cleanup function
    return () => {
      if (map.current) {
        brickellGEOIDs.forEach(geoid => {
          const layerId = `hatched-area-${geoid}`;
          if (map.current.getLayer(layerId)) {
            map.current.off('click', layerId, handleGEOIDClick);
          }
        });
        map.current.off('click', 'pmt-boundaries');
      }
    };
  }, [map.current, clickHandlerInitialized]);

  useEffect(() => {
    if (map.current && !poiToggleRef.current) {
      poiToggleRef.current = createPOIToggle(
        map, 
        map.current.getContainer(),
        showPOIMarkers
      );
    }

    return () => {
      if (poiToggleRef.current) {
        poiToggleRef.current.cleanup();
        poiToggleRef.current = null;
      }
    };
  }, [map.current]);

  // Update toggle when state changes
  useEffect(() => {
    if (poiToggleRef.current) {
      poiToggleRef.current.setVisibility(showPOIMarkers);
    }
  }, [showPOIMarkers]);

  // Move the event listeners into a useEffect
  useEffect(() => {
    if (!map.current) return;

    const handlePMTClick = (e) => {
        console.log('🎯 Click detected on map');
        
        const clearExistingElements = () => {
            const existingMarkers = document.querySelectorAll('.mapboxgl-marker');
            existingMarkers.forEach(marker => marker.remove());
            
            const existingCallouts = document.querySelectorAll('.callout-annotation');
            existingCallouts.forEach(callout => callout.remove());
            
            if (map.current.getSource('area-highlights')) {
                map.current.getSource('area-highlights').setData({
                    type: 'FeatureCollection',
                    features: []
                });
            }

            if (map.current.getLayer('area-highlights-outline')) {
                map.current.removeLayer('area-highlights-outline');
            }
        };

        clearExistingElements();
        
        const features = map.current.queryRenderedFeatures(e.point, {
            layers: ['pmt-boundaries']
        });
        
        if (features.length > 0) {
            const clickedFeature = features[0];
            console.log('🎯 Clicked GEOID:', clickedFeature.properties.GEOID);
            console.log('📍 Feature properties:', clickedFeature.properties);
        }
        
        const brickellCenter = [-80.2088, 25.7647];
        const zoomLevel = 13.8;
        
        console.log('🎯 Zooming to Brickell:', brickellCenter);

        map.current.flyTo({
            center: brickellCenter,
            zoom: zoomLevel,
            duration: 1000,
            essential: true
        });

        map.current.once('moveend', () => {
          map.current.once('idle', () => {
            if (map.current.getLayer('pmt-boundaries')) {
              currentFilter.current = ['in', ['get', 'GEOID'], ['literal', brickellGEOIDs]];
              map.current.setFilter('pmt-boundaries', currentFilter.current);
              
              // Show PMT boundaries
              map.current.setLayoutProperty('pmt-boundaries', 'visibility', 'visible');
              map.current.setPaintProperty('pmt-boundaries', 'fill-color', 'rgba(0, 0, 0, 0)');
              map.current.setPaintProperty('pmt-boundaries', 'fill-outline-color', '#FF4500');
              map.current.setPaintProperty('pmt-boundaries', 'fill-opacity', 1);

                    setTimeout(() => {
                        // Initialize GEOID layers (patterns are now handled internally)
                        initializeGEOIDLayer(map.current);
                        
                        // Add tags after initialization
                        setTimeout(() => {
                            addGeoIdTags(map.current, brickellGEOIDs, setIsGeoIDVisible);
                            console.log('🏷️ GEOID tags added');
                        }, 500);
                    }, 200);

                    // Hide other layers
                    ['subdivision-boundaries', 'area-circles', 'area-highlights-outline'].forEach(layer => {
                        if (map.current.getLayer(layer)) {
                            map.current.setLayoutProperty(layer, 'visibility', 'none');
                        }
                    });
                }
            });
        });
    };

    const handlePMTMouseLeave = () => {
        if (map.current && currentFilter.current) {
            map.current.setFilter('pmt-boundaries', currentFilter.current);
        }
    };

    // Set up event listeners
    map.current.on('click', 'pmt-boundaries', handlePMTClick);
    map.current.on('mouseleave', 'pmt-boundaries', handlePMTMouseLeave);

    // Cleanup function
    return () => {
        if (map.current) {
            map.current.off('click', 'pmt-boundaries', handlePMTClick);
            map.current.off('mouseleave', 'pmt-boundaries', handlePMTMouseLeave);
        }
    };
}, [map.current]);

  // Update the map initialization useEffect
  useEffect(() => {
    if (!map.current) return;

    map.current.on('load', () => {
      initializePOILayers(map.current);
      setPoiLayerInitialized(true);
      setupAnimation(map.current, setIsGeoIDVisible);
    });
  }, [map.current]);

  const applyHighlights = () => {
    if (!map.current || !poiLayerInitialized) return;
    applyPOIHighlights(map.current);
  };

  // Add this helper function
  const getBrickellChatResponse = () => {
    return {
      action: "navigate",
      coordinates: [-80.1998, 25.765],
      zoomLevel: 15,
      quickActions: [
        {
          text: "Demographic Stats",
          prompt: "SHOW_BRICKELL_DEMOGRAPHICS",
          icon: "📊",
          description: "Income, age, education data"
        },
        {
          text: "Historical Trends",
          prompt: "SHOW_BRICKELL_HISTORY", 
          icon: "📈",
          description: "Development since 2010"
        },
        {
          text: "AI Predictions",
          prompt: "SHOW_BRICKELL_FORECAST",
          icon: "🔮", 
          description: "Growth forecast 2024-2025"
        }
      ],
      preGraphText: "As we saw in the economic trends, Brickell has emerged as Miami's premier dining destination. Let's take a closer look at what makes this area special.",
      postGraphText: "The data shows a remarkable concentration of high-end establishments, with over 45 restaurants and bars in this district alone. The area's rapid growth has attracted both Michelin-starred chefs and innovative local restaurateurs.",
      poiInfo: {
        pmtId: "brickell_pmt",
        subdivisionId: "brickell_main",
        poiCount: 45,
        poiTypes: ["restaurant", "bar", "nightclub", "cafe"]
      },
      followUpSuggestions: [
        {
          text: "Show me the rooftop bars",
          prompt: "Show rooftop bars in Brickell"
        },
        {
          text: "Find fine dining spots",
          prompt: "List upscale restaurants in Brickell"
        },
        {
          text: "Compare to South Beach",
          prompt: "Compare Brickell vs South Beach restaurants"
        }
      ]
    };
  };

  // Update the handlePMTClick function
  const handlePMTClick = (e) => {
    if (e.features[0].properties.name === "Brickell") {
      // Add the chat message
      const brickellResponse = getBrickellChatResponse();
      setMessages(prev => [...prev, {
        isUser: false,
        content: brickellResponse
      }]);

      // Handle map navigation and highlighting
      handleLLMResponse(brickellResponse);
    }
  };

  // Inside your click handler where the callout is clicked
  const handleCalloutClick = () => {
    console.log('🎯 Callout clicked - showing Brickell demographics');
    
    // Create the demographics message
    const demographicsMessage = {
      action: "showDemographics",
      preGraphText: "Here's a demographic breakdown of Brickell:",
      postGraphText: "Brickell's population has grown significantly:\n\n" +
                   "• Current Population: 32,547\n" +
                   "• Median Age: 34\n" +
                   "• Household Income: $121,500\n" +
                   "• Population Density: 27,890/sq mi\n" +
                   "• Growth Rate: +12.4% (2023)\n\n" +
                   "This makes it one of Miami's fastest-growing urban cores.",
      quickActions: [
        {
          text: "Compare to South Beach",
          prompt: "COMPARE_BRICKELL_SOUTH_BEACH",
          icon: "↗",
          description: "Population comparison"
        },
        {
          text: "Show Growth Trends",
          prompt: "SHOW_BRICKELL_GROWTH",
          icon: "📈",
          description: "Historical growth data"
        },
        {
          text: "Future Forecast",
          prompt: "SHOW_FUTURE_TRENDS",
          icon: "🔮",
          description: "2024 projections"
        }
      ]
    };
    
    // Add to messages state directly
    setMessages(prev => [...prev, {
      isUser: false,
      content: demographicsMessage
    }]);
    
    console.log('💬 Added demographics message to chat');
  };

  // Update the useEffect to properly attach the click handler
  useEffect(() => {
    const addCalloutClickHandler = () => {
      const callout = document.querySelector('.callout-annotation');
      if (callout) {
        console.log('🎯 Adding click handler to callout');
        callout.addEventListener('click', handleCalloutClick);
        
        // Make sure cursor changes on hover
        callout.style.cursor = 'pointer';
      }
    };
    
    // Add handler initially
    addCalloutClickHandler();
    
    // Also add handler whenever map moves/zooms
    if (map.current) {
      map.current.on('moveend', addCalloutClickHandler);
      map.current.on('zoomend', addCalloutClickHandler);
    }
    
    return () => {
      const callout = document.querySelector('.callout-annotation');
      if (callout) {
        callout.removeEventListener('click', handleCalloutClick);
      }
      if (map.current) {
        map.current.off('moveend', addCalloutClickHandler);
        map.current.off('zoomend', addCalloutClickHandler);
      }
    };
  }, []);

  // Update the existing useEffect for GEOID visibility
  useEffect(() => {
    console.log('🔄 isGeoIDVisible state changed:', isGeoIDVisible);
  }, [isGeoIDVisible]);

  // Update useEffect for GEOID visibility
  useEffect(() => {
    if (!map.current) return;
    
    if (isGeoIDVisible) {
        // Initialize GEOID particles first
        initializeGEOIDParticleLayers(map.current);
        
        // Start animation
        window.geoIdAnimationFrame = animateGEOIDParticles({
            map: map.current,
            geoIdFeatures: brickellGEOIDs,
            isActive: true
        });
    } else {
        // Stop and cleanup animation
        stopGEOIDAnimation(map.current);
    }

    // Cleanup function
    return () => {
        if (window.geoIdAnimationFrame) {
            cancelAnimationFrame(window.geoIdAnimationFrame);
            window.geoIdAnimationFrame = null;
        }
        if (map.current) {
            stopGEOIDAnimation(map.current);
        }
    };
}, [isGeoIDVisible]);

  // Update handleExploreGrid function
  const handleExploreGrid = () => {
    if (map.current) {
        // First ensure GEOID animation is stopped
        setIsGeoIDVisible(false);
        stopGEOIDAnimation(map.current);
        
        // Remove any existing particle layers
        if (map.current.getLayer('geoid-particles')) {
            map.current.removeLayer('geoid-particles');
        }
        if (map.current.getSource('geoid-particles')) {
            map.current.removeSource('geoid-particles');
        }
        
        // Then transition to grid view
        transitionToGridView(map.current);
        
        // Highlight POI buildings
        highlightPOIBuildings(['substation', 'transformer', 'solar_array', 'smart_meter']);
        
        handleQuestion("SHOW_BRICKELL_GRID");
    }
  };

  // Modify the handleLLMResponse function
  const handleLLMResponse = (response) => {
    if (!map.current) return;

    // Clear existing popups, markers and highlights
    const clearExistingElements = () => {
      const existingPopups = document.querySelectorAll('.mapboxgl-popup');
      existingPopups.forEach(popup => popup.remove());
      
      const existingCallouts = document.querySelectorAll('.callout-annotation');
      existingCallouts.forEach(callout => callout.remove());
      
      // Clear all mapboxgl markers
      const markers = document.querySelectorAll('.mapboxgl-marker');
      markers.forEach(marker => marker.remove());
      
      // Clear area highlights source
      if (map.current.getSource('area-highlights')) {
        map.current.getSource('area-highlights').setData({
          type: 'FeatureCollection',
          features: []
        });
      }
    };

    if (response?.action === 'showMultipleLocations' && response.locations) {
      clearExistingElements();
      
      // Clear area highlights immediately
      if (map.current.getSource('area-highlights')) {
        map.current.getSource('area-highlights').setData({
          type: 'FeatureCollection',
          features: []
        });
      }

      // Remove highlight outline layer if it exists
      if (map.current.getLayer('area-highlights-outline')) {
        map.current.removeLayer('area-highlights-outline');
      }

      const source = map.current.getSource('area-highlights');
      if (!source) {
        console.warn('Area highlights source not initialized');
        return;
      }

      // Create features for the circles
      const features = response.locations.map(location => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: location.coordinates
        },
        properties: {
          name: location.name,
          description: location.description
        }
      }));

      // Add the circle layer with orange outline
      if (!map.current.getLayer('area-highlights-outline')) {
        map.current.addLayer({
          'id': 'area-highlights-outline',
          'type': 'circle',
          'source': 'area-highlights',
          'paint': {
            'circle-radius': 100,
            'circle-color': 'transparent',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FF4500',
            'circle-opacity': 0.8
          }
        });
      }

     
      // Update the source data
      source.setData({
        type: 'FeatureCollection',
        features: features
      });

      // Add location markers (modified to remove popups)
      features.forEach(feature => {
        const marker = new mapboxgl.Marker({
          color: "#FF4500"
        })
          .setLngLat(feature.geometry.coordinates)
          .addTo(map.current);
      });

      // Add callouts for each location
      features.forEach(feature => {
        const location = response.locations.find(loc => loc.name === feature.properties.name);
        if (!location) return;

        const calloutHTML = document.createElement('div');
        calloutHTML.className = 'callout-annotation';
        calloutHTML.innerHTML = `
          <div style="
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 15px;
            border-radius: 8px;
            max-width: 300px;
            position: relative;
            font-family: 'SF Mono', monospace;
            font-size: 14px;
            line-height: 1.4;
          ">
            <div style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 8px;
            ">
              <h3 style="
                margin: 0;
                color: white;
                font-size: 16px;
                font-weight: 500;
              ">${location.name}</h3>
              <span style="display: flex; gap: 12px; color: #FF4500;">
                ${location.icons.square ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/></svg>' : ''}
                ${location.icons.chart ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z"/></svg>' : ''}
                ${location.icons.circle ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>' : ''}
              </span>
            </div>
            <div style="
              font-size: 13px;
              color: rgba(255, 255, 255, 0.8);
              margin-top: 12px;
              padding-left: 8px;
              border-left: 2px solid rgba(76, 175, 80, 0.5);
            ">${location.callout.details.join('<br>')}</div>
          </div>
        `;

        // Add the callout with proper positioning
        new mapboxgl.Marker({
          element: calloutHTML,
          anchor: 'left',
        })
          .setLngLat(feature.geometry.coordinates)
          .setOffset([100, location.name === "Brickell" ? 100 : -100])
          .addTo(map.current);
      });

      // Fit map to show both locations
      if (response.viewBounds) {
        map.current.fitBounds([
          response.viewBounds.sw,
          response.viewBounds.ne
        ], {
          padding: 50,
          duration: 2000
        });
      }
    } else if (response?.coordinates) {
      // Clear everything immediately
      clearExistingElements();
      
      // Clear area highlights immediately
      if (map.current.getSource('area-highlights')) {
        map.current.getSource('area-highlights').setData({
          type: 'FeatureCollection',
          features: []
        });
      }

      // Then proceed with zooming
      if (mapState.clickState.blockAllClicks || mapState.clickState.blockZoom) {
        console.log('🚫 Skipping zoom - interaction in progress');
        return;
      }

      console.log('🎯 Zooming to Brickell:', response.coordinates);
      map.current.flyTo({
        center: response.coordinates,
        zoom: response.zoomLevel,
        duration: 1000
      });

      // Wait for the map to finish moving
      map.current.once('moveend', () => {
        map.current.once('idle', () => {
          // Dim all GEOID layers after zoom completes
          getAllGEOIDLayerIds().forEach((layerId) => {
            if (map.current.getLayer(layerId)) {
              let startTime = performance.now();
              const animationDuration = 500;

              function animate(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / animationDuration, 1);
                
                // Changed from 0.7 to 0.5 to make the layer more visible
                const newOpacity = Math.max(0, 1 - (progress * 0.6));

                map.current.setPaintProperty(
                  layerId,
                  'fill-opacity',
                  newOpacity
                );

                if (progress < 1) {
                  requestAnimationFrame(animate);
                }
              }

              requestAnimationFrame(animate);
            }
          });

          // After dimming GEOIDs, highlight buildings with POIs
          highlightPOIBuildings(['restaurant', 'bar', 'nightclub'], '#FF4500');
          
          // Turn off POI markers after highlighting buildings
          setShowPOIMarkers(false);
          if (map.current) {
            map.current.setLayoutProperty('miami-pois', 'visibility', 'none');
          }
        });
      });
    }
  };

  const handleOpacityTransition = useCallback(() => {
    map.current.once('moveend', () => {
      map.current.once('idle', () => {
        // Dim all GEOID layers after zoom completes
        getAllGEOIDLayerIds().forEach((layerId) => {
          if (map.current.getLayer(layerId)) {
            let startTime = performance.now();
            const animationDuration = 500;

            function animate(currentTime) {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / animationDuration, 1);
              const newOpacity = Math.max(0, 1 - (progress * 0.5));

              map.current.setPaintProperty(
                layerId,
                'fill-opacity',
                newOpacity
              );

              if (progress < 1) {
                requestAnimationFrame(animate);
              }
            }

            requestAnimationFrame(animate);
          }
        });

        // After dimming GEOIDs, highlight buildings with POIs
        highlightPOIBuildings(['restaurant', 'bar', 'nightclub'], '#FF4500');
        
        // Turn off POI markers after highlighting buildings
        setShowPOIMarkers(false);
        if (map.current) {
          map.current.setLayoutProperty('miami-pois', 'visibility', 'none');
        }
      });
    });
  }, []);

  return (
    <MapContainer>
      <div 
        ref={mapContainer} 
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }} 
      />
      
      <AIChatPanel 
        messages={messages}
        setMessages={setMessages}
        isLoading={isLoading}
        loadingMessage={loadingMessage}
        inputValue={inputValue}
        setInputValue={setInputValue}
        handleQuestion={handleQuestion}
        map={map}
      />
    </MapContainer>
  );
};

export default MapComponent;

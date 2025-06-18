import React, { useRef, useEffect, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import BuildingPopup from './BuildingPopup';
import { createRoot } from 'react-dom/client';
import { MAP_CONFIG, BUILDING_COLORS } from './constants';
import { 
    initializeParticleLayers, 
    initializePowerGrid, 
    animateParticles 
} from './hooks/mapAnimations';
import { askClaude, parseClaudeResponse } from '../../services/claude';
import styled from 'styled-components';
import AIChatPanel from './AIChatPanel';
import { 
  calculateBuildingArea,
  setupMapEventListeners
} from './utils';
import { initializeMap } from './utils';  // Add this import

// Add this line to set the access token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

const MapContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

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
      map.current.setLayoutProperty('area-circle', 'visibility', 'none');
      setIsSelectingArea(false);
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

        // Hover effect for subdivision highlighting
        map.current.on('mousemove', 'miami-pois', (e) => {
          if (!e.features[0]) {
            if (hoverPopup) {
              hoverPopup.remove();
              setHoverPopup(null);
            }
            return;
          }
          
          const point = e.point;
          
          if (hoverPopup) {
            hoverPopup.remove();
            setHoverPopup(null);
          }

          // Query both boundary layers
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

          // Count POIs in each boundary
          let pmtPOICount = 0;
          let subdivPOICount = 0;

          if (pmtFeatures[0] || subdivFeatures[0]) {
            // Get all POIs in view
            const allPOIs = map.current.queryRenderedFeatures(
              undefined,
              { layers: ['miami-pois'] }
            );

            // Count POIs in PMT boundary
            if (pmtFeatures[0]) {
              pmtPOICount = allPOIs.filter(poi => {
                const poiPoint = poi.geometry.coordinates;
                return map.current.queryRenderedFeatures(
                  map.current.project(poiPoint),
                  { layers: ['pmt-boundaries'] }
                ).some(f => f.id === pmtFeatures[0].id);
              }).length;
            }

            // Count POIs in Subdivision boundary
            if (subdivFeatures[0]) {
              subdivPOICount = allPOIs.filter(poi => {
                const poiPoint = poi.geometry.coordinates;
                return map.current.queryRenderedFeatures(
                  map.current.project(poiPoint),
                  { layers: ['subdivision-boundaries'] }
                ).some(f => f.id === subdivFeatures[0].id);
              }).length;
            }

            const newPopup = new mapboxgl.Popup({
              closeButton: true,
              closeOnClick: true,
              closeOnMove: true,
              className: 'boundary-stats-popup',
              offset: [0, -5]
            })
              .setLngLat(e.lngLat)
              .setHTML(`
                <div class="boundary-stats" style="cursor: pointer;" onclick="this.parentElement.parentElement.remove()">
                  ${pmtFeatures[0] ? `
                    <div class="pmt-stats">
                      <span class="stat-label">Census Tract POIs:</span>
                      <span class="stat-value">${pmtPOICount}</span>
                    </div>
                  ` : ''}
                  ${subdivFeatures[0] ? `
                    <div class="subdiv-stats">
                      <span class="stat-label">Local Area POIs:</span>
                      <span class="stat-value">${subdivPOICount}</span>
                    </div>
                  ` : ''}
                </div>
              `)
              .addTo(map.current);

            // Add click handler to the popup
            newPopup.on('close', () => {
              setHoverPopup(null);
            });

            setHoverPopup(newPopup);
          }
        });

        // Add a more aggressive mouseleave handler
        map.current.on('mouseleave', 'miami-pois', () => {
          if (hoverPopup) {
            hoverPopup.remove();
            setHoverPopup(null);
          }
        });

        // Add a general map move handler to ensure popup is removed
        map.current.on('move', () => {
          if (hoverPopup) {
            hoverPopup.remove();
            setHoverPopup(null);
          }
        });

        // Click event for showing POI details
        map.current.on('click', 'miami-pois', (e) => {
          if (!e.features[0]) return;
          
          const poiCoordinates = e.features[0].geometry.coordinates;
          const properties = e.features[0].properties;

          // Show detailed popup on click
          const popup = createPopup(e.features[0]);
          popup.addTo(map.current);
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

  // When creating the popup, add a click handler to the content
  const createPopup = (feature) => {
    const popup = new mapboxgl.Popup({
      closeButton: false, // Disable the close button
      closeOnClick: true  // Close when popup is clicked
    })
    .setLngLat(feature.geometry.coordinates)
    .setHTML(`
      <div class="poi-popup-title">${feature.properties.name || 'Unnamed Location'}</div>
      <div class="poi-popup-detail">${feature.properties.type || 'Point of Interest'}</div>
    `);

    // Add click handler to the popup content
    popup.on('open', () => {
      const popupContent = document.querySelector('.mapboxgl-popup-content');
      if (popupContent) {
        popupContent.addEventListener('click', () => {
          popup.remove();
        });
      }
    });

    return popup;
  };

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

    // Function to apply highlights
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

  // Keep handleLLMResponse in the map component since it handles map-specific effects
  const handleLLMResponse = (response) => {
    if (response?.coordinates) {
      map.current.flyTo({
        center: response.coordinates,
        zoom: response.zoomLevel || 14,
        duration: 2000
      });

      map.current.once('moveend', () => {
        // Wait a bit more for tiles to finish loading
        map.current.once('idle', () => {
          // After map settles, highlight buildings with POIs
          highlightPOIBuildings(['restaurant', 'bar', 'nightclub'], '#FF4500');
          // Turn off POI markers after highlighting buildings
          setShowPOIMarkers(false);
          if (map.current) {
            map.current.setLayoutProperty('miami-pois', 'visibility', 'none');
            
            // Create Next button popup
            const popup = new mapboxgl.Popup({
              closeButton: false,
              className: 'next-step-popup'
            })
            .setLngLat(response.coordinates)
            .setHTML(`
              <div style="
                background: rgba(255, 69, 0, 0.9);
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                color: white;
                font-weight: 600;
              ">
                Next →
              </div>
            `)
            .addTo(map.current);
            
            // Add click handler to the Next button
            popup.getElement().addEventListener('click', () => {
              popup.remove();
              
              // After clicking Next, proceed with building selection and zoom
              if (highlightedBuildingsData.current) {
                const { buildings } = highlightedBuildingsData.current;
                
                // Get the building with the most POIs
                let maxPOIs = 0;
                let representativeBuildingId = null;
                buildings.forEach((count, id) => {
                  if (count > maxPOIs) {
                    maxPOIs = count;
                    representativeBuildingId = id;
                  }
                });
                
                if (representativeBuildingId) {
                  const buildingFeatures = map.current.queryRenderedFeatures({
                    layers: ['3d-buildings'],
                    filter: ['==', ['id'], representativeBuildingId]
                  });
                  
                  if (buildingFeatures.length > 0) {
                    const buildingCenter = buildingFeatures[0].geometry.coordinates[0][0];
                    
                    // Second zoom to the selected building
                    map.current.flyTo({
                      center: buildingCenter,
                      zoom: 16,
                      pitch: 45,
                      bearing: -30,
                      duration: 1500
                    });
                    
                    // Start particle animations
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
                }
              }
            });
          }
        });
      });
    }
  };

  // Add this function to handle building clicks
  const handleBuildingClick = (e) => {
    console.log('🎯 Click detected on map');
    
    if (!map.current || !highlightedBuildingsData.current) {
      console.log('❌ Map or highlighted buildings data not available');
      return;
    }

    const features = map.current.queryRenderedFeatures(e.point, {
      layers: ['3d-buildings']
    });
    
    console.log('🏢 Buildings found at click point:', features.length);
    console.log('🎨 Current highlighted buildings:', 
      Array.from(highlightedBuildingsData.current.buildings.keys())
    );

    // If we found a building
    if (features.length > 0) {
      const clickedBuildingId = features[0].id;
      console.log('🏗️ Clicked building ID:', clickedBuildingId);
      console.log('✨ Is this building highlighted?', 
        highlightedBuildingsData.current.buildings.has(clickedBuildingId)
      );

      // If it's a highlighted building
      if (highlightedBuildingsData.current.buildings.has(clickedBuildingId)) {
        console.log('🎉 Clicked on a highlighted building! Showing boundaries...');
        
        // Ensure boundary layers are visible
        map.current.setLayoutProperty('pmt-boundaries', 'visibility', 'visible');
        map.current.setLayoutProperty('subdivision-boundaries', 'visibility', 'visible');
        
        const point = e.point;
        
        // Query boundaries
        const pmtFeatures = map.current.queryRenderedFeatures(
          point,
          { layers: ['pmt-boundaries'] }
        );
        const subdivFeatures = map.current.queryRenderedFeatures(
          point,
          { layers: ['subdivision-boundaries'] }
        );

        console.log('📍 Found PMT features:', pmtFeatures.length);
        console.log('📍 Found subdivision features:', subdivFeatures.length);

        // Clear previous highlights
        if (previouslyHighlightedPMT.current) {
          console.log('🔄 Clearing previous PMT highlight');
          map.current.setFeatureState(
            {
              source: 'pmt-boundaries',
              id: previouslyHighlightedPMT.current
            },
            { isHighlighted: false }
          );
        }

        if (previouslyHighlightedSubdivision.current) {
          console.log('🔄 Clearing previous subdivision highlight');
          map.current.setFeatureState(
            {
              source: 'subdivision-boundaries',
              id: previouslyHighlightedSubdivision.current
            },
            { hasSchool: false }
          );
        }

        // Set new highlights
        if (pmtFeatures[0]) {
          console.log('✨ Setting new PMT highlight');
          previouslyHighlightedPMT.current = pmtFeatures[0].id;
          map.current.setFeatureState(
            {
              source: 'pmt-boundaries',
              id: pmtFeatures[0].id
            },
            { isHighlighted: true }
          );
        }

        if (subdivFeatures[0]) {
          console.log('✨ Setting new subdivision highlight');
          previouslyHighlightedSubdivision.current = subdivFeatures[0].id;
          map.current.setFeatureState(
            {
              source: 'subdivision-boundaries',
              id: subdivFeatures[0].id
            },
            { hasSchool: true }
          );
        }
      } else {
        console.log('⚠️ Building found but not highlighted');
      }
    } else {
      console.log('⚠️ No building found at click point');
    }
  };

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
        onClick={(e) => {
          console.log('⚡ React onClick event on map container');
        }}
      />
      
      <AIChatPanel 
        messages={messages}
        isLoading={isLoading}
        loadingMessage={loadingMessage}
        inputValue={inputValue}
        setInputValue={setInputValue}
        handleQuestion={handleQuestion}
      />
      
      <label className="poi-toggle">
        <input
          type="checkbox"
          checked={showPOIMarkers}
          onChange={(e) => {
            setShowPOIMarkers(e.target.checked);
            if (map.current) {
              map.current.setLayoutProperty(
                'miami-pois',
                'visibility',
                e.target.checked ? 'visible' : 'none'
              );
            }
          }}
        />
        Show POI Markers
      </label>
    </MapContainer>
  );
};

export default MapComponent;

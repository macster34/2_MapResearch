import React, { useRef, useEffect, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import BuildingPopup from './BuildingPopup';
import { createRoot } from 'react-dom/client';
import { 
    POWER_SUBSTATIONS_MIAMI, 
    BUILDING_COLORS,
    MAP_CONFIG,
    MIAMI_BOUNDS
} from './constants';
import { 
    initializeParticleLayers, 
    initializePowerGrid, 
    animateParticles 
} from './hooks/mapAnimations';
import { hexGrid, booleanPointInPolygon } from '@turf/turf';
import { analyzeCensusData } from './hooks/useCensusData';
import { AINavigator } from './hooks/useAINavigator';
import { askClaude } from '../../services/claude';
import styled from 'styled-components';

// Add this line to set the access token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

console.log('Mapbox Token:', process.env.REACT_APP_MAPBOX_ACCESS_TOKEN ? 'Token exists' : 'No token found');

// Basic styles for popup and markers
const style = document.createElement('style');
document.head.appendChild(style);
style.textContent = `
  .mapboxgl-popup {
    z-index: 3000 !important;
  }
  .custom-marker {
    transform: translate(-50%, -50%);
  }
  .mapboxgl-popup-content {
    background: rgba(30, 30, 30, 0.9) !important;
    color: #ffffff !important;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 15px;
    cursor: pointer;
  }
  .mapboxgl-popup-tip {
    border-top-color: rgba(30, 30, 30, 0.9) !important;
    border-bottom-color: rgba(30, 30, 30, 0.9) !important;
  }
  /* Remove the close button */
  .mapboxgl-popup-close-button {
    display: none !important;
  }
  .poi-popup-title {
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 8px;
  }
  .poi-popup-detail {
    font-size: 12px;
    color: #ccc;
  }
`;

const calculateBuildingArea = (coordinates) => {
  if (!coordinates || coordinates.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    area += coordinates[i][0] * coordinates[i + 1][1] - coordinates[i + 1][0] * coordinates[i][1];
  }
  return Math.abs(area) / 2;
};

const calculateBuildingEfficiency = (building) => {
    const height = building.properties.height || 0;
    const area = calculateBuildingArea(building.geometry.coordinates[0]);
    
    // Simple criteria for high-performing buildings:
    // 1. Must be taller than 30 meters
    // 2. Must have a minimum area
    const isEfficient = height > 30 && 
                       area > 200 && 
                       Math.random() > 0.6;  // 40% chance if meets criteria
    
    // Debug logs
    if (height > 30 && area > 200) {
        console.log('Potential green building:', { height, area, isEfficient });
    }
    
    return isEfficient;
};

// Define example queries at the top level
const EXAMPLE_QUERIES = [
  "What's the tallest building in high-activity areas?",
  "Which areas show the highest population growth?",
  "Find neighborhoods with the best residential-commercial mix"
];

const MapContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

const AIChatPanel = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 35%;
  background: #1A1A1A;  // Dark background matching image
  color: white;
  display: flex;
  flex-direction: column;
  z-index: 1;
`;

const ChatHeader = styled.div`
  padding: 20px;
  font-size: 24px;
  font-weight: 500;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const ChatMessages = styled.div`
  flex-grow: 1;
  overflow-y: auto;
  padding: 20px;
`;

const Message = styled.div`
  margin-bottom: 24px;
`;

const MessageHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
`;

const Avatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #2A2A2A;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Sender = styled.div`
  font-size: 18px;
  font-weight: 500;
`;

const MessageContent = styled.div`
  font-size: 16px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
`;

const InputArea = styled.div`
  padding: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const Input = styled.input`
  width: 100%;
  padding: 16px;
  background: #2A2A2A;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 16px;
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const InitialPrompt = styled.div`
  text-align: center;
  font-size: 20px;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 40px;
  padding: 0 20px;
`;

const QuestionButton = styled.button`
  width: 95%;
  margin: 10px auto;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  color: white;
  font-size: 18px;
  text-align: left;
  cursor: pointer;
  display: block;
  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
`;

const FollowUpButton = styled(QuestionButton)`
  margin-top: 10px;
  padding: 12px;
  font-size: 16px;
  opacity: 0.8;
  &:hover {
    opacity: 1;
  }
`;

const MapComponent = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
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

  // Update the parseClaudeResponse function
  const parseClaudeResponse = (response) => {
    console.log('Raw Claude response:', response);
    
    try {
      if (response?.content?.[0]?.text) {
        const parsed = JSON.parse(response.content[0].text);
        console.log('Parsed JSON:', parsed);
        
        // First navigate to the area
        if (parsed.action === "navigate" && parsed.coordinates) {
          map.current.flyTo({
            center: parsed.coordinates,
            zoom: parsed.zoomLevel || 14,
            duration: 2000
          });

          // Wait for both navigation and tile loading to complete
          map.current.once('moveend', () => {
            // Wait a bit more for tiles to finish loading
            map.current.once('idle', () => {
              highlightPOIBuildings(['restaurant', 'bar', 'nightclub']);
            });
          });
        }
        
        return {
          mainText: parsed.explanation,
          poiInfo: parsed.poiInfo,
          followUps: parsed.followUpSuggestions
        };
      }

      // Fallback for other response formats
      if (response?.content) {
        return {
          mainText: response.content,
          poiInfo: null,
          followUps: []
        };
      }

      throw new Error('Unexpected response format');
    } catch (e) {
      console.error("Error parsing response:", e);
      console.error("Response structure:", response);
      return { 
        mainText: "Could not process the response. Please try again.",
        poiInfo: null,
        followUps: []
      };
    }
  };

  // Update handleQuestion to pass the full response
  const handleQuestion = async (question) => {
    setMessages(prev => [...prev, {
      isUser: true,
      content: question
    }]);

    try {
      const claudeResponse = await askClaude(question);
      console.log('Claude response received:', claudeResponse);
      
      const parsedResponse = parseClaudeResponse(claudeResponse);
      console.log('Parsed response:', parsedResponse);

      if (parsedResponse.mainText !== "Could not process the response. Please try again.") {
        setMessages(prev => [...prev, {
          isUser: false,
          content: parsedResponse
        }]);
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
    }
  };

  useEffect(() => {
    if (map.current) return; // Already initialized
    
    // Clear the container first
    if (mapContainer.current) {
      mapContainer.current.innerHTML = '';
    }

    try {
      console.log('Initializing map with config:', MAP_CONFIG);
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAP_CONFIG.style,
        center: MAP_CONFIG.center,
        zoom: MAP_CONFIG.zoom,
        minZoom: MAP_CONFIG.minZoom,
        maxZoom: MAP_CONFIG.maxZoom
      });

      // Add legend
      const legend = document.createElement('div');
      legend.className = 'map-legend';
      legend.innerHTML = `
        <div class="legend-title">Building Energy Status</div>
        <div class="legend-item">
          <span class="legend-color" style="background: #51ff00"></span>
          <span>High-Performing Buildings</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: linear-gradient(to right, #8B7355, #f7db05)"></span>
          <span>Power Grid Connected</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #380614"></span>
          <span>Energy Inefficient</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #1a1a1a"></span>
          <span>Standard Buildings</span>
        </div>
      `;
      
      map.current.getContainer().appendChild(legend);

      map.current.on('load', () => {
        console.log('Map loaded - initializing layers');
        // Fit to Miami bounds
        map.current.fitBounds([
          [MIAMI_BOUNDS.west, MIAMI_BOUNDS.south],
          [MIAMI_BOUNDS.east, MIAMI_BOUNDS.north]
        ]);
        
        if (!map.current.isStyleLoaded()) {
          map.current.once('styledata', initializeLayers);
        } else {
          initializeLayers();
        }
      });

      map.current.on('error', (e) => {
        console.error('MapComponent: Map error:', e);
      });

    } catch (error) {
      console.error('Error initializing map:', error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  const initializeLayers = useCallback(async () => {
    try {
      console.log('Starting layer initialization');
      
      // Add 3D buildings layer with highlight state
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
              '#FFD700',  // Gold color for highlighted buildings
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
        console.log('Adding POI layer...');

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
            { layers: ['pmt-density'] }
          );

          const subdivFeatures = map.current.queryRenderedFeatures(
            point,
            { layers: ['subdivision-density'] }
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
                  { layers: ['pmt-density'] }
                ).some(f => f.id === pmtFeatures[0].id);
              }).length;
            }

            // Count POIs in Subdivision boundary
            if (subdivFeatures[0]) {
              subdivPOICount = allPOIs.filter(poi => {
                const poiPoint = poi.geometry.coordinates;
                return map.current.queryRenderedFeatures(
                  map.current.project(poiPoint),
                  { layers: ['subdivision-density'] }
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

          const greenBuildingCoordinates = [];

          features.forEach(building => {
            if (!building.geometry || !building.geometry.coordinates) return;

            const buildingId = building.id;
            if (!buildingId) return;

            if (!buildingStates.current.has(buildingId)) {
              const height = building.properties.height || 0;
              const area = calculateBuildingArea(building.geometry.coordinates[0]);
              
              let isInPowerGrid = false;
              let isNegative = false;
              let isGreen = false;
              let yellowIntensity = 0;

              // Check if it's a green building
              if (height > 10 && height % 4 === 0) {
                isGreen = true;
                if (building.geometry.coordinates[0]) {
                  greenBuildingCoordinates.push(building.geometry.coordinates[0][0]);
                }
              }

              // Only check power grid and negative if not green
              if (!isGreen) {
                const shouldCheckPowerGrid = Math.random() > 0.55 || 
                  (height > 30 && area > 1000 && Math.random() > 0.3);

                if (shouldCheckPowerGrid) {
                  const centroid = building.geometry.coordinates[0][0];
                  
                  for (const location of POWER_SUBSTATIONS_MIAMI) {
                    const coords = location.coordinates;
                    const distance = Math.sqrt(
                      Math.pow(centroid[0] - coords[0], 2) + 
                      Math.pow(centroid[1] - coords[1], 2)
                    );

                    if (distance < MAP_CONFIG.BUILDING_POWER_GRID_RADIUS) {
                      isInPowerGrid = true;
                      yellowIntensity = Math.max(0, 1 - (distance * 500));
                      break;
                    }
                  }
                }

                if (!isInPowerGrid) {
                  isNegative = Math.random() < 0.15;
                }
              }

              buildingStates.current.set(buildingId, { 
                isInPowerGrid, 
                isNegative, 
                isGreen,
                yellowIntensity
              });
            }

            const state = buildingStates.current.get(buildingId);
            
            try {
              map.current.setFeatureState(
                {
                  source: 'composite',
                  sourceLayer: 'building',
                  id: buildingId
                },
                {
                  inPowerGrid: state.isInPowerGrid,
                  isNegative: state.isNegative,
                  isGreen: state.isGreen,
                  yellowIntensity: state.yellowIntensity
                }
              );
            } catch (error) {
              console.warn('Could not set feature state for building:', buildingId);
            }
          });
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
              'id': 'pmt-density',
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
                  0.3,  // Opacity when highlighted
                  0     // Transparent by default
                ]
              }
            });

            // Add Subdivision layer
            map.current.addLayer({
              'id': 'subdivision-density',
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
                  0.3,  // Opacity when highlighted
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
                { layers: ['pmt-density'] }
              );

              const subdivFeatures = map.current.queryRenderedFeatures(
                point,
                { layers: ['subdivision-density'] }
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
      
      console.log('All layers initialized');
    } catch (error) {
      console.error('Error initializing layers:', error);
    }
  }, []);

  // Animation visibility effect
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isAnimating.current) {
          console.log('Starting particle animation');
          isAnimating.current = true;
          initializeLayers();
        } else if (!entry.isIntersecting && isAnimating.current) {
          console.log('Stopping particle animation');
          isAnimating.current = false;
          if (animationFrame.current) {
            cancelAnimationFrame(animationFrame.current);
          }
        }
      },
      { threshold: 0.1 }
    );

    if (mapContainer.current) {
      observer.observe(mapContainer.current);
    }

    return () => {
      observer.disconnect();
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [initializeLayers]);

  // Add styles
  const style = document.createElement('style');
  document.head.appendChild(style);
  style.textContent += `
    .map-legend {
      position: absolute;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      padding: 15px;
      border-radius: 5px;
      font-family: Arial, sans-serif;
      color: white;
      z-index: 1;
    }

    .legend-title {
      font-weight: bold;
      margin-bottom: 10px;
      font-size: 14px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      margin: 5px 0;
      font-size: 12px;
    }

    .legend-color {
      width: 20px;
      height: 20px;
      margin-right: 10px;
      border-radius: 3px;
    }

    .boundary-stats-popup .mapboxgl-popup-content {
      background: rgba(0, 0, 0, 0.8) !important;
      color: white;
      padding: 10px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
    }
    .boundary-stats-popup .mapboxgl-popup-close-button {
      color: white;
      font-size: 16px;
      padding: 4px 8px;
      right: 0;
      top: 0;
    }
    .boundary-stats-popup .mapboxgl-popup-close-button:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }
    .boundary-stats {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .pmt-stats {
      color: #ff6666;
    }
    .subdiv-stats {
      color: #6699ff;
    }
    .stat-label {
      margin-right: 5px;
    }
    .stat-value {
      font-weight: bold;
    }
  `;

  // Add new method for AI navigation
  const initializeAIAnalysis = useCallback(async () => {
    if (!map.current) {
      console.error('Map not initialized');
      return;
    }
    
    console.log('Initializing AI analysis...'); // Debug log
    
    try {
      const censusData = await analyzeCensusData();
      console.log('Census data loaded:', censusData ? 'yes' : 'no');
      
      const navigator = new AINavigator({
        map: map.current,
        censusData,
        onUpdate: (newSource) => {
          console.log('Updating map source...'); // Debug log
          if (map.current.getSource('buildings')) {
            map.current.getSource('buildings').setData(newSource);
          }
        }
      });
      
      setAiNavigator(navigator);
      console.log('AI Navigator set');
    } catch (error) {
      console.error('Error initializing AI:', error);
    }
  }, [map]);

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
  const highlightPOIBuildings = (poiTypes) => {
    console.log('Starting building highlight with POI types:', poiTypes);
    
    // Clear any previous highlights
    if (previousHighlight.current) {
      previousHighlight.current.forEach(id => {
        map.current.setFeatureState(
          { source: 'composite', sourceLayer: 'building', id },
          { isHighlighted: false }
        );
      });
      previousHighlight.current = [];
    }
    
    // Query visible POIs of specified types
    const pois = map.current.queryRenderedFeatures(
      undefined,
      { layers: ['miami-pois'] }
    ).filter(poi => {
      const poiType = (poi.properties.type || '').toLowerCase();
      return poiTypes.some(type => poiType.includes(type));
    });

    console.log('Found POIs:', pois.length, pois);

    // Find buildings near these POIs with larger radius
    const highlightedBuildings = new Set();
    pois.forEach(poi => {
      const point = map.current.project(poi.geometry.coordinates);
      const searchRadius = 100; // Increased radius to find more buildings
      
      const nearbyBuildings = map.current.queryRenderedFeatures(
        [
          [point.x - searchRadius, point.y - searchRadius],
          [point.x + searchRadius, point.y + searchRadius]
        ],
        { layers: ['3d-buildings'] }
      );
      
      console.log(`Found ${nearbyBuildings.length} buildings near POI:`, poi.properties.type);
      
      nearbyBuildings.forEach(building => {
        if (building.id) {
          highlightedBuildings.add(building.id);
        }
      });
    });

    console.log('Buildings to highlight:', highlightedBuildings.size);

    // Highlight the buildings
    highlightedBuildings.forEach(buildingId => {
      try {
        map.current.setFeatureState(
          { source: 'composite', sourceLayer: 'building', id: buildingId },
          { isHighlighted: true }
        );
        console.log('Successfully highlighted building:', buildingId);
      } catch (error) {
        console.error('Error highlighting building:', buildingId, error);
      }
    });

    // Store highlighted building IDs
    previousHighlight.current = Array.from(highlightedBuildings);
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
      />
      
      <AIChatPanel>
        <ChatHeader>
          Chat with AI Map
        </ChatHeader>
        
        <ChatMessages>
          {messages.length === 0 ? (
            <>
              <InitialPrompt>
                Draw a Polygon on the map around a land or a building, then ask questions about it.
              </InitialPrompt>
              
              <QuestionButton onClick={() => handleQuestion("Find areas with the highest concentration of restaurants and bars")}>
                Find areas with the highest concentration of restaurants and bars
              </QuestionButton>
              
              <QuestionButton onClick={() => handleQuestion("Which areas show the highest population growth?")}>
                Which areas show the highest population growth?
              </QuestionButton>
              
              <QuestionButton onClick={() => handleQuestion("Which areas have the best mix of residential and commercial?")}>
                Which areas have the best mix of residential and commercial?
              </QuestionButton>
            </>
          ) : (
            messages.map((msg, i) => (
              <Message key={i}>
                <MessageHeader>
                  <Avatar />
                  <Sender>{msg.isUser ? 'You' : 'AI Map'}</Sender>
                </MessageHeader>
                <MessageContent>
                  {msg.isUser ? (
                    msg.content
                  ) : (
                    <>
                      <div>{msg.content.mainText}</div>
                      
                      {msg.content.poiInfo && (
                        <div style={{ margin: '10px 0' }}>
                          <div>Points of Interest: {msg.content.poiInfo.poiCount}</div>
                          <div>Types: {msg.content.poiInfo.poiTypes.join(', ')}</div>
                        </div>
                      )}
                      
                      {msg.content.followUps && (
                        <div style={{ marginTop: '20px' }}>
                          {msg.content.followUps.map((followUp, index) => (
                            <FollowUpButton 
                              key={index}
                              onClick={() => handleQuestion(followUp.prompt)}
                            >
                              {followUp.text}
                            </FollowUpButton>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </MessageContent>
              </Message>
            ))
          )}
        </ChatMessages>
        
        <InputArea>
          <Input 
            placeholder="Message AI Map..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={async (e) => {
              if (e.key === 'Enter' && inputValue.trim()) {
                const question = inputValue.trim();
                setInputValue('');
                await handleQuestion(question);
              }
            }}
          />
        </InputArea>
      </AIChatPanel>
    </MapContainer>
  );
};

export default MapComponent;

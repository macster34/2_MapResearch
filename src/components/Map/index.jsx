import React, { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAP_CONFIG } from './constants';
import { buildingLayers } from './constants/layerConfigs';
import { askClaude, parseClaudeResponse, LOADING_STEPS } from '../../services/claude';
import { MapContainer, LayerToggleContainer, LayerCollapseButton, ToggleButton } from './styles/MapStyles';
import { Toggle3DButton, RotateButton } from './StyledComponents';
import AIChatPanel from './AIChatPanel';
import { useAIConsensusAnimation } from './hooks/useAIConsensusAnimation';
import { useMapInitialization } from './hooks/useMapInitialization';
import { PopupManager } from './components/PopupManager';
import { 
    highlightPOIBuildings,
    initializeRoadGrid,
    loadHarveyData
} from './utils';
import { createErcotPopup } from './intel';
import LayerToggle from './components/LayerToggle';
import { mockDisagreementData } from './constants/mockData';
import { ErcotManager } from './components/ErcotManager';
import { 
    initializeRoadParticles,
    animateRoadParticles,
    stopRoadParticles
} from './hooks/mapAnimations';
import { useCensusBlocksLayer } from '../../hooks/useCensusBlocksLayer';
import { useCensusBlockDemographicLayer } from '../../hooks/useCensusBlockDemographicLayer';
import { useCommunityCentersLayer } from '../../hooks/useCommunityCentersLayer';
import styled from 'styled-components';
import { useFloodPlainsLayer } from '../../hooks/useFloodPlainsLayer';
import { useFloodplainDistanceLinesLayer } from '../../hooks/useFloodplainDistanceLinesLayer';
import { calcFloodplainDistanceLines } from '../../utils/calcFloodplainDistanceLines';
import { createCommunityCenterPopup, createFloodplainDistancePopup } from './popupUtils';
import { formatCensusBlockPopup, formatTop3Ethnicities, formatCensusBlockDemographicPopup } from './popupFormatters';
import Legend from './Legend';
import { handleCommunityCenterClick as handleCommunityCenterClickEvent, handleCensusBlockClick as handleCensusBlockClickEvent, handleCensusBlockDemographicClick as handleCensusBlockDemographicClickEvent } from './handlers/popupHandlers';

// Set mapbox access token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

const MapComponent = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const roadAnimationFrame = useRef(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing...');
  const [inputValue, setInputValue] = useState('');
  const [isErcotMode, setIsErcotMode] = useState(false);
  const [showRoadGrid, setShowRoadGrid] = useState(false);
  const [showMUDLayer, setShowMUDLayer] = useState(false);
  const [showHarveyData, setShowHarveyData] = useState(false);
  const [showSurfaceWater, setShowSurfaceWater] = useState(false);
  const [showWastewaterOutfalls, setShowWastewaterOutfalls] = useState(false);
  const [showZipCodes, setShowZipCodes] = useState(false);
  const [showZipFloodAnalysis, setShowZipFloodAnalysis] = useState(false);
  const [isLayerMenuCollapsed, setIsLayerMenuCollapsed] = useState(false);
  const [showAIConsensus, setShowAIConsensus] = useState(false);
  const [showRoadParticles, setShowRoadParticles] = useState(true);
  const [is3DActive, setIs3DActive] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const roadParticleAnimation = useRef(null);
  const [showCensusBlocks, setShowCensusBlocks] = useState(false);
  const [showCensusBlockDemographic, setShowCensusBlockDemographic] = useState(false);
  const [showCommunityCenters, setShowCommunityCenters] = useState(false);
  const [showFlood100, setShowFlood100] = useState(false);
  const [showFlood500, setShowFlood500] = useState(false);
  const [showFloodplainDistanceLines, setShowFloodplainDistanceLines] = useState(false);
  const [communityCentersData, setCommunityCentersData] = useState(null);
  const [floodplain100Data, setFloodplain100Data] = useState(null);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [distanceLinesData, setDistanceLinesData] = useState(null);
  const [showGasStations, setShowGasStations] = useState(false);
  const [showGasStations1Mile, setShowGasStations1Mile] = useState(false);
  const [showGasStations2Mile, setShowGasStations2Mile] = useState(false);
  const [showPowerOutages, setShowPowerOutages] = useState(false);
  const [showChurches1Mile, setShowChurches1Mile] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTime, setAnimationTime] = useState(null);
  const [animationRange, setAnimationRange] = useState([null, null]);
  const [all311Features, setAll311Features] = useState([]);
  const animationTimerRef = useRef(null);
  const [uniqueDays, setUniqueDays] = useState([]);
  // 1. Add state for all debris features
  const [allDebrisFeatures, setAllDebrisFeatures] = useState([]);

  // Add these refs for drag functionality
  const isDraggingRef = useRef(false);
  const currentXRef = useRef(0);
  const currentYRef = useRef(0);
  const initialXRef = useRef(0);
  const initialYRef = useRef(0);
  const xOffsetRef = useRef(0);
  const yOffsetRef = useRef(0);
  const popupRef = useRef(null);

  // 1. Add state for Tree Debris toggle
  const [showTreeDebris, setShowTreeDebris] = useState(false);

  // --- DERIVED STATE: Determine visibility based on toggles ---
  const isCommunityCentersVisible = showCommunityCenters || showFloodplainDistanceLines;
  const isFlood100Visible = showFlood100 || showFloodplainDistanceLines;

  // Derived state: show 1-mile circles if either toggle is on
  const show1MileCircles = showGasStations1Mile || showPowerOutages;

  const { initializeParticleLayer, generateParticles } = useAIConsensusAnimation(map, showAIConsensus, mockDisagreementData);
  useMapInitialization(map, mapContainer);

  const ercotManagerRef = useRef(null);

  const handleCommunityCenterClick = useCallback((feature, lngLat, showFloodplainDistanceLinesArg) => {
    handleCommunityCenterClickEvent({
      map,
      showFloodplainDistanceLines: showFloodplainDistanceLinesArg,
      setIsCalculating,
      setSelectedCenter,
      createFloodplainDistancePopup,
      createCommunityCenterPopup,
      feature,
      lngLat,
      distanceLinesData
    });
  }, [map, distanceLinesData, setSelectedCenter, setIsCalculating]);

  // Handler for census block click
  useCensusBlocksLayer(map, showCensusBlocks, (feature, lngLat) =>
    handleCensusBlockClickEvent({
      map,
      formatCensusBlockPopup,
      feature,
      lngLat
    })
  );

  useCensusBlockDemographicLayer(map, showCensusBlockDemographic, (feature, lngLat) =>
    handleCensusBlockDemographicClickEvent({
      map,
      formatCensusBlockDemographicPopup,
      feature,
      lngLat
    })
  );

  useCommunityCentersLayer(
    map,
    isCommunityCentersVisible,
    communityCentersData,
    handleCommunityCenterClick,
    showFloodplainDistanceLines
  );

  useFloodPlainsLayer(map, isFlood100Visible, showFlood500);

  // Load community centers, floodplain data, and precomputed lines once
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ccRes, fpRes, linesRes] = await Promise.all([
          fetch('/houston-community-centers-vulnerability-4326.geojson'),
          fetch('/houston-texas-flood-100-500.geojson'),
          fetch('/houston-texas-community-centers-distance-lines.geojson')
        ]);
        if (!ccRes.ok || !fpRes.ok || !linesRes.ok) {
          throw new Error('One or more data files not found or not accessible');
        }
        const ccData = await ccRes.json();
        const fpData = await fpRes.json();
        const linesData = await linesRes.json();
        // Only keep 100-year floodplain polygons
        const flood100 = {
          ...fpData,
          features: fpData.features.filter(f =>
            ['AE', 'A', 'AO', 'VE'].includes(f.properties.FLD_ZONE)
          )
        };
        setCommunityCentersData(ccData);
        setFloodplain100Data(flood100);
        setDistanceLinesData(linesData);
        console.log('Floodplain data loaded:', flood100);
      } catch (e) {
        console.error('Error loading community centers, floodplain, or lines data:', e);
        setCommunityCentersData(null);
        setFloodplain100Data(null);
        setDistanceLinesData(null);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    console.log('Floodplain Distance Lines toggle changed:', showFloodplainDistanceLines);
  }, [showFloodplainDistanceLines]);

  // Add this effect for road particles
  useEffect(() => {
    if (!map.current) return;

    const initializeParticles = async () => {
      try {
        // Wait for style to fully load
        if (!map.current.isStyleLoaded()) {
          await new Promise(resolve => {
            map.current.once('style.load', resolve);
          });
        }

        if (showRoadParticles) {
          console.log('Starting road particles animation...');
          initializeRoadParticles(map.current);
          roadParticleAnimation.current = animateRoadParticles({ map: map.current });
        } else {
          if (roadParticleAnimation.current) {
            stopRoadParticles(map.current);
            cancelAnimationFrame(roadParticleAnimation.current);
            roadParticleAnimation.current = null;
          }
        }
      } catch (error) {
        console.error('Failed to initialize road particles:', error);
      }
    };

    // Initialize when map is ready
    if (map.current.loaded()) {
      initializeParticles();
    } else {
      map.current.once('load', initializeParticles);
    }

    return () => {
      if (roadParticleAnimation.current) {
        cancelAnimationFrame(roadParticleAnimation.current);
        roadParticleAnimation.current = null;
      }
    };
  }, [showRoadParticles]);

  // Add cleanup effect
  useEffect(() => {
    return () => {
      if (roadParticleAnimation.current) {
        cancelAnimationFrame(roadParticleAnimation.current);
        roadParticleAnimation.current = null;
      }
    };
  }, []);

  const handleQuestion = async (question) => {
    setIsLoading(true);
    setMessages(prev => [...prev, { isUser: true, content: question }]);

    try {
      const bounds = map.current.getBounds();
      const mapBounds = {
        sw: bounds.getSouthWest(),
        ne: bounds.getNorthEast()
      };

      const response = await askClaude(question, {}, mapBounds);
      const parsedResponse = parseClaudeResponse(response);

      if (parsedResponse.mainText !== "Could not process the response. Please try again.") {
        setMessages(prev => [...prev, {
          isUser: false,
          content: parsedResponse
        }]);
        
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

  useEffect(() => {
    if (map.current) return;

    // Remove duplicate initialization since it's handled in useMapInitialization
    const handleMapLoad = async () => {
      if (!map.current.isStyleLoaded()) {
        await new Promise(resolve => map.current.once('style.load', resolve));
      }

      // Style water in the base map layers
      const waterLayers = [
        'water',
        'water-shadow',
        'waterway',
        'water-depth',
        'water-pattern'
      ];

      waterLayers.forEach(layerId => {
        if (!map.current.getLayer(layerId)) return;

        try {
          const layer = map.current.getLayer(layerId);
          if (!layer) return;

          // Handle fill layers
          if (layer.type === 'fill') {
            map.current.setPaintProperty(layerId, 'fill-color', '#0088cc');
            map.current.setPaintProperty(layerId, 'fill-opacity', 0.8);
          }
          
          // Handle line layers
          if (layer.type === 'line') {
            map.current.setPaintProperty(layerId, 'line-color', '#0088cc');
            map.current.setPaintProperty(layerId, 'line-opacity', 0.8);
          }
        } catch (error) {
          console.warn(`Could not style water layer ${layerId}:`, error);
        }
      });

      // Style parks and green areas
      const parkLayers = [
        'landuse',
        'park',
        'park-label',
        'national-park',
        'natural',
        'golf-course',
        'pitch',
        'grass'
      ];

      parkLayers.forEach(layerId => {
        if (!map.current.getLayer(layerId)) return;

        try {
          const layer = map.current.getLayer(layerId);
          if (!layer) return;

          if (layer.type === 'fill') {
            map.current.setPaintProperty(layerId, 'fill-color', '#3a9688');
            map.current.setPaintProperty(layerId, 'fill-opacity', 0.4);
          }
          if (layer.type === 'symbol' && map.current.getPaintProperty(layerId, 'background-color') !== undefined) {
            map.current.setPaintProperty(layerId, 'background-color', '#3a9688');
          }
        } catch (error) {
          console.warn(`Could not style park layer ${layerId}:`, error);
        }
      });
    };

    if (map.current) {
      handleMapLoad();
    } else {
      map.current.once('load', handleMapLoad);
    }
  }, [isErcotMode]);

  // Add cleanup effect for AI consensus animation
  useEffect(() => {
    if (!map.current) return;

    return () => {
      // Clean up AI consensus particles layer
      if (map.current.getLayer('ai-consensus-particles')) {
        map.current.removeLayer('ai-consensus-particles');
      }
      if (map.current.getSource('ai-consensus-particles')) {
        map.current.removeSource('ai-consensus-particles');
      }
    };
  }, []);

  const handleLLMResponse = (response) => {
    if (!map.current) return;

    const clearExistingElements = () => {
      const existingElements = document.querySelectorAll('.mapboxgl-popup, .callout-annotation, .mapboxgl-marker');
      existingElements.forEach(el => el.remove());
      
      if (map.current.getSource('area-highlights')) {
        map.current.getSource('area-highlights').setData({
          type: 'FeatureCollection',
          features: []
        });
      }
    };

    clearExistingElements();

    if (response?.coordinates) {
      map.current.flyTo({
        center: response.coordinates,
        zoom: response.zoomLevel,
        duration: 1000
      });

      map.current.once('moveend', () => {
        map.current.once('idle', () => {
          highlightPOIBuildings(['restaurant', 'bar', 'nightclub'], '#FF4500');
          
          if (map.current) {
            map.current.setLayoutProperty('houston-pois', 'visibility', 'none');
          }
        });
      });
    }
  };

  const dragStart = (e) => {
    if (e.type === "mousedown") {
      isDraggingRef.current = true;
      initialXRef.current = e.clientX - xOffsetRef.current;
      initialYRef.current = e.clientY - yOffsetRef.current;
    } else if (e.type === "touchstart") {
      isDraggingRef.current = true;
      initialXRef.current = e.touches[0].clientX - xOffsetRef.current;
      initialYRef.current = e.touches[0].clientY - yOffsetRef.current;
    }
  };

  const dragEnd = () => {
    isDraggingRef.current = false;
    initialXRef.current = currentXRef.current;
    initialYRef.current = currentYRef.current;
  };

  const drag = (e) => {
    if (isDraggingRef.current) {
      e.preventDefault();
      
      if (e.type === "mousemove") {
        currentXRef.current = e.clientX - initialXRef.current;
        currentYRef.current = e.clientY - initialXRef.current;
      } else if (e.type === "touchmove") {
        currentXRef.current = e.touches[0].clientX - initialXRef.current;
        currentYRef.current = e.touches[0].clientY - initialXRef.current;
      }

      xOffsetRef.current = currentXRef.current;
      yOffsetRef.current = currentYRef.current;
      
      if (popupRef.current) {
        popupRef.current.style.transform = 
          `translate3d(${currentXRef.current}px, ${currentYRef.current}px, 0)`;
      }
    }
  };

  useEffect(() => {
    if (!map.current) return;

    // Update bounds whenever the map moves
    const updateBounds = () => {
      const bounds = map.current.getBounds();
    };

    map.current.on('moveend', updateBounds);
    // Get initial bounds
    updateBounds();

    return () => {
      if (map.current) {
        map.current.off('moveend', updateBounds);
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;

    // Add touch event handlers
    const handleTouchStart = (e) => {
      if (!e || !e.touches) return;
      
      if (e.touches.length === 2) {
        e.preventDefault(); // Prevent default zoom behavior
      }
    };

    const handleTouchMove = (e) => {
      if (!e || !e.touches) return;
      
      if (e.touches.length === 2) {
        e.preventDefault();
      }
    };

    // Add the event listeners to the canvas container
    const mapCanvas = map.current.getCanvas();
    if (mapCanvas) {
      mapCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      mapCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });

      return () => {
        mapCanvas.removeEventListener('touchstart', handleTouchStart);
        mapCanvas.removeEventListener('touchmove', handleTouchMove);
      };
    }
  }, []);

  // Add the toggle3D function
  const toggle3D = () => {
    if (!map.current) return;
    
    const newPitch = is3DActive ? 0 : 60;
    
    map.current.easeTo({
      pitch: newPitch,
      duration: 1000
    });
    
    setIs3DActive(!is3DActive);
  };
  
  // Add the rotate function
  const rotateMap = () => {
    if (!map.current) return;
    
    // Increment rotation by 90 degrees (π/2 radians)
    const newRotation = (currentRotation + 90) % 360;
    
    map.current.easeTo({
      bearing: newRotation,
      duration: 1000
    });
    
    setCurrentRotation(newRotation);
  };

  // Add 2-mile radius circles for community centers
  useEffect(() => {
    if (!map.current) return;
    const sourceId = 'community-center-2mile-circles';
    const layerId = 'community-center-2mile-circles';

    if (showGasStations) {
      // Add source/layer if not exists
      if (!map.current.getSource(sourceId)) {
        fetch('/community_center_2mile_circles.geojson')
          .then(res => res.json())
          .then(data => {
            map.current.addSource(sourceId, {
              type: 'geojson',
              data
            });
            map.current.addLayer({
              id: layerId,
              type: 'line',
              source: sourceId,
              paint: {
                'line-color': '#fff',
                'line-width': 2,
                'line-dasharray': [2, 4],
                'line-opacity': 1
              },
              layout: { visibility: 'visible' }
            });
          });
      } else {
        map.current.setLayoutProperty(layerId, 'visibility', 'visible');
      }
    } else {
      // Hide or remove the layer/source
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
    }
  }, [showGasStations, map]);

  // Gas Stations (1 Mile) markers and circles
  useEffect(() => {
    console.log('1-mile gas station useEffect running, showGasStations1Mile:', showGasStations1Mile);
    if (!map.current) return;
    const sourceId = 'gas-stations-1mile';
    const layerId = 'gas-stations-1mile';
    const reviewedSourceId = 'gas-stations-1mile-reviewed';
    const reviewedLayerId = 'gas-stations-1mile-reviewed';

    if (showGasStations1Mile) {
      // Add gas stations source/layer if not exists (semi-transparent blue markers - no July reviews)
      if (!map.current.getSource(sourceId)) {
        fetch('/gas_stations_1mile_no_july_reviews.geojson')
          .then(res => {
            console.log('Fetched no_july_reviews.geojson:', res);
            return res.json();
          })
          .then(data => {
            console.log('Loaded no_july_reviews.geojson data:', data);
            map.current.addSource(sourceId, {
              type: 'geojson',
              data
            });
            console.log('Added source:', sourceId);
            map.current.addLayer({
              id: layerId,
              type: 'circle',
              source: sourceId,
              paint: {
                'circle-radius': 7,
                'circle-color': '#005577',
                'circle-blur': 0.2,
                'circle-opacity': 0.6, // Semi-transparent
                'circle-stroke-width': 1,
                'circle-stroke-color': '#fff',
                'circle-stroke-opacity': 0.4
              },
              layout: { visibility: 'visible' }
            });
            console.log('Added layer:', layerId);
          });
      } else {
        map.current.setLayoutProperty(layerId, 'visibility', 'visible');
      }
      // Add reviewed gas stations source/layer if not exists (glowing blue markers - with July reviews)
      if (!map.current.getSource(reviewedSourceId)) {
        fetch('/gas_stations_1mile_july_reviews.geojson')
          .then(res => {
            console.log('Fetched july_reviews.geojson:', res);
            return res.json();
          })
          .then(data => {
            console.log('Loaded july_reviews.geojson data:', data);
            map.current.addSource(reviewedSourceId, {
              type: 'geojson',
              data
            });
            console.log('Added source:', reviewedSourceId);
            map.current.addLayer({
              id: reviewedLayerId,
              type: 'circle',
              source: reviewedSourceId,
              paint: {
                'circle-radius': 8,
                'circle-color': '#00eaff', // Glowing blue
                'circle-blur': 0.8, // More blur for glow effect
                'circle-opacity': 0.95,
                'circle-stroke-width': 3,
                'circle-stroke-color': '#fff',
                'circle-stroke-opacity': 0.9
              },
              layout: { visibility: 'visible' }
            });
            console.log('Added layer:', reviewedLayerId);
            // Move reviewed layer above blue markers
            map.current.moveLayer(reviewedLayerId);
          });
      } else {
        map.current.setLayoutProperty(reviewedLayerId, 'visibility', 'visible');
        map.current.moveLayer(reviewedLayerId);
      }
    } else {
      // Remove/hide gas stations layer/source
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
      // Remove/hide reviewed gas stations layer/source
      if (map.current.getLayer(reviewedLayerId)) {
        map.current.removeLayer(reviewedLayerId);
      }
      if (map.current.getSource(reviewedSourceId)) {
        map.current.removeSource(reviewedSourceId);
      }
    }
  }, [showGasStations1Mile, map]);

  // Update the 1-mile circles useEffect to use show1MileCircles
  useEffect(() => {
    console.log('1-mile circle useEffect running, show1MileCircles:', show1MileCircles);
    if (!map.current) return;
    const circleSourceId = 'community-center-1mile-circles';
    const circleLayerId = 'community-center-1mile-circles';

    if (show1MileCircles) {
      // Add 1-mile circles source/layer if not exists
      if (!map.current.getSource(circleSourceId)) {
        fetch('/community_center_1mile_circles.geojson')
          .then(res => res.json())
          .then(data => {
            map.current.addSource(circleSourceId, {
              type: 'geojson',
              data
            });
            map.current.addLayer({
              id: circleLayerId,
              type: 'line',
              source: circleSourceId,
              paint: {
                'line-color': '#fff',
                'line-width': 2,
                'line-dasharray': [2, 4],
                'line-opacity': 1
              },
              layout: { visibility: 'visible' }
            });
            console.log('Added 1-mile circle layer');
          });
      } else {
        map.current.setLayoutProperty(circleLayerId, 'visibility', 'visible');
      }
    } else {
      // Remove/hide 1-mile circles layer/source
      if (map.current.getLayer(circleLayerId)) {
        map.current.removeLayer(circleLayerId);
      }
      if (map.current.getSource(circleSourceId)) {
        map.current.removeSource(circleSourceId);
      }
    }
  }, [show1MileCircles, map]);

  // Add click handler for reviewed gas stations
  useEffect(() => {
    if (!map.current || !showGasStations1Mile) return;

    const handleReviewedGasStationClick = (e) => {
      console.log('--- Popup Click Handler Triggered ---');
      const feature = e.features && e.features[0];
      if (!feature) {
        console.log('No feature found in click event:', e);
        return;
      }
      console.log('Clicked feature:', feature);
      // Log the layer id and properties for debugging
      console.log('DEBUG: feature.layer.id:', feature.layer.id);
      console.log('DEBUG: feature.properties:', feature.properties);
      if (feature.layer.id === 'gas-stations-1mile-reviewed') {
        const properties = feature.properties;
        let reviews = [];
        console.log('Before parsing, properties.july_reviews:', properties.july_reviews, 'type:', typeof properties.july_reviews);
        if (properties.july_reviews) {
          if (typeof properties.july_reviews === 'string') {
            try {
              reviews = JSON.parse(properties.july_reviews);
              console.log('Parsed reviews from string:', reviews);
            } catch (err) {
              console.log('Error parsing july_reviews:', err);
              reviews = [];
            }
          } else if (Array.isArray(properties.july_reviews)) {
            reviews = properties.july_reviews;
            console.log('july_reviews is already an array:', reviews);
          }
        }
        if (!Array.isArray(reviews)) {
          console.log('reviews is not an array after parsing, setting to []');
          reviews = [];
        }
        console.log('Final reviews array:', reviews);
        
        if (reviews.length > 0) {
          // Create popup content
          let popupContent = `
            <div style=\"max-width: 300px; font-family: Arial, sans-serif;\">
              <h3 style=\"margin: 0 0 10px 0; color: #333; font-size: 16px;\">${properties.name}</h3>
              <p style=\"margin: 0 0 8px 0; color: #666; font-size: 12px;\">${properties.address}</p>
              <p style=\"margin: 0 0 12px 0; color: #00eaff; font-weight: bold; font-size: 14px;\">
                ${reviews.length} July 2024 Review${reviews.length > 1 ? 's' : ''}
              </p>
          `;
          
          reviews.forEach((review, index) => {
            popupContent += `
              <div style=\"border-left: 3px solid #00eaff; padding-left: 10px; margin-bottom: 10px;\">
                <p style=\"margin: 0 0 5px 0; font-size: 12px; color: #888;\">
                  <strong>${review.author_name}</strong> • ${review.date} • ⭐ ${review.rating}/5
                </p>
                <p style=\"margin: 0; font-size: 13px; line-height: 1.4; color: #333;\">
                  \"${review.text}\"
                </p>
              </div>
            `;
          });
          
          popupContent += '</div>';
          
          // Create and show popup
          console.log('Showing popup with reviews');
          new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: false,
            maxWidth: '350px'
          })
          .setLngLat(e.lngLat)
          .setHTML(popupContent)
          .addTo(map.current);
        } else {
          // Fallback popup if no reviews
          console.log('No reviews found, showing fallback popup');
          new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: false,
            maxWidth: '350px'
          })
          .setLngLat(e.lngLat)
          .setHTML(`<div style=\"max-width: 300px; font-family: Arial, sans-serif;\"><h3 style=\"margin: 0 0 10px 0; color: #333; font-size: 16px;\">${properties.name}</h3><p style=\"margin: 0 0 8px 0; color: #666; font-size: 12px;\">${properties.address}</p><p style=\"margin: 0 0 12px 0; color: #00eaff; font-weight: bold; font-size: 14px;\">No July 2024 reviews found for this station.</p></div>`)
          .addTo(map.current);
        }
      }
    };

    // Attach click event only to the reviewed layer
    map.current.on('click', 'gas-stations-1mile-reviewed', handleReviewedGasStationClick);
    
    // Change cursor on hover for reviewed gas stations
    map.current.on('mouseenter', 'gas-stations-1mile-reviewed', () => {
      map.current.getCanvas().style.cursor = 'pointer';
    });
    
    map.current.on('mouseleave', 'gas-stations-1mile-reviewed', () => {
      map.current.getCanvas().style.cursor = '';
    });

    return () => {
      if (map.current) {
        map.current.off('click', 'gas-stations-1mile-reviewed', handleReviewedGasStationClick);
        map.current.off('mouseenter', 'gas-stations-1mile-reviewed');
        map.current.off('mouseleave', 'gas-stations-1mile-reviewed');
      }
    };
  }, [showGasStations1Mile, map]);

  // Gas Stations (2 Mile) markers and circles
  useEffect(() => {
    console.log('2-mile gas station useEffect running, showGasStations2Mile:', showGasStations2Mile);
    if (!map.current) return;
    const sourceId = 'gas-stations-2mile';
    const layerId = 'gas-stations-2mile';
    const circleSourceId = 'community-center-2mile-circles';
    const circleLayerId = 'community-center-2mile-circles';
    const reviewedSourceId = 'gas-stations-2mile-reviewed';
    const reviewedLayerId = 'gas-stations-2mile-reviewed';

    if (showGasStations2Mile) {
      // Add gas stations source/layer if not exists (semi-transparent blue markers - no July reviews)
      if (!map.current.getSource(sourceId)) {
        fetch('/gas_stations_2mile_no_july_reviews.geojson')
          .then(res => res.json())
          .then(data => {
            map.current.addSource(sourceId, {
              type: 'geojson',
              data
            });
            map.current.addLayer({
              id: layerId,
              type: 'circle',
              source: sourceId,
              paint: {
                'circle-radius': 7,
                'circle-color': '#005577',
                'circle-blur': 0.2,
                'circle-opacity': 0.6, // Semi-transparent
                'circle-stroke-width': 1,
                'circle-stroke-color': '#fff',
                'circle-stroke-opacity': 0.4
              },
              layout: { visibility: 'visible' }
            });
          });
      } else {
        map.current.setLayoutProperty(layerId, 'visibility', 'visible');
      }
      // Add 2-mile circles source/layer if not exists
      if (!map.current.getSource(circleSourceId)) {
        fetch('/community_center_2mile_circles.geojson')
          .then(res => res.json())
          .then(data => {
            map.current.addSource(circleSourceId, {
              type: 'geojson',
              data
            });
            map.current.addLayer({
              id: circleLayerId,
              type: 'line',
              source: circleSourceId,
              paint: {
                'line-color': '#fff',
                'line-width': 2,
                'line-dasharray': [2, 4],
                'line-opacity': 1
              },
              layout: { visibility: 'visible' }
            });
          });
      } else {
        map.current.setLayoutProperty(circleLayerId, 'visibility', 'visible');
      }
      // Add reviewed gas stations source/layer if not exists (glowing blue markers - with July reviews)
      if (!map.current.getSource(reviewedSourceId)) {
        fetch('/gas_stations_2mile_july_reviews.geojson')
          .then(res => res.json())
          .then(data => {
            map.current.addSource(reviewedSourceId, {
              type: 'geojson',
              data
            });
            map.current.addLayer({
              id: reviewedLayerId,
              type: 'circle',
              source: reviewedSourceId,
              paint: {
                'circle-radius': 8,
                'circle-color': '#00eaff', // Glowing blue
                'circle-blur': 0.8, // More blur for glow effect
                'circle-opacity': 0.95,
                'circle-stroke-width': 3,
                'circle-stroke-color': '#fff',
                'circle-stroke-opacity': 0.9
              },
              layout: { visibility: 'visible' }
            });
            map.current.moveLayer(reviewedLayerId);
          });
      } else {
        map.current.setLayoutProperty(reviewedLayerId, 'visibility', 'visible');
        map.current.moveLayer(reviewedLayerId);
      }
    } else {
      // Remove/hide gas stations layer/source
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
      // Remove/hide 2-mile circles layer/source
      if (map.current.getLayer(circleLayerId)) {
        map.current.removeLayer(circleLayerId);
      }
      if (map.current.getSource(circleSourceId)) {
        map.current.removeSource(circleSourceId);
      }
      // Remove/hide reviewed gas stations layer/source
      if (map.current.getLayer(reviewedLayerId)) {
        map.current.removeLayer(reviewedLayerId);
      }
      if (map.current.getSource(reviewedSourceId)) {
        map.current.removeSource(reviewedSourceId);
      }
    }
  }, [showGasStations2Mile, map]);

  // Add click handler for reviewed 2-mile gas stations
  useEffect(() => {
    if (!map.current || !showGasStations2Mile) return;
    const handleReviewedGasStationClick = (e) => {
      const feature = e.features && e.features[0];
      if (!feature) return;
      if (feature.layer.id === 'gas-stations-2mile-reviewed') {
        const properties = feature.properties;
        let reviews = [];
        if (properties.july_reviews) {
          if (typeof properties.july_reviews === 'string') {
            try {
              reviews = JSON.parse(properties.july_reviews);
            } catch (err) {
              reviews = [];
            }
          } else if (Array.isArray(properties.july_reviews)) {
            reviews = properties.july_reviews;
          }
        }
        if (!Array.isArray(reviews)) reviews = [];
        if (reviews.length > 0) {
          let popupContent = `
            <div style=\"max-width: 300px; font-family: Arial, sans-serif;\">
              <h3 style=\"margin: 0 0 10px 0; color: #333; font-size: 16px;\">${properties.name}</h3>
              <p style=\"margin: 0 0 8px 0; color: #666; font-size: 12px;\">${properties.address}</p>
              <p style=\"margin: 0 0 12px 0; color: #00eaff; font-weight: bold; font-size: 14px;\">
                ${reviews.length} July 2024 Review${reviews.length > 1 ? 's' : ''}
              </p>
          `;
          reviews.forEach((review, index) => {
            popupContent += `
              <div style=\"border-left: 3px solid #00eaff; padding-left: 10px; margin-bottom: 10px;\">
                <p style=\"margin: 0 0 5px 0; font-size: 12px; color: #888;\">
                  <strong>${review.author_name}</strong> • ${review.date} • ⭐ ${review.rating}/5
                </p>
                <p style=\"margin: 0; font-size: 13px; line-height: 1.4; color: #333;\">
                  \"${review.text}\"
                </p>
              </div>
            `;
          });
          popupContent += '</div>';
          new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: false,
            maxWidth: '350px'
          })
          .setLngLat(e.lngLat)
          .setHTML(popupContent)
          .addTo(map.current);
        } else {
          new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: false,
            maxWidth: '350px'
          })
          .setLngLat(e.lngLat)
          .setHTML(`<div style=\"max-width: 300px; font-family: Arial, sans-serif;\"><h3 style=\"margin: 0 0 10px 0; color: #333; font-size: 16px;\">${properties.name}</h3><p style=\"margin: 0 0 8px 0; color: #666; font-size: 12px;\">${properties.address}</p><p style=\"margin: 0 0 12px 0; color: #00eaff; font-weight: bold; font-size: 14px;\">No July 2024 reviews found for this station.</p></div>`)
          .addTo(map.current);
        }
      }
    };
    map.current.on('click', 'gas-stations-2mile-reviewed', handleReviewedGasStationClick);
    map.current.on('mouseenter', 'gas-stations-2mile-reviewed', () => {
      map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'gas-stations-2mile-reviewed', () => {
      map.current.getCanvas().style.cursor = '';
    });
    return () => {
      if (map.current) {
        map.current.off('click', 'gas-stations-2mile-reviewed', handleReviewedGasStationClick);
        map.current.off('mouseenter', 'gas-stations-2mile-reviewed');
        map.current.off('mouseleave', 'gas-stations-2mile-reviewed');
      }
    };
  }, [showGasStations2Mile, map]);

  // Add 311 Power Outage GeoJSON layer
  useEffect(() => {
    if (!map.current) return;
    const sourceId = 'power-outages-beryl';
    const layerId = 'power-outages-beryl';

    if (showPowerOutages) {
      if (!map.current.getSource(sourceId)) {
        fetch('/311_power_outages_Beryl_refined.geojson')
          .then(res => res.json())
          .then(data => {
            map.current.addSource(sourceId, {
              type: 'geojson',
              data
            });
            map.current.addLayer({
              id: layerId,
              type: 'circle',
              source: sourceId,
              paint: {
                'circle-radius': 7,
                'circle-color': '#ff3333',
                'circle-blur': 0.2,
                'circle-opacity': 0.7,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#fff',
                'circle-stroke-opacity': 0.7
              },
              layout: { visibility: 'visible' }
            });
          });
      } else {
        map.current.setLayoutProperty(layerId, 'visibility', 'visible');
      }
    } else {
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
    }
  }, [showPowerOutages, map]);

  // Add Churches within 1 mile GeoJSON layer
  useEffect(() => {
    if (!map.current) return;
    const sourceId = 'churches-1mile';
    const layerId = 'churches-1mile';

    if (showChurches1Mile) {
      if (!map.current.getSource(sourceId)) {
        fetch('/houston_churches_1mile_community_centers.geojson')
          .then(res => res.json())
          .then(data => {
            map.current.addSource(sourceId, {
              type: 'geojson',
              data
            });
            map.current.addLayer({
              id: layerId,
              type: 'circle',
              source: sourceId,
              paint: {
                'circle-color': '#8e44ad',
                'circle-radius': [
                  'case',
                  ['all', ['has', 'area_sqft'], ['>', ['to-number', ['get', 'area_sqft']], 0]],
                  [
                    'interpolate',
                    ['linear'],
                    ['to-number', ['get', 'area_sqft'], 0],
                    0, 4.8,
                    2000, 6.4,
                    5000, 9.6,
                    10000, 14.4,
                    20000, 19.2
                  ],
                  6.4
                ],
                'circle-blur': 0.2,
                'circle-opacity': 0.7,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#fff',
                'circle-stroke-opacity': 0.7
              }
            });
          });
      }
    } else {
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
    }
  }, [showChurches1Mile]);

  // Helper to get min/max created_date from 311 data and store all features and unique days
  useEffect(() => {
    fetch('/311_power_outages_Beryl_refined.geojson')
      .then(res => res.json())
      .then(data => {
        const dates = data.features.map(f => new Date(f.properties.created_date));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        setAnimationRange([minDate, maxDate]);
        setAnimationTime(null); // Start with no markers visible
        setAll311Features(data.features);
        // Calculate unique days
        const daySet = new Set(dates.map(d => d.toISOString().slice(0, 10)));
        const sortedDays = Array.from(daySet).sort();
        setUniqueDays(sortedDays);
        console.log('[311 Animation] Data loaded, starting with no markers visible');
      });
  }, []);

  // Load debris GeoJSON for animation (on mount)
  useEffect(() => {
    fetch('/debris_calls_2024-07-08_to_2024-07-30.geojson')
      .then(res => res.json())
      .then(data => {
        setAllDebrisFeatures(data.features);
        console.log('[DEBUG] Loaded debris features:', data.features.length, data.features.slice(0, 2));
      });
  }, []);

  // Log uniqueDays on mount and after set
  useEffect(() => {
    console.log('[DEBUG] (mount) uniqueDays:', uniqueDays);
  }, []);
  useEffect(() => {
    console.log('[DEBUG] (after set) uniqueDays:', uniqueDays);
  }, [uniqueDays]);

  // Debug: Log debris features and source existence each frame
  useEffect(() => {
    if (!map.current) return;
    if (allDebrisFeatures.length) {
      const source = map.current.getSource('debris-animation');
      console.log('[DEBUG] debris-animation source exists:', !!source);
      if (source) {
        const filtered = animationTime
          ? allDebrisFeatures.filter(f => new Date(f.properties.created_date) <= animationTime)
          : [];
        console.log(`[DEBUG] Setting ${filtered.length} debris features at`, animationTime);
      }
    } else {
      console.log('[DEBUG] allDebrisFeatures is empty');
    }
  }, [animationTime, allDebrisFeatures, map]);

  // 1. Create debris animation source/layer when map and data are ready
  useEffect(() => {
    if (!map.current || !allDebrisFeatures.length) return;
    const sourceId = 'debris-animation';
    const layerId = 'debris-animation';
    // Only create if source doesn't exist
    if (!map.current.getSource(sourceId)) {
      const geojson = { type: 'FeatureCollection', features: [] };
      if (map.current.isStyleLoaded()) {
        map.current.addSource(sourceId, { type: 'geojson', data: geojson });
        map.current.addLayer({
          id: layerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 4,
            'circle-color': '#39FF14',
            'circle-blur': 0.2,
            'circle-opacity': 0.85
          },
          layout: { visibility: 'visible' }
        });
      } else {
        map.current.once('style.load', () => {
          map.current.addSource(sourceId, { type: 'geojson', data: geojson });
          map.current.addLayer({
            id: layerId,
            type: 'circle',
            source: sourceId,
            paint: {
              'circle-radius': 4,
              'circle-color': '#39FF14',
              'circle-blur': 0.2,
              'circle-opacity': 0.85
            },
            layout: { visibility: 'visible' }
          });
        });
      }
    }
  }, [map, allDebrisFeatures]);

  // 1. Create source/layer when map and data are ready
  useEffect(() => {
    if (!map.current || !all311Features.length) return;
    const sourceId = 'power-outages-beryl';
    const layerId = 'power-outages-beryl';
    
    // Only create if source doesn't exist
    if (!map.current.getSource(sourceId)) {
      const geojson = { type: 'FeatureCollection', features: [] };
      
      // Wait for style to be loaded
      if (map.current.isStyleLoaded()) {
        map.current.addSource(sourceId, { type: 'geojson', data: geojson });
        map.current.addLayer({
          id: layerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 7,
            'circle-color': '#ff3333',
            'circle-blur': 0.2,
            'circle-opacity': 0.7,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff',
            'circle-stroke-opacity': 0.7
          },
          layout: { visibility: 'visible' }
        });
        console.log('[311 Animation] Source/layer created');
      } else {
        map.current.once('style.load', () => {
          map.current.addSource(sourceId, { type: 'geojson', data: geojson });
          map.current.addLayer({
            id: layerId,
            type: 'circle',
            source: sourceId,
            paint: {
              'circle-radius': 7,
              'circle-color': '#ff3333',
              'circle-blur': 0.2,
              'circle-opacity': 0.7,
              'circle-stroke-width': 1,
              'circle-stroke-color': '#fff',
              'circle-stroke-opacity': 0.7
            },
            layout: { visibility: 'visible' }
          });
          console.log('[311 Animation] Source/layer created after style load');
        });
      }
    }
  }, [map, all311Features]);

  // Alternative source creation when map is ready
  useEffect(() => {
    if (!map.current) return;
    
    const createSourceIfNeeded = () => {
      const sourceId = 'power-outages-beryl';
      const layerId = 'power-outages-beryl';
      
      if (!map.current.getSource(sourceId) && all311Features.length > 0) {
        const geojson = { type: 'FeatureCollection', features: [] };
        map.current.addSource(sourceId, { type: 'geojson', data: geojson });
        map.current.addLayer({
          id: layerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 7,
            'circle-color': '#ff3333',
            'circle-blur': 0.2,
            'circle-opacity': 0.7,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff',
            'circle-stroke-opacity': 0.7
          },
          layout: { visibility: 'visible' }
        });
        console.log('[311 Animation] Source/layer created in alternative effect');
      }
    };

    if (map.current.isStyleLoaded()) {
      createSourceIfNeeded();
    } else {
      map.current.once('style.load', createSourceIfNeeded);
    }
  }, [map, all311Features]);

  // 2. Update data for both power outage and debris animation layers when animationTime changes
  useEffect(() => {
    if (!map.current) return;
    // Power outage layer
    if (all311Features.length) {
      const sourceId = 'power-outages-beryl';
      const source = map.current.getSource(sourceId);
      if (source) {
        const filtered = animationTime
          ? all311Features.filter(f => new Date(f.properties.created_date) <= animationTime)
          : [];
        const geojson = { type: 'FeatureCollection', features: filtered };
        source.setData(geojson);
      }
    }
    // Debris layer
    if (allDebrisFeatures.length) {
      const sourceId = 'debris-animation';
      const source = map.current.getSource(sourceId);
      if (source) {
        const filtered = animationTime
          ? allDebrisFeatures.filter(f => new Date(f.properties.created_date) <= animationTime)
          : [];
        const geojson = { type: 'FeatureCollection', features: filtered };
        source.setData(geojson);
      }
    }
  }, [animationTime, all311Features, allDebrisFeatures, map]);

  // 3. Animation logic: by day, stop at end, hide all markers when finished
  useEffect(() => {
    if (!isAnimating || !animationRange[0] || !animationRange[1] || uniqueDays.length === 0) return;
    
    // Check if source exists before starting animation
    const sourceId = 'power-outages-beryl';
    if (!map.current || !map.current.getSource(sourceId)) {
      console.log('[311 Animation] Source not found, cannot start animation');
      setIsAnimating(false);
      return;
    }
    
    const steps = uniqueDays.length;
    const stepMs = 1000;
    let currentStep = uniqueDays.findIndex(day => animationTime && animationTime.toISOString().slice(0, 10) === day);

    function animateStep() {
      if (!isAnimating) return;
      
      // Check if source still exists
      if (!map.current || !map.current.getSource(sourceId)) {
        console.log('[311 Animation] Source lost during animation, stopping');
        setIsAnimating(false);
        return;
      }
      
      currentStep++;
      if (currentStep >= steps) {
        setIsAnimating(false);
        setAnimationTime(null); // Hide all markers when animation ends
        console.log('[311 Animation] Animation finished. All markers hidden. User must hit play to restart.');
        return;
      }
      setAnimationTime(new Date(uniqueDays[currentStep] + 'T23:59:59'));
      animationTimerRef.current = setTimeout(animateStep, stepMs);
    }
    animationTimerRef.current = setTimeout(animateStep, stepMs);
    return () => clearTimeout(animationTimerRef.current);
  }, [isAnimating, animationRange, animationTime, uniqueDays, map]);

  // --- Cumulative call count logic for sliders ---
  const [outageCumulativeCounts, setOutageCumulativeCounts] = useState([]);
  const [debrisCumulativeCounts, setDebrisCumulativeCounts] = useState([]);
  const [outageDayToCount, setOutageDayToCount] = useState([]);
  const [debrisDayToCount, setDebrisDayToCount] = useState([]);

  // Compute unique days and cumulative counts for each dataset
  useEffect(() => {
    if (!all311Features.length) return;
    const days = Array.from(new Set(all311Features.map(f => f.properties.created_date.slice(0, 10)))).sort();
    let cum = 0;
    const counts = days.map(day => {
      const count = all311Features.filter(f => f.properties.created_date.slice(0, 10) === day).length;
      cum += count;
      return cum;
    });
    setOutageCumulativeCounts(counts);
    setOutageDayToCount(days.map((day, i) => ({ day, count: counts[i] })));
  }, [all311Features]);

  useEffect(() => {
    if (!allDebrisFeatures.length) return;
    const days = Array.from(new Set(allDebrisFeatures.map(f => f.properties.created_date.slice(0, 10)))).sort();
    let cum = 0;
    const counts = days.map(day => {
      const count = allDebrisFeatures.filter(f => f.properties.created_date.slice(0, 10) === day).length;
      cum += count;
      return cum;
    });
    setDebrisCumulativeCounts(counts);
    setDebrisDayToCount(days.map((day, i) => ({ day, count: counts[i] })));
  }, [allDebrisFeatures]);

  // Helper to get the day for a given cumulative count (for slider interaction)
  function getDayForCumulativeCount(dayToCountArr, value) {
    for (let i = 0; i < dayToCountArr.length; i++) {
      if (value <= dayToCountArr[i].count) {
        return dayToCountArr[i].day;
      }
    }
    return dayToCountArr[dayToCountArr.length - 1]?.day;
  }

  // --- Slider change handlers ---
  const handleOutageSliderChange = (e) => {
    const value = Number(e.target.value);
    setIsAnimating(false);
    if (outageDayToCount.length) {
      const day = getDayForCumulativeCount(outageDayToCount, value);
      if (day) setAnimationTime(new Date(day + 'T23:59:59'));
    }
  };
  const handleDebrisSliderChange = (e) => {
    const value = Number(e.target.value);
    setIsAnimating(false);
    if (debrisDayToCount.length) {
      const day = getDayForCumulativeCount(debrisDayToCount, value);
      if (day) setAnimationTime(new Date(day + 'T23:59:59'));
    }
  };

  // Slider: snap to days (end of day)
  const handleSliderChange = (e) => {
    const idx = Number(e.target.value);
    setAnimationTime(new Date(uniqueDays[idx] + 'T23:59:59'));
    setIsAnimating(false);
  };

  // Utility to set layer visibility
  const setLayerVisibility = (layerId, visible) => {
    if (map.current && map.current.getLayer(layerId)) {
      map.current.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
    }
  };

  // Show/hide animation-related layers
  const showAnimationLayers = () => {
    setLayerVisibility('community-center-1mile-circles', true);
    setLayerVisibility('churches-1mile', true);
    setLayerVisibility('community-centers', true); // Updated to 'community-centers'
  };
  const hideAnimationLayers = () => {
    setLayerVisibility('community-center-1mile-circles', false);
    setLayerVisibility('churches-1mile', false);
    setLayerVisibility('community-centers', false); // Updated to 'community-centers'
  };

  // --- Animation-specific marker logic (independent of sidebar) ---
  const ANIMATION_LAYERS = [
    {
      sourceId: 'animation-community-centers',
      layerId: 'animation-community-centers',
      url: '/houston-community-centers-vulnerability-4326.geojson',
      type: 'circle',
      paint: {
        'circle-radius': [
          'case',
          ['all', ['has', 'Square_Foo'], ['>', ['to-number', ['get', 'Square_Foo']], 0]],
            [
              'interpolate',
              ['linear'],
              ['to-number', ['get', 'Square_Foo'], 0],
              0, 4.8,
              2000, 6.4,
              5000, 9.6,
              10000, 14.4,
              20000, 19.2
            ],
            6.4
        ],
        'circle-color': '#FF00B7',
        'circle-stroke-width': 0,
        'circle-opacity': [
          'interpolate',
          ['linear'],
          ['get', 'vulnerability'],
          0, 0.1,
          1, 1.0
        ]
      }
    },
    {
      sourceId: 'animation-churches-1mile',
      layerId: 'animation-churches-1mile',
      url: '/houston_churches_1mile_community_centers.geojson',
      type: 'circle',
      paint: {
        'circle-color': '#8e44ad',
        'circle-radius': [
          'case',
          ['all', ['has', 'area_sqft'], ['>', ['to-number', ['get', 'area_sqft']], 0]],
          [
            'interpolate',
            ['linear'],
            ['to-number', ['get', 'area_sqft'], 0],
            0, 4.8,
            2000, 6.4,
            5000, 9.6,
            10000, 14.4,
            20000, 19.2
          ],
          6.4
        ],
        'circle-blur': 0.2,
        'circle-opacity': 0.7,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff',
        'circle-stroke-opacity': 0.7
      }
    },
    {
      sourceId: 'animation-1mile-circles',
      layerId: 'animation-1mile-circles',
      url: '/community_center_1mile_circles.geojson',
      type: 'line',
      paint: {
        'line-color': '#fff',
        'line-width': 2,
        'line-dasharray': [2, 4],
        'line-opacity': 1
      }
    }
  ];

  // Add animation layers
  const addAnimationLayers = async () => {
    if (!map.current) return;
    for (const { sourceId, layerId, url, type, paint } of ANIMATION_LAYERS) {
      // Fetch data
      let data;
      try {
        const res = await fetch(url);
        data = await res.json();
      } catch (e) {
        console.error(`[Animation] Failed to fetch ${url}:`, e);
        continue;
      }
      // Add source if not present
      if (!map.current.getSource(sourceId)) {
        map.current.addSource(sourceId, { type: 'geojson', data });
      } else {
        map.current.getSource(sourceId).setData(data);
      }
      // Add layer if not present
      if (!map.current.getLayer(layerId)) {
        map.current.addLayer({
          id: layerId,
          type,
          source: sourceId,
          paint,
          layout: { visibility: 'visible' }
        });
      } else {
        map.current.setLayoutProperty(layerId, 'visibility', 'visible');
      }
    }
  };

  // Remove animation layers
  const removeAnimationLayers = () => {
    if (!map.current) return;
    for (const { sourceId, layerId } of ANIMATION_LAYERS) {
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
    }
    // Remove debris animation layer
    if (map.current.getLayer('debris-animation')) map.current.removeLayer('debris-animation');
    if (map.current.getSource('debris-animation')) map.current.removeSource('debris-animation');
  };

  // Update handlePlayPause to use new logic
  const handlePlayPause = async () => {
    if (!isAnimating) {
      // Ensure power outage source exists before starting animation
      const sourceId = 'power-outages-beryl';
      const layerId = 'power-outages-beryl';
      if (!map.current.getSource(sourceId) && all311Features.length > 0) {
        console.log('[311 Animation] Creating source on play button click');
        const geojson = { type: 'FeatureCollection', features: [] };
        map.current.addSource(sourceId, { type: 'geojson', data: geojson });
        map.current.addLayer({
          id: layerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 7,
            'circle-color': '#ff3333',
            'circle-blur': 0.2,
            'circle-opacity': 0.7,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff',
            'circle-stroke-opacity': 0.7
          },
          layout: { visibility: 'visible' }
        });
      }
      // Ensure debris animation source/layer exists before starting animation
      const debrisSourceId = 'debris-animation';
      const debrisLayerId = 'debris-animation';
      if (!map.current.getSource(debrisSourceId) && allDebrisFeatures.length > 0) {
        console.log('[Debris Animation] Creating source on play button click');
        const geojson = { type: 'FeatureCollection', features: [] };
        map.current.addSource(debrisSourceId, { type: 'geojson', data: geojson });
        map.current.addLayer({
          id: debrisLayerId,
          type: 'circle',
          source: debrisSourceId,
          paint: {
            'circle-radius': 4,
            'circle-color': '#39FF14',
            'circle-blur': 0.2,
            'circle-opacity': 0.85
          },
          layout: { visibility: 'visible' }
        });
      }
      // Add animation marker layers
      await addAnimationLayers();
      // If animationTime is null (no markers showing), start from the first day
      if (animationTime === null && uniqueDays.length > 0) {
        setAnimationTime(new Date(uniqueDays[0] + 'T23:59:59'));
      }
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
      // Remove animation marker layers
      removeAnimationLayers();
    }
  };

  // Also remove animation layers when animation ends
  useEffect(() => {
    if (!isAnimating) {
      removeAnimationLayers();
    }
  }, [isAnimating]);

  // 2. Add useEffect for Tree Debris markers and 1-mile circles
  useEffect(() => {
    if (!map.current) return;
    const debrisSourceId = 'tree-debris';
    const debrisLayerId = 'tree-debris';
    const circleSourceId = 'tree-debris-1mile-circles';
    const circleLayerId = 'tree-debris-1mile-circles';

    if (showTreeDebris) {
      // Add debris markers without clustering
      if (!map.current.getSource(debrisSourceId)) {
        fetch('/debris_calls_2024-07-08_to_2024-07-30.geojson')
          .then(res => res.json())
          .then(data => {
            map.current.addSource(debrisSourceId, {
              type: 'geojson',
              data
            });
            map.current.addLayer({
              id: debrisLayerId,
              type: 'circle',
              source: debrisSourceId,
              paint: {
                'circle-radius': 4, // 50% smaller
                'circle-color': '#39FF14', // Highlight green
                'circle-blur': 0.2,
                'circle-opacity': 0.85
              },
              layout: { visibility: 'visible' }
            });
          });
      } else {
        map.current.setLayoutProperty(debrisLayerId, 'visibility', 'visible');
      }
      // Add 1-mile circles
      if (!map.current.getSource(circleSourceId)) {
        fetch('/community_center_1mile_circles.geojson')
          .then(res => res.json())
          .then(data => {
            map.current.addSource(circleSourceId, { type: 'geojson', data });
            map.current.addLayer({
              id: circleLayerId,
              type: 'line',
              source: circleSourceId,
              paint: {
                'line-color': '#fff',
                'line-width': 2,
                'line-dasharray': [2, 4],
                'line-opacity': 1
              },
              layout: { visibility: 'visible' }
            });
          });
      } else {
        map.current.setLayoutProperty(circleLayerId, 'visibility', 'visible');
      }
    } else {
      // Remove/hide debris markers and circles
      if (map.current.getLayer(debrisLayerId)) map.current.removeLayer(debrisLayerId);
      if (map.current.getSource(debrisSourceId)) map.current.removeSource(debrisSourceId);
      if (map.current.getLayer(circleLayerId)) map.current.removeLayer(circleLayerId);
      if (map.current.getSource(circleSourceId)) map.current.removeSource(circleSourceId);
    }
  }, [showTreeDebris, map]);

  // Debug: Log uniqueDays and animationTime
  useEffect(() => {
    console.log('[DEBUG] uniqueDays:', uniqueDays);
  }, [uniqueDays]);
  useEffect(() => {
    console.log('[DEBUG] animationTime:', animationTime);
  }, [animationTime]);
  // Debug: Log debris features being set each frame
  useEffect(() => {
    if (!map.current) return;
    if (allDebrisFeatures.length) {
      const source = map.current.getSource('debris-animation');
      if (source) {
        const filtered = animationTime
          ? allDebrisFeatures.filter(f => new Date(f.properties.created_date) <= animationTime)
          : [];
        console.log(`[DEBUG] Setting ${filtered.length} debris features at`, animationTime);
      }
    }
  }, [animationTime, allDebrisFeatures, map]);

  return (
    <MapContainer>
      <div ref={mapContainer} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <PopupManager map={map} />
      <ErcotManager ref={ercotManagerRef} map={map} isErcotMode={isErcotMode} setIsErcotMode={setIsErcotMode} />
      {/* Render both legends if both are visible */}
      {(isCommunityCentersVisible || showCensusBlockDemographic) && (
        <div style={{ position: 'absolute', bottom: 24, left: 24, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          {isCommunityCentersVisible && <Legend visible={false} showVulnerability={true} slideUp={showCensusBlockDemographic} position="left" />}
          {showCensusBlockDemographic && <Legend visible={true} showVulnerability={false} position="left" />}
        </div>
      )}
      
      <LayerToggle
        map={map}
        isLayerMenuCollapsed={isLayerMenuCollapsed}
        setIsLayerMenuCollapsed={setIsLayerMenuCollapsed}
        isErcotMode={isErcotMode}
        setIsErcotMode={setIsErcotMode}
        showRoadGrid={showRoadGrid}
        setShowRoadGrid={setShowRoadGrid}
        showMUDLayer={showMUDLayer}
        setShowMUDLayer={setShowMUDLayer}
        showHarveyData={showHarveyData}
        setShowHarveyData={setShowHarveyData}
        showSurfaceWater={showSurfaceWater}
        setShowSurfaceWater={setShowSurfaceWater}
        showWastewaterOutfalls={showWastewaterOutfalls}
        setShowWastewaterOutfalls={setShowWastewaterOutfalls}
        showZipCodes={showZipCodes}
        setShowZipCodes={setShowZipCodes}
        showZipFloodAnalysis={showZipFloodAnalysis}
        setShowZipFloodAnalysis={setShowZipFloodAnalysis}
        showAIConsensus={showAIConsensus}
        setShowAIConsensus={setShowAIConsensus}
        showCensusBlocks={showCensusBlocks}
        setShowCensusBlocks={setShowCensusBlocks}
        showCensusBlockDemographic={showCensusBlockDemographic}
        setShowCensusBlockDemographic={setShowCensusBlockDemographic}
        showCommunityCenters={showCommunityCenters}
        setShowCommunityCenters={setShowCommunityCenters}
        showFlood100={showFlood100}
        setShowFlood100={setShowFlood100}
        showFlood500={showFlood500}
        setShowFlood500={setShowFlood500}
        showFloodplainDistanceLines={showFloodplainDistanceLines}
        setShowFloodplainDistanceLines={setShowFloodplainDistanceLines}
        fetchErcotData={() => ercotManagerRef.current?.fetchErcotData()}
        loadHarveyData={loadHarveyData}
        showGasStations={showGasStations2Mile}
        setShowGasStations={setShowGasStations2Mile}
        showGasStations1Mile={showGasStations1Mile}
        setShowGasStations1Mile={setShowGasStations1Mile}
        showGasStations2Mile={showGasStations2Mile}
        setShowGasStations2Mile={setShowGasStations2Mile}
        showPowerOutages={showPowerOutages}
        setShowPowerOutages={setShowPowerOutages}
        showChurches1Mile={showChurches1Mile}
        setShowChurches1Mile={setShowChurches1Mile}
        showTreeDebris={showTreeDebris}
        setShowTreeDebris={setShowTreeDebris}
      />

        <ToggleButton 
          $active={showRoadParticles}
          onClick={() => setShowRoadParticles(!showRoadParticles)}
          style={{ height: '32px', padding: '0 12px', fontSize: '14px', marginBottom: '8px' }}
        >
          {showRoadParticles ? 'Hide Flow' : 'Show Flow'}
        </ToggleButton>

        {/* 3D Mode Toggle Button */}
        <Toggle3DButton 
          $active={is3DActive}
          onClick={toggle3D}
          aria-label="Toggle 3D view"
        >
          {is3DActive ? '2D' : '3D'}
        </Toggle3DButton>
        
        {/* Rotation Button */}
        <RotateButton 
          onClick={rotateMap}
          aria-label="Rotate map"
        >
          ↻
        </RotateButton>

      <AIChatPanel 
        messages={messages}
        setMessages={setMessages}
        isLoading={isLoading}
        loadingMessage={loadingMessage}
        inputValue={inputValue}
        setInputValue={setInputValue}
        handleQuestion={async (question) => {
          try {
            const response = await handleQuestion(question, {
              center: map.current.getCenter(),
              zoom: map.current.getZoom()
            });
            return response;
          } catch (error) {
            console.error('Error handling question:', error);
            return null;
          }
        }}
        map={map.current}
        initialCollapsed={true}
      />

      {isCalculating && (
        <div style={{
          position: 'absolute',
          top: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'rgba(0,0,0,0.8)',
          color: '#fff',
          padding: '16px 32px',
          borderRadius: 8,
          fontSize: 18,
          fontWeight: 600,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          Calculating distance line...
        </div>
      )}

      {/* Animation Panel */}
      <div style={{
        position: 'fixed',
        left: 24,
        bottom: 24,
        zIndex: 1001,
        background: 'rgba(20,20,30,0.95)',
        color: '#fff',
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        padding: '20px 28px 18px 28px',
        minWidth: 340,
        maxWidth: 420,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 12
      }}>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>Power Outage Calls</div>
        <input
          type="range"
          min={0}
          max={outageCumulativeCounts.length ? outageCumulativeCounts[outageCumulativeCounts.length - 1] : 0}
          value={(() => {
            if (!animationTime || !outageDayToCount.length) return 0;
            const idx = outageDayToCount.findIndex(d => new Date(d.day + 'T23:59:59').getTime() >= animationTime.getTime());
            return idx >= 0 ? outageCumulativeCounts[idx] : 0;
          })()}
          onChange={handleOutageSliderChange}
          style={{ flex: 1, marginBottom: 8 }}
          disabled={!outageCumulativeCounts.length}
        />
        <div style={{ fontSize: 16, color: '#aaa', marginBottom: 12, fontWeight: 500 }}>
          {(() => {
            if (!animationTime || !outageDayToCount.length) return 'No data shown';
            const idx = outageDayToCount.findIndex(d => new Date(d.day + 'T23:59:59').getTime() >= animationTime.getTime());
            return idx >= 0 ? `${outageCumulativeCounts[idx]} calls as of ${outageDayToCount[idx].day}` : 'No data shown';
          })()}
        </div>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>Tree &amp; Natural Debris</div>
        <input
          type="range"
          min={0}
          max={debrisCumulativeCounts.length ? debrisCumulativeCounts[debrisCumulativeCounts.length - 1] : 0}
          value={(() => {
            if (!animationTime || !debrisDayToCount.length) return 0;
            const idx = debrisDayToCount.findIndex(d => new Date(d.day + 'T23:59:59').getTime() >= animationTime.getTime());
            return idx >= 0 ? debrisCumulativeCounts[idx] : 0;
          })()}
          onChange={handleDebrisSliderChange}
          style={{ flex: 1, marginBottom: 8 }}
          disabled={!debrisCumulativeCounts.length}
        />
        <div style={{ fontSize: 16, color: '#aaa', marginBottom: 12, fontWeight: 500 }}>
          {(() => {
            if (!animationTime || !debrisDayToCount.length) return 'No data shown';
            const idx = debrisDayToCount.findIndex(d => new Date(d.day + 'T23:59:59').getTime() >= animationTime.getTime());
            return idx >= 0 ? `${debrisCumulativeCounts[idx]} calls as of ${debrisDayToCount[idx].day}` : 'No data shown';
          })()}
        </div>
        <button
          onClick={handlePlayPause}
          style={{
            background: isAnimating ? '#e74c3c' : '#27ae60',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '8px 18px',
            fontWeight: 600,
            fontSize: 16,
            cursor: 'pointer',
            marginTop: 8
          }}
        >
          {isAnimating ? 'Pause' : 'Play'}
        </button>
      </div>
    </MapContainer>
  );
};

export default MapComponent;



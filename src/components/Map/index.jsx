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

  // Add these refs for drag functionality
  const isDraggingRef = useRef(false);
  const currentXRef = useRef(0);
  const currentYRef = useRef(0);
  const initialXRef = useRef(0);
  const initialYRef = useRef(0);
  const xOffsetRef = useRef(0);
  const yOffsetRef = useRef(0);
  const popupRef = useRef(null);

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

  // 2. Update data when animationTime changes
  useEffect(() => {
    if (!map.current || !all311Features.length) return;
    const sourceId = 'power-outages-beryl';
    const source = map.current.getSource(sourceId);
    
    // Only update if source exists
    if (source) {
      // If animationTime is null, show no markers (empty feature collection)
      const filtered = animationTime
        ? all311Features.filter(f => new Date(f.properties.created_date) <= animationTime)
        : [];
      const geojson = { type: 'FeatureCollection', features: filtered };
      source.setData(geojson);
      console.log(`[311 Animation] Setting ${filtered.length} features at ${animationTime}`);
      if (filtered.length > 0) {
        console.log('[311 Animation] First feature:', filtered[0]);
      }
    } else {
      console.log('[311 Animation] Source not found, skipping update');
    }
    console.log('[311 Animation] Current animationTime:', animationTime, 'Unique days:', uniqueDays);
  }, [animationTime, all311Features, map, uniqueDays]);

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

  // Slider: snap to days (end of day)
  const handleSliderChange = (e) => {
    const idx = Number(e.target.value);
    setAnimationTime(new Date(uniqueDays[idx] + 'T23:59:59'));
    setIsAnimating(false);
  };

  const handlePlayPause = () => {
    if (!isAnimating) {
      // Ensure source exists before starting animation
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
      
      // If animationTime is null (no markers showing), start from the first day
      if (animationTime === null && uniqueDays.length > 0) {
        setAnimationTime(new Date(uniqueDays[0] + 'T23:59:59'));
      }
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
    }
  };

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
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>Beryl 311 Outage Reports</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>
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
              marginRight: 8
            }}
          >
            {isAnimating ? 'Pause' : 'Play'}
          </button>
          <input
            type="range"
            min={0}
            max={uniqueDays.length - 1}
            value={animationTime ? uniqueDays.findIndex(day => animationTime.toISOString().slice(0, 10) === day) : 0}
            onChange={handleSliderChange}
            style={{ flex: 1 }}
            disabled={uniqueDays.length === 0}
          />
        </div>
        <div style={{ fontSize: 13, color: '#aaa', marginTop: 2 }}>
          {animationTime ? animationTime.toLocaleDateString() : 'No data shown'}
        </div>
      </div>
    </MapContainer>
  );
};

export default MapComponent;



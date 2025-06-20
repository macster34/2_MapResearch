import React, { useRef, useEffect, useState } from 'react';
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
import { handleCommunityCenterClick as handleCommunityCenterClickEvent, handleCensusBlockClick as handleCensusBlockClickEvent, handleCensusBlockDemographicClick as handleCensusBlockDemographicClickEvent } from './handlers/mapEventHandlers';

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

  // Add these refs for drag functionality
  const isDraggingRef = useRef(false);
  const currentXRef = useRef(0);
  const currentYRef = useRef(0);
  const initialXRef = useRef(0);
  const initialYRef = useRef(0);
  const xOffsetRef = useRef(0);
  const yOffsetRef = useRef(0);
  const popupRef = useRef(null);

  const { initializeParticleLayer, generateParticles } = useAIConsensusAnimation(map, showAIConsensus, mockDisagreementData);
  useMapInitialization(map, mapContainer);

  const ercotManagerRef = useRef(null);

  const floodplainToggleRef = useRef(showFloodplainDistanceLines);
  const floodplainDataRef = useRef(floodplain100Data);

  useEffect(() => { floodplainToggleRef.current = showFloodplainDistanceLines; }, [showFloodplainDistanceLines]);
  useEffect(() => { floodplainDataRef.current = floodplain100Data; }, [floodplain100Data]);

  useEffect(() => {
    if (map.current) {
      if (showRoadGrid) {
        initializeRoadGrid(map.current, {
          minzoom: 5,
          maxzoom: 22
        });
      } else {
        if (map.current.getLayer('road-grid')) {
          map.current.removeLayer('road-grid');
        }
      }
    }
  }, [showRoadGrid]);

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

  useCommunityCentersLayer(map, showCommunityCenters, (feature, lngLat) =>
    handleCommunityCenterClickEvent({
      map,
      floodplainToggleRef,
      floodplainDataRef,
      setIsCalculating,
      setSelectedCenter,
      calcFloodplainDistanceLines,
      createFloodplainDistancePopup,
      createCommunityCenterPopup,
      feature,
      lngLat
    })
  );

  useFloodPlainsLayer(map, showFlood100, showFlood500);

  // Load community centers and floodplain data once
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ccRes, fpRes] = await Promise.all([
          fetch('/houston-texas-community-centers.geojson'),
          fetch('/houston-texas-flood-100-500.geojson')
        ]);
        if (!ccRes.ok || !fpRes.ok) {
          throw new Error('One or both data files not found or not accessible');
        }
        const ccData = await ccRes.json();
        const fpData = await fpRes.json();
        // Only keep 100-year floodplain polygons
        const flood100 = {
          ...fpData,
          features: fpData.features.filter(f =>
            ['AE', 'A', 'AO', 'VE'].includes(f.properties.FLD_ZONE)
          )
        };
        setCommunityCentersData(ccData);
        setFloodplain100Data(flood100);
        console.log('Floodplain data loaded:', flood100);
      } catch (e) {
        console.error('Error loading community centers or floodplain data:', e);
        setCommunityCentersData(null);
        setFloodplain100Data(null);
      }
    };
    fetchData();
  }, []);

  // Effect to draw/remove the line for the selected center
  useEffect(() => {
    if (!map.current) return;
    const sourceId = 'floodplain-distance-line';
    const layerId = 'floodplain-distance-line';
    if (map.current.getLayer(layerId)) map.current.removeLayer(layerId);
    if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);
    if (
      showFloodplainDistanceLines &&
      selectedCenter &&
      communityCentersData &&
      floodplain100Data &&
      floodplain100Data.features?.length
    ) {
      setIsCalculating(true);
      setTimeout(() => {
        const singleCenter = {
          type: 'FeatureCollection',
          features: [selectedCenter]
        };
        const linesGeojson = calcFloodplainDistanceLines(singleCenter, floodplain100Data);
        if (linesGeojson.features.length) {
          map.current.addSource(sourceId, { type: 'geojson', data: linesGeojson });
          map.current.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#00BFFF',
              'line-width': 2,
              'line-dasharray': [2, 2]
            }
          });
        }
        setIsCalculating(false);
      }, 10); // Let the spinner render
    } else {
      setIsCalculating(false);
    }
    return () => {
      if (map.current.getLayer(layerId)) map.current.removeLayer(layerId);
      if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);
    };
  }, [showFloodplainDistanceLines, selectedCenter, communityCentersData, floodplain100Data, map]);

  useEffect(() => {
    if (showFloodplainDistanceLines) {
      setShowCommunityCenters(true);
      setShowFlood100(true);
    }
  }, [showFloodplainDistanceLines]);

  useEffect(() => {
    console.log('Floodplain Distance Lines toggle changed:', showFloodplainDistanceLines);
  }, [showFloodplainDistanceLines]);

  return (
    <MapContainer>
      <div ref={mapContainer} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <PopupManager map={map} />
      <ErcotManager ref={ercotManagerRef} map={map} isErcotMode={isErcotMode} setIsErcotMode={setIsErcotMode} />
      <Legend visible={showCensusBlockDemographic} />
      
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
    </MapContainer>
  );
};

export default MapComponent;


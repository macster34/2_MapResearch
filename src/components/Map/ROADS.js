import React, { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as turf from '@turf/turf';
import { useMapLogic } from '../../hooks/useMapLogic';
import BuildingPopup from './BuildingPopup';
import { MapContext } from './MapContext';
import { roadLayers, trafficLayers, trafficAnimationLayers, generateParticles } from './mapLayers';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

function Map({ articles = [], onArticleUpdate }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  const selectedBuildingLayerId = 'selected-building';
  const [mapLoaded, setMapLoaded] = useState(false);
  const [trafficData, setTrafficData] = useState(null);

  const {
    lng, lat, zoom, selectedArticle, popupCoordinates, handleMapLoad,
    handleValidate, handleMatchResults, showComparison, validationError, 
    isValidating, retryCount, MAX_RETRIES, lastValidationTime, 
    showTypewriter, matchedResults, validatedData, validationScore,
    handleAnalysis, getBuildingShape, handleBackToOriginal,
    handleMarkerClick
  } = useMapLogic(map, mapContainer, articles, onArticleUpdate);

  // Add animation frame ref
  const animationFrame = useRef(null);

  const createMarkers = () => {
    console.log('Creating markers for', articles.length, 'articles');
    
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    articles.forEach(article => {
      if (!article.location?.latitude || !article.location.longitude) {
        console.log('Skipping article without location');
        return;
      }

      const markerElement = document.createElement('div');
      markerElement.className = 'custom-marker';
      Object.assign(markerElement.style, {
        width: '15px',
        height: '15px',
        backgroundColor: '#FF4136',
        borderRadius: '50%',
        cursor: 'pointer',
        boxShadow: '0 0 10px rgba(0,0,0,0.9)',
        zIndex: '1'
      });

      const marker = new mapboxgl.Marker({
        element: markerElement,
        anchor: 'center'
      })
        .setLngLat([article.location.longitude, article.location.latitude])
        .addTo(map.current);

      markerElement.addEventListener('click', () => {
        console.log('Marker clicked:', article.location.address);
        handleMarkerClick(article);
      });

      markersRef.current.push(marker);
    });
    
    console.log('Created', markersRef.current.length, 'markers');
  };

  // Initialize map
  useEffect(() => {
    console.log('Map initialization effect triggered');
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-81.6557, 30.3322],
      zoom: 12,
      pitch: 44,
      bearing: 10,
      antialias: true,
      minZoom: 2,
      maxZoom: 40,
      maxBounds: [[-180, -85], [180, 85]],
      preserveDrawingBuffer: false,
      renderWorldCopies: false,
      trackResize: true,
      fadeDuration: 0
    });

    // Optimize performance by limiting tile loading
    map.current.on('style.load', () => {
      // Remove all labels and symbols more aggressively
      const layers = map.current.getStyle().layers;
      for (const layer of layers) {
        if (layer.type === 'symbol' || 
            layer.type === 'text' || 
            layer.id.includes('label') || 
            layer.id.includes('text') ||
            layer.id.includes('place') ||
            layer.id.includes('poi')) {
          map.current.removeLayer(layer.id);
        }
      }

      // Add road layers
      map.current.addLayer({
        'id': 'road-primary',
        'type': 'line',
        'source': 'composite',
        'source-layer': 'road',
        'filter': ['==', 'class', 'primary'],
        'paint': {
          'line-color': '#FF4136',
          'line-width': 2,
          'line-opacity': 0.8
        }
      });

      map.current.addLayer({
        'id': 'road-secondary',
        'type': 'line',
        'source': 'composite',
        'source-layer': 'road',
        'filter': ['==', 'class', 'secondary'],
        'paint': {
          'line-color': '#FFDC00',
          'line-width': 1.5,
          'line-opacity': 0.7
        }
      });

      map.current.addLayer({
        'id': 'road-street',
        'type': 'line',
        'source': 'composite',
        'source-layer': 'road',
        'filter': ['==', 'class', 'street'],
        'paint': {
          'line-color': '#2ECC40',
          'line-width': 1,
          'line-opacity': 0.6
        }
      });

      // Add the building source with optimized settings
      map.current.addSource('composite-3d-buildings', {
        type: 'vector',
        url: 'mapbox://mapbox.mapbox-streets-v8',
        maxzoom: 15,
        minzoom: 15,
        tileSize: 512,
        tolerance: 0.5
      });

      // Add 3D buildings layer with improved visibility and fixed ambient occlusion
      map.current.addLayer({
        'id': '3d-buildings',
        'type': 'fill-extrusion',
        'source': 'composite-3d-buildings',
        'source-layer': 'building',
        'paint': {
          'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['get', 'height'],
            0, '#050505',    // Nearly pure black for shortest buildings
            50, '#080808',   // Just slightly lighter black for medium buildings
            100, '#0a0a0a'   // Barely distinguishable from black for tallest buildings
          ],
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'height']
          ],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'min_height']
          ],
          'fill-extrusion-opacity': 0.8,
        },
        'filter': ['==', 'extrude', 'true']
      });

      // Add error handling for tile loading with proper null checks
      map.current.on('error', (e) => {
        // Safely check if error exists and has a url property
        if (e && e.error) {
          const errorUrl = e.error.url || '';
          
          // Ignore mapbox-related 404 errors
          if (e.error.status === 404 && errorUrl.includes('mapbox')) {
            return;
          }
          
          // Only log non-mapbox errors
          if (!errorUrl.includes('mapbox')) {
            console.error('Critical map error:', e.error);
          }
        }
      });

      // Add source for selected building with optimized settings
      map.current.addSource('selected-building', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        },
        maxzoom: 20,
        tolerance: 0.5,
        buffer: 0 // Reduce memory usage
      });

      // Optimize tile loading without using preventDefault
      map.current.on('sourcedataloading', (e) => {
        if (e.isSourceLoaded) return;
        
        // Instead of preventing the event, we can control tile loading through the source
        const zoom = map.current.getZoom();
        if (zoom < 10 || zoom > 20) {
          const source = map.current.getSource(e.sourceId);
          if (source && typeof source.setTiles === 'function') {
            source.setTiles([]);
          }
        }
      });

      // Add selected building layer
      map.current.addLayer({
        'id': 'selected-building',
        'type': 'model',
        'source': 'selected-building',
        'slot': 'middle',
        'paint': {
          'model-opacity': 1.0,
          'model-color': '#FF4136',
          'model-cast-shadows': true,
          'model-emissive-strength': 2.0,
          'model-color-mix-intensity': 1.0,
          'model-ambient-occlusion-intensity': 0.3,
          'model-ambient-occlusion-constant': 0.7
        }
      });
    });

    // Optimize the load event
    map.current.on('load', () => {
      console.log('Map load event triggered');
      handleMapLoad();
      
      // Enable atmosphere and fog with reduced settings
      map.current.setFog({
        'range': [1, 8],
        'color': '#242B4B',
        'horizon-blend': 0.2
      });

      createMarkers();

      setMapLoaded(true);
    });

    // Clean up resources
    return () => {
      markersRef.current.forEach(marker => marker.remove());
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [handleMapLoad, lat, lng, zoom]);

  // Update markers when articles change
  useEffect(() => {
    if (map.current?.loaded()) {
      createMarkers();
    }
  }, [articles]);

  // Constants for source and layer names
  const BUILDING_SOURCE_ID = 'selected-building';
  const BUILDING_LAYER_ID = 'selected-building';

  // Helper function to ensure source exists
  const ensureSource = () => {
    if (!map.current) return null;
    
    try {
      let source = map.current.getSource(BUILDING_SOURCE_ID);
      if (!source) {
        // Create source if it doesn't exist
        map.current.addSource(BUILDING_SOURCE_ID, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });
        
        // Create layer if it doesn't exist
        if (!map.current.getLayer(BUILDING_LAYER_ID)) {
          map.current.addLayer({
            id: BUILDING_LAYER_ID,
            type: 'fill-extrusion',
            source: BUILDING_SOURCE_ID,
            paint: {
              'fill-extrusion-color': '#0066FF',
              'fill-extrusion-opacity': 0.8,
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'base_height']
            }
          });
        }
        
        source = map.current.getSource(BUILDING_SOURCE_ID);
      }
      return source;
    } catch (error) {
      console.error('Error ensuring source exists:', error);
      return null;
    }
  };

  // Helper function to validate coordinates
  const isValidCoordinate = (coord) => {
    return Array.isArray(coord) && 
           coord.length === 2 && 
           !isNaN(coord[0]) && 
           !isNaN(coord[1]) &&
           Math.abs(coord[0]) <= 180 && 
           Math.abs(coord[1]) <= 90;
  };

  // Helper function to validate and clean GeoJSON
  const createValidGeoJSON = (buildingShape) => {
    if (!buildingShape || !buildingShape.geometry) return null;

    try {
      const coordinates = buildingShape.geometry.coordinates;
      if (!Array.isArray(coordinates) || !coordinates.length) return null;

      // Validate all coordinates
      const validCoordinates = coordinates[0].filter(isValidCoordinate);
      if (validCoordinates.length < 3) return null;

      return {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {
            height: 30,
            base_height: 0
          },
          geometry: {
            type: 'Polygon',
            coordinates: [validCoordinates]
          }
        }]
      };
    } catch (error) {
      console.error('Error creating GeoJSON:', error);
      return null;
    }
  };

  useEffect(() => {
    if (!map.current || !map.current.loaded()) return;

    try {
      if (selectedArticle) {
        const buildingShape = getBuildingShape(selectedArticle);
        console.log('Building shape:', buildingShape); // Debug log
        
        const validGeoJSON = createValidGeoJSON(buildingShape);
        console.log('Valid GeoJSON:', validGeoJSON); // Debug log
        
        if (validGeoJSON) {
          const source = ensureSource();
          if (source) {
            source.setData(validGeoJSON);
          } else {
            console.warn('Failed to get or create source');
          }
        } else {
          console.warn('Invalid building shape data');
        }
      } else {
        // Clear selection
        const source = ensureSource();
        if (source) {
          source.setData({
            type: 'FeatureCollection',
            features: []
          });
        }
      }
    } catch (error) {
      console.error('Error updating building highlight:', error);
    }
  }, [selectedArticle, getBuildingShape]);

  const cleanupBuildingLayers = () => {
    if (!map.current) return;
    
    try {
      const layersToRemove = [
        'clip-layer',
        'highlighted-building',
        'highlighted-building-glow-outer',
        'highlighted-building-edges'
      ];
      
      layersToRemove.forEach(layerId => {
        if (map.current.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }
      });

      ['clip-area', 'highlighted-building'].forEach(sourceId => {
        if (map.current.getSource(sourceId)) {
          map.current.removeSource(sourceId);
        }
      });
    } catch (error) {
      console.error('Error cleaning up building layers:', error);
    }
  };

  // Add new useEffect to load traffic data
  useEffect(() => {
    console.log('Fetching traffic data...');
    fetch('/TrafficData.geojson')
      .then(response => response.json())
      .then(data => {
        console.log('Successfully loaded traffic data:', data);
        setTrafficData(data);
      })
      .catch(error => console.error('Error loading traffic data:', error));
  }, []);

  // Add traffic visualization when map loads
  useEffect(() => {
    if (!map.current || !trafficData) return;

    const addTrafficLayers = () => {
      console.log('Attempting to add traffic layers...');
      
      // Ensure map and style are loaded before adding layers
      if (!map.current.loaded() || !map.current.isStyleLoaded()) {
        console.log('Waiting for map and style to load...');
        map.current.once('style.load', addTrafficLayers);
        return;
      }

      try {
        // Check if source already exists and remove it
        if (map.current.getSource('traffic')) {
          console.log('Removing existing traffic source');
          trafficLayers.forEach(layer => {
            if (map.current.getLayer(layer.id)) map.current.removeLayer(layer.id);
          });
          map.current.removeSource('traffic');
        }

        // Add traffic data source
        map.current.addSource('traffic', {
          type: 'geojson',
          data: trafficData
        });
        console.log('Added traffic source with data:', trafficData);

        // Add traffic layers
        trafficLayers.forEach(layer => {
          map.current.addLayer(layer);
          console.log(`Added ${layer.id} layer`);
        });
      } catch (error) {
        console.error('Error adding traffic layers:', error);
      }
    };

    // Attempt to add layers
    addTrafficLayers();

    // Cleanup
    return () => {
      if (map.current) {
        trafficLayers.forEach(layer => {
          if (map.current.getLayer(layer.id)) map.current.removeLayer(layer.id);
        });
        if (map.current.getSource('traffic')) map.current.removeSource('traffic');
      }
    };
  }, [trafficData]);

  // Modify animation effect to also check for style loading
  useEffect(() => {
    if (!map.current || !trafficData) return;

    const initializeAnimation = () => {
      if (!map.current.loaded() || !map.current.isStyleLoaded()) {
        map.current.once('style.load', initializeAnimation);
        return;
      }

      // Initialize animation source and layers
      if (!map.current.getSource('traffic-animation')) {
        map.current.addSource('traffic-animation', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });

        trafficAnimationLayers.forEach(layer => {
          map.current.addLayer(layer);
        });
      }

      // Start animation
      animate();
    };

    const animate = () => {
      if (!map.current || !map.current.loaded()) {
        animationFrame.current = requestAnimationFrame(animate);
        return;
      }

      try {
        const source = map.current.getSource('traffic-animation');
        if (source) {
          const particles = generateParticles(trafficData, Date.now(), map.current);
          source.setData(particles);
        }
      } catch (error) {
        console.error('Animation error:', error);
      }

      animationFrame.current = requestAnimationFrame(animate);
    };

    // Initialize animation
    initializeAnimation();

    // Cleanup
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
      if (map.current) {
        trafficAnimationLayers.forEach(layer => {
          if (map.current.getLayer(layer.id)) {
            map.current.removeLayer(layer.id);
          }
        });
        if (map.current.getSource('traffic-animation')) {
          map.current.removeSource('traffic-animation');
        }
      }
    };
  }, [trafficData]);

  return (
    <MapContext.Provider value={{ map, getBuildingShape }}>
      <div className="relative w-full h-screen">
        <div ref={mapContainer} className="w-full h-full" />
        {selectedArticle && popupCoordinates && (
          <BuildingPopup
            selectedArticle={selectedArticle}
            popupCoordinates={popupCoordinates}
            handleBackToOriginal={handleBackToOriginal}
            handleValidate={handleValidate}
            handleMatchResults={handleMatchResults}
            showComparison={showComparison}
            validationError={validationError}
            isValidating={isValidating}
            retryCount={retryCount}
            MAX_RETRIES={MAX_RETRIES}
            lastValidationTime={lastValidationTime}
            showTypewriter={showTypewriter}
            matchedResults={matchedResults}
            validatedData={validatedData}
            validationScore={validationScore}
            handleAnalysis={handleAnalysis}
          />
        )}
      </div>
    </MapContext.Provider>
  );
}

export default Map;


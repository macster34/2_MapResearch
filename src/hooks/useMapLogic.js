import { useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import axios from 'axios';
import { polygon, buffer, length, polygonToLine } from '@turf/turf';

export const useMapLogic = (map, mapContainer, articles, onArticleUpdate) => {
  const [lng, setLng] = useState(-98.5795);
  const [lat, setLat] = useState(39.8283);
  const [zoom, setZoom] = useState(2);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [popupCoordinates, setPopupCoordinates] = useState(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [buildingShape, setBuildingShape] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showComparison, setShowComparison] = useState(false);
  const [validatedData, setValidatedData] = useState(null);
  const [validationScore, setValidationScore] = useState(null);
  const [lastValidationTime, setLastValidationTime] = useState(null);
  const [showTypewriter, setShowTypewriter] = useState(false);
  const [matchedResults, setMatchedResults] = useState(false);
  const MAX_RETRIES = 3;
  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClosePopup();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []); // Empty dependency array to ensure this effect runs once

  const handleMapLoad = () => {
    console.log('Map loaded');
    updateMarkers(articles);

    // Add 3D buildings layer if it doesn't exist
    if (!map.current.getLayer('3d-buildings')) {
      map.current.addLayer({
        'id': '3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 15,
        'paint': {
          'fill-extrusion-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#FF0000',
            '#aaa'
          ],
          'fill-extrusion-height': [
            'interpolate', ['linear'], ['zoom'],
            15, 0,
            15.05, ['get', 'height']
          ],
          'fill-extrusion-base': [
            'interpolate', ['linear'], ['zoom'],
            15, 0,
            15.05, ['get', 'min_height']
          ],
          'fill-extrusion-opacity': 0.6
        }
      });
    }

    map.current.on('click', 'markers', (e) => {
      if (e.features.length > 0) {
        const clickedArticle = articles.find(article => 
          article.location.address === e.features[0].properties.address
        );
        if (clickedArticle) {
          setSelectedArticle(clickedArticle);
          setPopupCoordinates(e.lngLat);
          map.current.flyTo({
            center: e.lngLat,
            zoom: 16,
            essential: true
          });
          highlightBuilding(e.lngLat.lng, e.lngLat.lat);
        }
      }
    });

    map.current.on('mouseenter', 'markers', () => {
      map.current.getCanvas().style.cursor = 'pointer';
    });

    map.current.on('mouseleave', 'markers', () => {
      map.current.getCanvas().style.cursor = '';
    });
  };

  const updateMarkers = (articles) => {
    if (!map.current || !map.current.getSource('markers')) return;

    const validArticles = articles.filter(article => 
      article && 
      article.location &&
      typeof article.location.latitude === 'number' && 
      typeof article.location.longitude === 'number' &&
      !isNaN(article.location.latitude) && 
      !isNaN(article.location.longitude)
    );

    const features = validArticles.map((article, index) => {
      const lat = article.location.latitude;
      const lng = article.location.longitude;
      const offset = index * 0.00005;

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng + offset, lat + offset]
        },
        properties: {
          address: article.location.address,
          title: article.title
        }
      };
    });

    console.log('Updating markers with features:', features);

    map.current.getSource('markers').setData({
      type: 'FeatureCollection',
      features: features
    });

    if (validArticles.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      validArticles.forEach(article => {
        const lat = article.location.latitude;
        const lng = article.location.longitude;
        if (lat && lng) {
          bounds.extend([lng, lat]);
        }
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }
  };

  const highlightBuilding = (lng, lat) => {
    if (selectedBuildingId) {
      map.current.setFeatureState(
        { source: 'composite', sourceLayer: 'building', id: selectedBuildingId },
        { selected: false }
      );
    }

    map.current.once('idle', () => {
      const point = map.current.project([lng, lat]);
      const width = 10;
      const height = 10;

      const features = map.current.queryRenderedFeatures(
        [
          [point.x - width / 2, point.y - height / 2],
          [point.x + width / 2, point.y + height / 2]
        ],
        { layers: ['3d-buildings'] }
      );

      if (features.length > 0) {
        const feature = features[0];
        setSelectedBuildingId(feature.id);
        map.current.setFeatureState(
          { source: 'composite', sourceLayer: 'building', id: feature.id },
          { selected: true }
        );
      }
    });
  };

  const handleAnalysis = () => {
    if (!selectedArticle || !selectedArticle.location) return;

    const { latitude, longitude } = selectedArticle.location;
    const shape = getBuildingShape(longitude, latitude);

    if (shape) {
      const perimeter = calculatePerimeter(shape);
      const core = extractBuildingCore(shape);

      console.log('Building Perimeter:', perimeter.toFixed(2), 'meters');

      // Add the building shape to the map
      if (map.current.getSource('building-shape')) {
        map.current.removeLayer('building-shape-layer');
        map.current.removeSource('building-shape');
      }

      map.current.addSource('building-shape', {
        type: 'geojson',
        data: shape
      });

      map.current.addLayer({
        id: 'building-shape-layer',
        type: 'fill',
        source: 'building-shape',
        paint: {
          'fill-color': '#FF4136',
          'fill-opacity': 0.5
        }
      });

      // Add the building core to the map
      if (map.current.getSource('building-core')) {
        map.current.removeLayer('building-core-layer');
        map.current.removeSource('building-core');
      }

      map.current.addSource('building-core', {
        type: 'geojson',
        data: core
      });

      map.current.addLayer({
        id: 'building-core-layer',
        type: 'fill',
        source: 'building-core',
        paint: {
          'fill-color': '#4CAF50',
          'fill-opacity': 0.5
        }
      });

      // Fly to the building with a top-down view
      map.current.flyTo({
        center: [longitude, latitude],
        zoom: 19,
        pitch: 0,
        bearing: 0
      });
    }
  };

  const getBuildingShape = (lng, lat) => {
    if (!map.current) return null;

    const point = map.current.project([lng, lat]);
    const width = 10;
    const height = 10;

    const features = map.current.queryRenderedFeatures(
      [
        [point.x - width / 2, point.y - height / 2],
        [point.x + width / 2, point.y + height / 2]
      ],
      { layers: ['3d-buildings'] }
    );

    if (features.length > 0) {
      const closestBuilding = features[0];
      const shape = polygon(closestBuilding.geometry.coordinates);
      setBuildingShape(shape);
      return shape;
    }

    return null;
  };

  const extractBuildingCore = (shape) => {
    if (!shape) return null;
    return buffer(shape, 65, { units: 'meters' });
  };

  const calculatePerimeter = (shape) => {
    if (!shape) return 0;
    return length(polygonToLine(shape), { units: 'meters' });
  };

  const handleValidate = async () => {
    if (!selectedArticle) {
      console.error('No article selected for validation');
      return;
    }

    setIsValidating(true);
    setShowTypewriter(true);
    setValidationError(null);


    
    const attemptValidation = async (attempt) => {
      try {
        console.log(`Sending validation request for: ${selectedArticle.location.address}, attempt ${attempt}`);
        console.log('API URL:', API_URL);
        const response = await axios.post(`${API_URL}/validate`, selectedArticle, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        console.log("Full response data:", response.data);

        if (response.data) {
          let originalData = response.data.original || selectedArticle;
          let updatedData = response.data.updated || response.data;

          setValidatedData({
            original: originalData,
            updated: updatedData
          });
          
          const score = calculateValidationScore(originalData, updatedData);
          setValidationScore(score);
          setLastValidationTime(new Date().toLocaleString());
          setShowComparison(true);
          setRetryCount(0);
          return;
        }
        
        throw new Error('Invalid response structure');
      } catch (error) {
        console.error('Error validating data:', error);
        console.error('Full error object:', error);
        console.error('Response data:', error.response?.data);
        console.error('Response status:', error.response?.status);
        
        if (attempt < MAX_RETRIES) {
          console.log(`Retrying validation (${attempt + 1}/${MAX_RETRIES})...`);
          setRetryCount(attempt);
          await new Promise(resolve => setTimeout(resolve, 2000));
          await attemptValidation(attempt + 1);
        } else {
          setValidationError(`Validation failed after ${MAX_RETRIES} attempts. Please try again later.`);
        }
      }
    };

    await attemptValidation(1);

    setIsValidating(false);
    setShowTypewriter(false);
  };

  const calculateValidationScore = (original, updated) => {
    if (!original || !updated) {
      console.error('Invalid input for calculateValidationScore:', { original, updated });
      return 0;
    }

    let matchingFields = 0;
    let totalFields = 0;

    for (const key in original) {
      if (original.hasOwnProperty(key) && updated.hasOwnProperty(key)) {
        totalFields++;
        if (JSON.stringify(original[key]) === JSON.stringify(updated[key])) {
          matchingFields++;
        }
      }
    }

    return totalFields > 0 ? (matchingFields / totalFields) * 100 : 0;
  };

  const handleMatchResults = async (event) => {
    event.preventDefault();
    console.log('Map: handleMatchResults called');

    try {
      const updatedDataWithOriginalLocation = {
        ...validatedData.updated,
        location: {
          ...validatedData.updated.location,
          latitude: selectedArticle.location.latitude,
          longitude: selectedArticle.location.longitude,
          address: selectedArticle.location.address
        },
        image_url: selectedArticle.image_url
      };

      console.log('Map: Sending request to /apply');
      const response = await axios.post(`${API_URL}/apply`, updatedDataWithOriginalLocation, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      console.log('Map: Received response from /apply:', response.data);
      if (response.data.status === 'success') {
        console.log('Map: Setting matchedResults to true');
        setMatchedResults(true);
        
        const updatedBuilding = response.data.updatedBuilding;
        
        console.log('Map: Updating validatedData');
        setValidatedData(prevState => ({
          original: selectedArticle,
          updated: updatedBuilding
        }));
        
        console.log('Map: Updating selectedArticle');
        setSelectedArticle(updatedBuilding);
        
        console.log('Map: Updating articles locally');
        const updatedArticles = articles.map(article => 
          article.location.address === updatedBuilding.location.address ? updatedBuilding : article
        );
        
        // Update markers
        updateMarkers(updatedArticles);
        
        console.log('Map: Setting timeout to reset matchedResults');
        setTimeout(() => {
          console.log('Map: Resetting matchedResults to false');
          setMatchedResults(false);
        }, 3000);
      } else {
        throw new Error('Server responded with non-success status');
      }
    } catch (error) {
      console.error('Map: Error matching results:', error);
      let errorMessage = 'Failed to match results. Please try again.';
      if (error.response) {
        console.error('Map: Error data:', error.response.data);
        console.error('Map: Error status:', error.response.status);
        errorMessage += ` Server responded with status ${error.response.status}.`;
      } else if (error.request) {
        console.error('Map: Error request:', error.request);
        errorMessage += ' No response received from server.';
      } else {
        console.error('Map: Error message:', error.message);
        errorMessage += ` Error: ${error.message}`;
      }
      console.log('Map: Setting error message:', errorMessage);
      setValidationError(errorMessage);
    }
    console.log('Map: handleMatchResults completed');
  };

  const handleClosePopup = () => {
    setSelectedArticle(null);
    setPopupCoordinates(null);
    onArticleUpdate(null); // Ensure this is called to update the parent state
  };

  return {
    lng, lat, zoom, selectedArticle, popupCoordinates, handleMapLoad, updateMarkers,
    handleValidate, handleMatchResults, showComparison, validationError, isValidating,
    retryCount, MAX_RETRIES, lastValidationTime, showTypewriter, matchedResults,
    validatedData, validationScore, handleAnalysis, handleClosePopup
  };
};

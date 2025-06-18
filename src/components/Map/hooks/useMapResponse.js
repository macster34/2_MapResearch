import mapboxgl from 'mapbox-gl';

export const handleLLMResponse = (map, response) => {
  if (response?.coordinates) {
    map.flyTo({
      center: response.coordinates,
      zoom: response.zoomLevel || 14,
      duration: 1000
    });

    map.once('moveend', () => {
      // Get all buildings in view and score them
      const buildings = map.queryRenderedFeatures({
        layers: ['3d-buildings']
      });
      
      // ... rest of the response handling code ...
    });
  }
}; 
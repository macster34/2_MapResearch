export const initializePOILayers = (map) => {
  console.log('Initializing POI layers');
  
  try {
    // Cleanup existing
    if (map.getLayer('poi-heat')) map.removeLayer('poi-heat');
    if (map.getSource('poi-heat')) map.removeSource('poi-heat');

    // Add source
    map.addSource('poi-heat', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });

    // Add layer with blue colors
    map.addLayer({
      id: 'poi-heat',
      type: 'heatmap',
      source: 'poi-heat',
      paint: {
        'heatmap-weight': 1,
        'heatmap-intensity': 1.5,
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0,128,255,0)',
          0.2, 'rgba(0,128,255,0.06)',
          0.4, 'rgba(0,128,255,0.12)',
          0.6, 'rgba(0,128,255,0.18)',
          0.8, 'rgba(0,128,255,0.24)',
          1, 'rgba(0,128,255,0.3)'
        ],
        'heatmap-radius': 40,
        'heatmap-opacity': 0.3
      }
    });

    return true;
  } catch (error) {
    console.error('Error initializing POI layers:', error);
    return false;
  }
};

export const applyPOIHighlights = (map) => {
  if (!map) return;
  
  try {
    if (map.getLayer('poi-heat')) {
      map.setPaintProperty('poi-heat', 'heatmap-opacity', 0.3);
      map.setPaintProperty('poi-heat', 'heatmap-intensity', 1.5);
      map.setPaintProperty('poi-heat', 'heatmap-radius', 40);
    }
  } catch (error) {
    console.error('Error applying POI highlights:', error);
  }
}; 
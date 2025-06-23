import mapboxgl from 'mapbox-gl';

// Event handler for community center clicks
export function handleCommunityCenterClick({
  map,
  showFloodplainDistanceLines,
  setSelectedCenter,
  createFloodplainDistancePopup,
  createCommunityCenterPopup,
  feature,
  lngLat,
  distanceLinesData
}) {
  console.log('[DEBUG] Community center click handler called', {
    showFloodplainDistanceLines,
    feature,
    lngLat,
    distanceLinesDataLoaded: !!distanceLinesData
  });
  // Remove any existing popups
  const existingPopups = document.getElementsByClassName('mapboxgl-popup');
  Array.from(existingPopups).forEach(popup => popup.remove());

  setSelectedCenter(feature); // Track the selected center

  // Store the feature and lngLat in closure
  const runPopupLogic = () => {
    console.log('[DEBUG] runPopupLogic called', { showFloodplainDistanceLines });
    // Always show the community center info popup at the marker
    createCommunityCenterPopup(map.current, lngLat, feature.properties);
    console.log('[DEBUG] Created community center popup');

    // If toggle is on, also show the line and distance popup
    if (showFloodplainDistanceLines && distanceLinesData?.features.length) {
      const centerCoords = feature.geometry.coordinates;
      const centerProps = feature.properties;
      console.log('[DEBUG] Clicked feature properties:', centerProps);
      console.log('[DEBUG] All line features properties:', distanceLinesData.features.map(f => f.properties));
      const lineFeature = distanceLinesData.features.find(f => {
        // Try to match by unique property first (e.g., ORIG_FID or Name/centerName)
        if (f.properties.ORIG_FID && centerProps.ORIG_FID && f.properties.ORIG_FID === centerProps.ORIG_FID) {
          return true;
        }
        if (
          (f.properties.Name && centerProps.Name && f.properties.Name === centerProps.Name) ||
          (f.properties.centerName && centerProps.Name && f.properties.centerName === centerProps.Name)
        ) {
          return true;
        }
        // Fallback: match by coordinates (as before)
        const c0 = f.properties.center_coords;
        return (
          c0 &&
          Math.abs(c0[0] - centerCoords[0]) < 1e-6 &&
          Math.abs(c0[1] - centerCoords[1]) < 1e-6
        );
      });
      
      if (lineFeature) {
        const distanceKm = lineFeature.properties.distance_km;
        const distanceMiles = typeof distanceKm === 'number' ? (distanceKm * 0.621371).toFixed(2) : null;
        
        const coords = lineFeature.geometry.coordinates;
        const midpoint = coords?.length === 2 ? [(coords[0][0] + coords[1][0]) / 2, (coords[0][1] + coords[1][1]) / 2] : null;
        
        // Draw the line on the map
        const sourceId = 'floodplain-distance-line';
        const layerId = 'floodplain-distance-line';
        if (map.current.getLayer(layerId)) map.current.removeLayer(layerId);
        if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);
        map.current.addSource(sourceId, { type: 'geojson', data: lineFeature });
        map.current.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          paint: { 'line-color': '#00BFFF', 'line-width': 2, 'line-dasharray': [2, 2] }
        });
        
        // Show the distance popup at the midpoint
        createFloodplainDistancePopup(map.current, midpoint || lngLat, distanceMiles);
        console.log('[DEBUG] Created distance line and popup', { midpoint, distanceMiles });
      } else {
        console.log('[DEBUG] No lineFeature found for this center');
      }
    }
    map.current.off('moveend', runPopupLogic); // Clean up the event listener
  };

  // Always fly to the marker, even if already centered
  map.current.flyTo({ center: lngLat, zoom: 15 });
  map.current.once('moveend', runPopupLogic);
}

// Event handler for census block click
export function handleCensusBlockClick({ map, formatCensusBlockPopup, feature, lngLat }) {
  const html = formatCensusBlockPopup(feature.properties);
  new mapboxgl.Popup()
    .setLngLat(lngLat)
    .setHTML(html)
    .addTo(map.current);
}

// Event handler for census block demographic click
export function handleCensusBlockDemographicClick({ map, formatCensusBlockDemographicPopup, feature, lngLat }) {
  const html = formatCensusBlockDemographicPopup(feature.properties);
  new mapboxgl.Popup()
    .setLngLat(lngLat)
    .setHTML(html)
    .addTo(map.current);
} 
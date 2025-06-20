import mapboxgl from 'mapbox-gl';

// Event handler for community center clicks
export function handleCommunityCenterClick({
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
}) {
  // Remove any existing popups
  const existingPopups = document.getElementsByClassName('mapboxgl-popup');
  Array.from(existingPopups).forEach(popup => popup.remove());

  const currentToggle = floodplainToggleRef.current;
  const currentFloodplainData = floodplainDataRef.current;

  setIsCalculating(true);
  map.current.flyTo({ center: lngLat, zoom: 15 });
  setSelectedCenter(feature); // Track the selected center
  if (currentToggle && currentFloodplainData && currentFloodplainData.features?.length) {
    // Calculate the distance to the nearest point on the floodplain
    const singleCenter = {
      type: 'FeatureCollection',
      features: [feature]
    };
    const linesGeojson = calcFloodplainDistanceLines(singleCenter, currentFloodplainData);
    let distanceMiles = null;
    let midpoint = null;
    if (linesGeojson.features.length) {
      // distance_km is stored in the properties of the line
      const distanceKm = linesGeojson.features[0].properties?.distance_km;
      if (typeof distanceKm === 'number') {
        distanceMiles = (distanceKm * 0.621371).toFixed(2);
      }
      // Calculate midpoint between community center and nearest point
      const coords = linesGeojson.features[0].geometry.coordinates;
      if (coords && coords.length === 2) {
        const [start, end] = coords;
        midpoint = [
          (start[0] + end[0]) / 2,
          (start[1] + end[1]) / 2
        ];
      }
    }
    createFloodplainDistancePopup(map.current, midpoint || lngLat, distanceMiles);
  }
  // Always show the default popup at the marker
  createCommunityCenterPopup(map.current, lngLat, feature.properties);
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
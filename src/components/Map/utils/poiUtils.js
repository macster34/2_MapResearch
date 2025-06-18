export const highlightPOIBuildings = (map, poiTypes, highlightColor = '#FF4500') => {
  // Check if required layers exist
  if (!map.getLayer('3d-buildings') || !map.getLayer('miami-pois')) {
    console.warn('Required layers not initialized yet');
    return { buildings: new Map() };
  }

  const features = map.queryRenderedFeatures({
    layers: ['3d-buildings'],
    filter: ['has', 'height']
  });
  
  const buildingCounts = new Map();
  
  features.forEach(building => {
    // Debug log
    console.log('Building geometry:', building.geometry);

    // Ensure we have valid coordinates
    if (!building.geometry?.coordinates?.[0]?.length) {
      console.warn('Invalid building coordinates:', building);
      return;
    }
    
    // Get the center point of the building
    const coords = building.geometry.coordinates[0];
    
    // Validate each coordinate point
    const validCoords = coords.filter(point => 
      Array.isArray(point) && 
      point.length === 2 && 
      !isNaN(point[0]) && 
      !isNaN(point[1])
    );
    
    if (validCoords.length === 0) {
      console.warn('No valid coordinates found for building:', building);
      return;
    }
    
    const centerLng = validCoords.reduce((sum, point) => sum + point[0], 0) / validCoords.length;
    const centerLat = validCoords.reduce((sum, point) => sum + point[1], 0) / validCoords.length;
    
    // Verify center coordinates
    if (isNaN(centerLng) || isNaN(centerLat)) {
      console.warn('Invalid center calculated:', { centerLng, centerLat });
      return;
    }

    const pois = map.queryRenderedFeatures(
      map.project([centerLng, centerLat]),
      { layers: ['miami-pois'] }
    );
    
    const relevantPOIs = pois.filter(poi => 
      poiTypes.includes(poi.properties.type.toLowerCase())
    );
    
    if (relevantPOIs.length > 0) {
      buildingCounts.set(building.id, relevantPOIs.length);
      map.setFeatureState(
        { source: 'composite', sourceLayer: 'building', id: building.id },
        { isHighlighted: true }
      );
    }
  });
  
  return { buildings: buildingCounts };
}; 
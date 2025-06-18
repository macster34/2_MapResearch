// Building layer configurations
export const buildingLayers = {
  osmBuildings: {
    'id': 'osm-buildings',
    'source': 'custom-buildings',
    'type': 'fill-extrusion',
    'minzoom': 0,
    'paint': {
      'fill-extrusion-color': '#1c1c1c',
      'fill-extrusion-height': [
        'case',
        ['has', 'height'],
        ['get', 'height'],
        50  // Default height if no height data
      ],
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': 1,
      'fill-extrusion-vertical-gradient': true,
      'fill-extrusion-ambient-occlusion-intensity': 0.6,
      'fill-extrusion-ambient-occlusion-radius': 3
    }
  },
  mapboxBuildings: {
    'id': 'mapbox-buildings',
    'source': 'composite',
    'source-layer': 'building',
    'filter': ['==', 'extrude', 'true'],
    'type': 'fill-extrusion',
    'minzoom': 12,
    'paint': {
      'fill-extrusion-color': '#1c1c1c',
      'fill-extrusion-height': [
        'interpolate',
        ['linear'],
        ['zoom'],
        15, 0,
        15.05, ['get', 'height']
      ],
      'fill-extrusion-base': [
        'interpolate',
        ['linear'],
        ['zoom'],
        15, 0,
        15.05, ['get', 'min_height']
      ],
      'fill-extrusion-opacity': 1
    }
  }
}; 
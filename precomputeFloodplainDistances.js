const fs = require('fs');
const turf = require('@turf/turf');

// Helper: Convert Web Mercator (EPSG:3857) to WGS84 (EPSG:4326)
function mercatorToLngLat([x, y]) {
  const lng = x / 20037508.34 * 180;
  let lat = y / 20037508.34 * 180;
  lat = 180 / Math.PI * (2 * Math.atan(Math.exp(lat * Math.PI / 180)) - Math.PI / 2);
  return [lng, lat];
}

// Recursively convert all coordinates in a geometry object
function convertGeometryCoords(geometry) {
  if (geometry.type === 'Point') {
    return { ...geometry, coordinates: mercatorToLngLat(geometry.coordinates) };
  } else if (geometry.type === 'LineString' || geometry.type === 'MultiPoint') {
    return { ...geometry, coordinates: geometry.coordinates.map(mercatorToLngLat) };
  } else if (geometry.type === 'Polygon' || geometry.type === 'MultiLineString') {
    return { ...geometry, coordinates: geometry.coordinates.map(ring => ring.map(mercatorToLngLat)) };
  } else if (geometry.type === 'MultiPolygon') {
    return { ...geometry, coordinates: geometry.coordinates.map(poly => poly.map(ring => ring.map(mercatorToLngLat))) };
  }
  return geometry;
}

// Load your data
const communityCenters = JSON.parse(fs.readFileSync('./public/houston-texas-community-centers.geojson'));
const floodplainAll = JSON.parse(fs.readFileSync('./public/houston-texas-flood-100-500.geojson'));

// Convert only community centers to EPSG:4326
communityCenters.features.forEach(f => {
  f.geometry = convertGeometryCoords(f.geometry);
});
// DO NOT convert floodplainAll.features!

// Filter to 100-year floodplain polygons
const floodplain100 = {
  ...floodplainAll,
  features: floodplainAll.features.filter(f =>
    ['AE', 'A', 'AO', 'VE'].includes(f.properties.FLD_ZONE)
  )
};

// Convert all polygons to lines (boundaries)
const boundaries = floodplain100.features.map(fp => turf.polygonToLine(fp));

// For each community center, find the nearest point on the floodplain boundary
const lines = [];
communityCenters.features.forEach(center => {
  let minDist = Infinity, nearestPoint = null;
  boundaries.forEach(boundary => {
    const np = turf.nearestPointOnLine(boundary, center);
    const dist = turf.distance(center, np);
    if (dist < minDist) {
      minDist = dist;
      nearestPoint = np;
    }
  });
  // Save the distance (in km) as a new property
  center.properties.distance_to_floodplain_km = minDist;
  // Optionally, save the nearest point coordinates
  center.properties.nearest_floodplain_point = nearestPoint ? nearestPoint.geometry.coordinates : null;

  // Also create a line feature for this center
  if (nearestPoint) {
    lines.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [center.geometry.coordinates, nearestPoint.geometry.coordinates]
      },
      properties: {
        centerName: center.properties.Name || center.properties.name,
        distance_km: minDist,
        center_coords: center.geometry.coordinates,
        nearest_point: nearestPoint.geometry.coordinates
      }
    });
  }
});

// Remove CRS property if present
const output = {
  type: 'FeatureCollection',
  name: communityCenters.name,
  features: communityCenters.features
};

// Output for the lines
const linesOutput = {
  type: 'FeatureCollection',
  name: 'houston-texas-community-centers-distance-lines',
  features: lines
};

// Save the updated GeoJSONs
fs.writeFileSync('./public/houston-texas-community-centers-with-distances.geojson', JSON.stringify(output, null, 2));
fs.writeFileSync('./public/houston-texas-community-centers-distance-lines.geojson', JSON.stringify(linesOutput, null, 2));
console.log('Done! Distances written to ./public/houston-texas-community-centers-with-distances.geojson (EPSG:4326)');
console.log('Done! Distance lines written to ./public/houston-texas-community-centers-distance-lines.geojson (EPSG:4326)'); 
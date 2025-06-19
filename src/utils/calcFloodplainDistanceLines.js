import * as turf from '@turf/turf';

/**
 * @param {FeatureCollection<Point>} centers - Community center points
 * @param {FeatureCollection<Polygon>} floodplain - 100-year floodplain polygons
 * @returns {FeatureCollection<LineString>} - Lines from each center to nearest floodplain
 */
export function calcFloodplainDistanceLines(centers, floodplain) {
  const lines = [];
  // Convert all polygons to lines (boundaries)
  const boundaries = floodplain.features.map(fp => turf.polygonToLine(fp));
  centers.features.forEach(center => {
    let minDist = Infinity, nearestPoint = null;
    boundaries.forEach(boundary => {
      const np = turf.nearestPointOnLine(boundary, center);
      const dist = turf.distance(center, np);
      if (dist < minDist) {
        minDist = dist;
        nearestPoint = np;
      }
    });
    if (nearestPoint) {
      lines.push(
        turf.lineString([center.geometry.coordinates, nearestPoint.geometry.coordinates], {
          centerName: center.properties.Name || center.properties.name,
          distance_km: minDist
        })
      );
    }
  });
  return turf.featureCollection(lines);
} 
import { useEffect, useRef } from 'react';
import { calcFloodplainDistanceLines } from '../utils/calcFloodplainDistanceLines';

export function useFloodplainDistanceLinesLayer(map, showLayer, communityCenters, floodplain100) {
  const sourceId = 'floodplain-distance-lines';
  const layerId = 'floodplain-distance-lines';
  const loaded = useRef(false);

  useEffect(() => {
    if (!map.current || !showLayer || !communityCenters || !floodplain100) return;
    if (!communityCenters.features?.length || !floodplain100.features?.length) return;

    // Remove previous layer/source if present
    if (map.current.getLayer(layerId)) {
      map.current.removeLayer(layerId);
    }
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId);
    }

    // Calculate lines
    const linesGeojson = calcFloodplainDistanceLines(communityCenters, floodplain100);

    // Add to map
    map.current.addSource(sourceId, { type: 'geojson', data: linesGeojson });
    map.current.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#00BFFF',
        'line-width': 2,
        'line-dasharray': [2, 2]
      }
    });

    loaded.current = true;

    return () => {
      if (map.current.getLayer(layerId)) map.current.removeLayer(layerId);
      if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);
    };
  }, [map, showLayer, communityCenters, floodplain100]);

  return { loaded: loaded.current };
} 
import { useEffect, useRef } from 'react';

export function useFloodplainDistanceLinesLayer(map, showLayer) {
  const sourceId = 'floodplain-distance-lines';
  const layerId = 'floodplain-distance-lines';
  const loaded = useRef(false);

  useEffect(() => {
    if (!map.current || !showLayer) return;

    // Remove previous layer/source if present
    if (map.current.getLayer(layerId)) {
      map.current.removeLayer(layerId);
    }
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId);
    }

    // Fetch and add the precomputed lines
    fetch('/houston-texas-community-centers-distance-lines.geojson')
      .then(res => res.json())
      .then(linesGeojson => {
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
      });

    return () => {
      if (map.current.getLayer(layerId)) map.current.removeLayer(layerId);
      if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);
    };
  }, [map, showLayer]);

  return { loaded: loaded.current };
} 
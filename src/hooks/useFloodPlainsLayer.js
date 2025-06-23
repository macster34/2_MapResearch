import { useCallback, useEffect, useRef } from 'react';

export function useFloodPlainsLayer(map, show100, show500) {
  const loaded = useRef(false);
  const sourceId = 'flood-plains';
  const layer100Id = 'flood-plain-100';
  const layer500Id = 'flood-plain-500';

  const show = useCallback(async () => {
    if (!map.current) return;
    if (!map.current.getSource(sourceId)) {
      const response = await fetch('/houston-texas-flood-100-500.geojson');
      const data = await response.json();
      map.current.addSource(sourceId, {
        type: 'geojson',
        data
      });
    }
    // 100-year layer
    if (!map.current.getLayer(layer100Id)) {
      map.current.addLayer({
        id: layer100Id,
        type: 'fill',
        source: sourceId,
        filter: ['in', ['get', 'FLD_ZONE'], ['literal', ['AE', 'A', 'AO', 'VE']]],
        paint: {
          'fill-color': '#7EC8E3', // light blue
          'fill-opacity': 0.5,
          'fill-outline-color': '#3A7CA5'
        },
        layout: { visibility: show100 ? 'visible' : 'none' }
      });
      map.current.moveLayer(layer100Id);
    } else {
      map.current.setLayoutProperty(layer100Id, 'visibility', show100 ? 'visible' : 'none');
    }
    // 500-year layer
    if (!map.current.getLayer(layer500Id)) {
      map.current.addLayer({
        id: layer500Id,
        type: 'fill',
        source: sourceId,
        filter: ['==', ['get', 'FLD_ZONE'], '0.2 PCT ANNUAL CHANCE FLOOD HAZARD'],
        paint: {
          'fill-color': '#1B263B', // dark blue
          'fill-opacity': 0.5,
          'fill-outline-color': '#415A77'
        },
        layout: { visibility: show500 ? 'visible' : 'none' }
      });
      map.current.moveLayer(layer500Id);
    } else {
      map.current.setLayoutProperty(layer500Id, 'visibility', show500 ? 'visible' : 'none');
    }
    // Always move community center markers to the top
    if (map.current.getLayer('community-centers')) {
      map.current.moveLayer('community-centers');
    }
    loaded.current = true;
  }, [map, show100, show500]);

  const hide = useCallback(() => {
    if (!map.current) return;
    if (map.current.getLayer(layer100Id)) {
      map.current.setLayoutProperty(layer100Id, 'visibility', 'none');
    }
    if (map.current.getLayer(layer500Id)) {
      map.current.setLayoutProperty(layer500Id, 'visibility', 'none');
    }
    // Always move community center markers to the top
    if (map.current.getLayer('community-centers')) {
      map.current.moveLayer('community-centers');
    }
  }, [map]);

  useEffect(() => {
    if (show100 || show500) {
      show();
    } else {
      hide();
    }
    return hide;
  }, [show100, show500, show, hide]);

  return { show, hide, loaded: loaded.current };
} 
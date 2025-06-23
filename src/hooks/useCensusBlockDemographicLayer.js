import { useCallback, useEffect, useRef } from 'react';

export function useCensusBlockDemographicLayer(map, showDemographicLayer, onBlockClick) {
  const loaded = useRef(false);
  const handlersAttached = useRef(false);

  function onClick(e) {
    if (e.features && e.features.length > 0 && typeof onBlockClick === 'function') {
      const feature = e.features[0];
      onBlockClick(feature, e.lngLat);
    }
  }

  const attachHandlers = () => {
    if (!map.current.getLayer('census-block-demographic') || handlersAttached.current) return;
    map.current.on('click', 'census-block-demographic', onClick);
    handlersAttached.current = true;
  };

  const detachHandlers = () => {
    if (!handlersAttached.current) return;
    map.current.off('click', 'census-block-demographic', onClick);
    handlersAttached.current = false;
  };

  const showLayer = useCallback(async () => {
    if (!map.current) return;
    const layerId = 'census-block-demographic';
    const sourceId = 'census-blocks';
    // Scarlet red: #C41E3A
    // Opacity based on Median_HHI (median household income)
    if (!map.current.getSource(sourceId)) {
      const response = await fetch('/data_bundles/houston_small_files/houston-census-blocks.geojson');
      if (!response.ok) throw new Error('Failed to fetch census blocks GeoJSON');
      const data = await response.json();
      map.current.addSource(sourceId, {
        type: 'geojson',
        data
      });
    }
    if (!map.current.getLayer(layerId)) {
      map.current.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': '#C41E3A',
          'fill-opacity': [
            'interpolate',
            ['linear'],
            ['coalesce', ['get', 'Median_HHI'], 0],
            0, 0.1,
            20000, 0.2,
            40000, 0.4,
            60000, 0.6,
            80000, 0.8,
            120000, 1
          ],
          'fill-outline-color': '#7B1426'
        },
        layout: {
          visibility: 'visible'
        }
      });
      attachHandlers();
    } else {
      map.current.setLayoutProperty(layerId, 'visibility', 'visible');
      attachHandlers();
    }
    // Always move community center markers to the top
    if (map.current.getLayer('community-centers')) {
      map.current.moveLayer('community-centers');
    }
    loaded.current = true;
  }, [map]);

  const hideLayer = useCallback(() => {
    if (!map.current) return;
    const layerId = 'census-block-demographic';
    if (map.current.getLayer(layerId)) {
      map.current.setLayoutProperty(layerId, 'visibility', 'none');
    }
    detachHandlers();
    // Always move community center markers to the top
    if (map.current.getLayer('community-centers')) {
      map.current.moveLayer('community-centers');
    }
  }, [map]);

  useEffect(() => {
    if (showDemographicLayer) {
      showLayer();
    } else {
      hideLayer();
    }
    return hideLayer;
  }, [showDemographicLayer, showLayer, hideLayer]);

  return { showLayer, hideLayer, loaded: loaded.current };
} 
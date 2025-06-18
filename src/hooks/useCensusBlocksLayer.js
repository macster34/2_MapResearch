import { useCallback, useEffect, useRef } from 'react';

export function useCensusBlocksLayer(map, showCensusBlocks, onBlockClick) {
  const loaded = useRef(false);
  const handlersAttached = useRef(false);

  let hoveredId = null;
  let leaveTimeout = null;

  function onMouseMove(e) {
    if (leaveTimeout) {
      clearTimeout(leaveTimeout);
      leaveTimeout = null;
    }
    if (e.features && e.features.length > 0) {
      const feature = e.features[0];
      let id = feature.properties.OBJECTID;
      if (id !== undefined && id !== null) {
        if (typeof id === 'string') id = parseInt(id, 10);
      } else {
        id = feature.properties.GEOID || feature.id || '';
      }
      hoveredId = id;
      map.current.setFilter('census-blocks-outline', ['==', 'OBJECTID', hoveredId]);
      map.current.setPaintProperty('census-blocks-outline', 'line-opacity', 1);
    }
  }

  function onMouseLeave() {
    leaveTimeout = setTimeout(() => {
      hoveredId = null;
      map.current.setFilter('census-blocks-outline', ['all']);
      map.current.setPaintProperty('census-blocks-outline', 'line-opacity', 1);
    }, 30);
  }

  function onClick(e) {
    if (e.features && e.features.length > 0 && typeof onBlockClick === 'function') {
      const feature = e.features[0];
      onBlockClick(feature, e.lngLat);
    }
  }

  const attachHandlers = () => {
    if (!map.current.getLayer('census-blocks-outline') || handlersAttached.current) return;
    map.current.on('mousemove', 'census-blocks-outline', onMouseMove);
    map.current.on('mouseleave', 'census-blocks-outline', onMouseLeave);
    map.current.on('click', 'census-blocks-outline', onClick);
    handlersAttached.current = true;
  };

  const detachHandlers = () => {
    if (!handlersAttached.current) return;
    map.current.off('mousemove', 'census-blocks-outline', onMouseMove);
    map.current.off('mouseleave', 'census-blocks-outline', onMouseLeave);
    map.current.off('click', 'census-blocks-outline', onClick);
    handlersAttached.current = false;
  };

  const showLayer = useCallback(async () => {
    if (!map.current) return;
    const layerId = 'census-blocks';
    const outlineLayerId = 'census-blocks-outline';
    const sourceId = 'census-blocks';

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
          'fill-color': '#FF6600',
          'fill-opacity': 0.5,
          'fill-outline-color': '#B34700'
        },
        layout: {
          visibility: 'visible'
        }
      });
      map.current.addLayer({
        id: outlineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#FF6600',
          'line-width': 1.5,
          'line-opacity': 1
        },
        layout: {
          visibility: 'visible'
        }
      });
      attachHandlers();
    } else {
      map.current.setLayoutProperty(layerId, 'visibility', 'visible');
      if (map.current.getLayer(outlineLayerId)) {
        map.current.setLayoutProperty(outlineLayerId, 'visibility', 'visible');
        attachHandlers();
      }
    }
    loaded.current = true;
  }, [map]);

  const hideLayer = useCallback(() => {
    if (!map.current) return;
    const layerId = 'census-blocks';
    const outlineLayerId = 'census-blocks-outline';
    if (map.current.getLayer(layerId)) {
      map.current.setLayoutProperty(layerId, 'visibility', 'none');
    }
    if (map.current.getLayer(outlineLayerId)) {
      map.current.setLayoutProperty(outlineLayerId, 'visibility', 'none');
    }
    detachHandlers();
  }, [map]);

  useEffect(() => {
    if (showCensusBlocks) {
      showLayer();
    } else {
      hideLayer();
    }
    return hideLayer;
  }, [showCensusBlocks, showLayer, hideLayer]);

  return { showLayer, hideLayer, loaded: loaded.current };
} 
import { useCallback, useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

export function useZipCodeLayer(map, showZipCodes) {
  const loaded = useRef(false);
  const handlersAttached = useRef(false);

  // Handler state
  let hoveredId = null;
  let popup = null;
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
        id = feature.properties.Zip_Code || feature.properties.ZIP_CODE || feature.id || '';
      }
      hoveredId = id;
      map.current.setFilter('zipcodes-hover', ['==', 'OBJECTID', hoveredId]);
      map.current.setPaintProperty('zipcodes-hover', 'fill-opacity', 0.3);
      // No popup on hover
    }
  }

  function onMouseLeave() {
    leaveTimeout = setTimeout(() => {
      hoveredId = null;
      map.current.setFilter('zipcodes-hover', ['all']);
      map.current.setPaintProperty('zipcodes-hover', 'fill-opacity', 0);
      if (popup) popup.remove();
      popup = null;
    }, 30); // 30ms debounce
  }

  function onClick(e) {
    if (popup) popup.remove();
    if (e.features && e.features.length > 0) {
      const feature = e.features[0];
      let id = feature.properties.OBJECTID;
      if (id !== undefined && id !== null) {
        if (typeof id === 'string') id = parseInt(id, 10);
      } else {
        id = feature.properties.Zip_Code || feature.properties.ZIP_CODE || feature.id || '';
      }
      popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
        .setLngLat(e.lngLat)
        .setHTML(`<strong>ZIP Code:</strong> ${feature.properties.Zip_Code || feature.properties.ZIP_CODE || ''}<br/><strong>ID:</strong> ${id}`)
        .addTo(map.current);
    }
  }

  const attachHandlers = () => {
    if (!map.current.getLayer('zipcodes-hover') || handlersAttached.current) return;
    map.current.on('mousemove', 'zipcodes-hover', onMouseMove);
    map.current.on('mouseleave', 'zipcodes-hover', onMouseLeave);
    map.current.on('click', 'zipcodes-hover', onClick);
    handlersAttached.current = true;
    console.log('[ZIP] Hover and click handlers attached');
  };

  const detachHandlers = () => {
    if (!handlersAttached.current) return;
    map.current.off('mousemove', 'zipcodes-hover', onMouseMove);
    map.current.off('mouseleave', 'zipcodes-hover', onMouseLeave);
    map.current.off('click', 'zipcodes-hover', onClick);
    handlersAttached.current = false;
    console.log('[ZIP] Hover and click handlers detached');
  };

  const showZipCodesLayer = useCallback(async () => {
    if (!map.current) return;
    const layerId = 'zipcodes';
    const sourceId = 'zipcodes';

    if (!map.current.getSource(sourceId)) {
      try {
        const response = await fetch('/data_bundles/houston_small_files/COH_ZIPCODES.geojson');
        if (!response.ok) throw new Error('Failed to fetch ZIP Codes GeoJSON');
        const data = await response.json();
        map.current.addSource(sourceId, {
          type: 'geojson',
          data
        });
        map.current.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#FF8C00',
            'line-width': 1,
            'line-opacity': 0.6
          },
          layout: {
            visibility: 'visible'
          }
        });
        if (!map.current.getLayer('zipcodes-hover')) {
          map.current.addLayer({
            id: 'zipcodes-hover',
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': '#FF8C00',
              'fill-opacity': 0
            },
            layout: {},
            filter: ['all']
          });
        }
        map.current.moveLayer('zipcodes-hover');
        attachHandlers(); // Attach after adding
        const layers = map.current.getStyle().layers.map(l => l.id);
        console.log('[ZIP] Layer order after move:', layers);
        loaded.current = true;
      } catch (err) {
        console.error('Failed to load ZIP Codes layer:', err);
      }
    } else if (!map.current.getLayer(layerId)) {
      map.current.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#FF8C00',
          'line-width': 1,
          'line-opacity': 0.6
        },
        layout: {
          visibility: 'visible'
        }
      });
      if (!map.current.getLayer('zipcodes-hover')) {
        map.current.addLayer({
          id: 'zipcodes-hover',
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#FF8C00',
            'fill-opacity': 0
          },
          layout: {},
          filter: ['all']
        });
      }
      map.current.moveLayer('zipcodes-hover');
      attachHandlers(); // Attach after adding
      const layers = map.current.getStyle().layers.map(l => l.id);
      console.log('[ZIP] Layer order after move:', layers);
    } else {
      map.current.setLayoutProperty(layerId, 'visibility', 'visible');
      if (map.current.getLayer('zipcodes-hover')) {
        map.current.setLayoutProperty('zipcodes-hover', 'visibility', 'visible');
        attachHandlers(); // Attach if not already
      }
    }
  }, [map]);

  const hideZipCodesLayer = useCallback(() => {
    if (!map.current) return;
    const layerId = 'zipcodes';
    if (map.current.getLayer(layerId)) {
      map.current.setLayoutProperty(layerId, 'visibility', 'none');
    }
    // Remove hover highlight and popup
    if (map.current.getLayer('zipcodes-hover')) {
      map.current.setPaintProperty('zipcodes-hover', 'fill-opacity', 0);
      map.current.setFilter('zipcodes-hover', ['all']);
      map.current.setLayoutProperty('zipcodes-hover', 'visibility', 'none');
    }
    detachHandlers();
  }, [map]);

  useEffect(() => {
    if (!map.current) return;
    if (showZipCodes) {
      showZipCodesLayer();
    } else {
      hideZipCodesLayer();
    }
    // Cleanup on unmount
    return hideZipCodesLayer;
  }, [map, showZipCodes, showZipCodesLayer, hideZipCodesLayer]);

  return { showZipCodes: showZipCodesLayer, hideZipCodes: hideZipCodesLayer, loaded: loaded.current };
} 
import { useCallback, useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

export function useMUDLayer(map, showMUDLayer) {
  const loaded = useRef(false);
  const popupRef = useRef(null);
  const hoveredIdRef = useRef(null);

  const highlightLayerId = 'mud-districts-highlight';

  const showMUD = useCallback(async () => {
    if (!map.current) return;
    const layerId = 'mud-districts';
    const sourceId = 'mud-districts';

    const sourceExists = !!map.current.getSource(sourceId);
    const layerExists = !!map.current.getLayer(layerId);
    const isVisible = layerExists && map.current.getLayoutProperty(layerId, 'visibility') === 'visible';
    const highlightLayerExists = !!map.current.getLayer(highlightLayerId);

    console.log('[MUD] showMUD called. sourceExists:', sourceExists, 'layerExists:', layerExists, 'isVisible:', isVisible);

    // If both exist and are visible, do nothing
    if (sourceExists && layerExists && isVisible) {
      console.log('[MUD] Both source and layer exist and are visible. No action taken.');
      return;
    }

    // Only add the source if it does not exist
    if (!sourceExists) {
      try {
        const response = await fetch('/data_bundles/houston_small_files/MUD.geojson');
        if (!response.ok) throw new Error('Failed to fetch MUD GeoJSON');
        const data = await response.json();
        map.current.addSource(sourceId, {
          type: 'geojson',
          data
        });
        console.log('[MUD] Source added.');
      } catch (err) {
        console.error('Failed to Load MUD Layer Error:', err);
        return;
      }
    }
    // Only add the layer if it does not exist
    if (!layerExists) {
      try {
        map.current.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#FF3333',
            'fill-opacity': 0.5,
            'fill-outline-color': '#B22222'
          },
          layout: {
            visibility: 'visible'
          }
        });
        console.log('[MUD] Layer added.');
      } catch (err) {
        console.error('Failed to add MUD layer:', err);
        return;
      }
    } else {
      // If layer exists, just set it visible
      map.current.setLayoutProperty(layerId, 'visibility', 'visible');
      console.log('[MUD] Layer set to visible.');
    }

    // Add highlight layer if not exists
    if (!highlightLayerExists) {
      map.current.addLayer({
        id: highlightLayerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': '#FFFF00',
          'fill-opacity': 0.7
        },
        filter: ['==', ['get', 'id'], ''], // No feature highlighted by default
      }, layerId);
    }
  }, [map]);

  const hideMUD = useCallback(() => {
    if (!map.current) return;
    const layerId = 'mud-districts';
    const sourceId = 'mud-districts';
    const layerExists = !!map.current.getLayer(layerId);
    const sourceExists = !!map.current.getSource(sourceId);
    const highlightLayerExists = !!map.current.getLayer(highlightLayerId);
    console.log('[MUD] hideMUD called. sourceExists:', sourceExists, 'layerExists:', layerExists);
    if (layerExists) {
      map.current.removeLayer(layerId);
      console.log('[MUD] Layer removed.');
    }
    if (highlightLayerExists) {
      map.current.removeLayer(highlightLayerId);
      console.log('[MUD] Highlight layer removed.');
    }
    if (sourceExists) {
      map.current.removeSource(sourceId);
      console.log('[MUD] Source removed.');
    }
    // Remove popup if exists
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }
  }, [map]);

  // Hover handlers
  useEffect(() => {
    if (!map.current || !showMUDLayer) return;
    const mapbox = map.current;
    const layerId = 'mud-districts';
    const highlightLayerId = 'mud-districts-highlight';

    function onMouseMove(e) {
      if (!e.features || !e.features.length) return;
      const feature = e.features[0];
      const id = feature.id || feature.properties.id;
      hoveredIdRef.current = id;
      // Highlight the hovered feature
      mapbox.setFilter(highlightLayerId, ['==', ['get', 'id'], id]);
      // Show popup
      if (popupRef.current) popupRef.current.remove();
      const coordinates = e.lngLat;
      const mudName = feature.properties?.name || feature.properties?.NAME || 'MUD District';
      popupRef.current = new mapboxgl.Popup({ closeButton: false, closeOnClick: false })
        .setLngLat(coordinates)
        .setHTML(`<strong>${mudName}</strong><br>ID: ${id}`)
        .addTo(mapbox);
    }

    function onMouseLeave() {
      hoveredIdRef.current = null;
      mapbox.setFilter(highlightLayerId, ['==', ['get', 'id'], '']);
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
    }

    // Add listeners
    mapbox.on('mousemove', layerId, onMouseMove);
    mapbox.on('mouseleave', layerId, onMouseLeave);

    return () => {
      mapbox.off('mousemove', layerId, onMouseMove);
      mapbox.off('mouseleave', layerId, onMouseLeave);
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
    };
  }, [map, showMUDLayer]);

  useEffect(() => {
    if (!map.current) return;
    // Handler to re-add MUD layer after style reload
    const handleStyleLoad = () => {
      if (showMUDLayer) {
        showMUD();
      }
    };
    map.current.on('style.load', handleStyleLoad);
    return () => {
      if (map.current) {
        map.current.off('style.load', handleStyleLoad);
      }
    };
  }, [map, showMUDLayer, showMUD]);

  return { showMUD, hideMUD, loaded: loaded.current };
} 
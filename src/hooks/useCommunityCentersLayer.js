import { useCallback, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

export function useCommunityCentersLayer(map, showLayer, communityCentersData, onMarkerClick, showFloodplainDistanceLines) {
  const sourceId = 'community-centers';
  const layerId = 'community-centers';

  // Stable click handler reference
  const handleMarkerClick = useCallback((e) => {
    const feature = e.features[0];
    const props = feature.properties;
    const coordinates = feature.geometry.coordinates.slice();
    const lngLat = coordinates;
    if (typeof onMarkerClick === 'function') {
      onMarkerClick(feature, lngLat, showFloodplainDistanceLines);
    } else {
      mapboxgl.Popup && new mapboxgl.Popup({ closeOnClick: true })
        .setLngLat(lngLat)
        .setHTML(`
          <div style=\"min-width:220px\">
            <h3 style=\"margin:0 0 4px 0; color:#FF00B7\">${props.Name || ''}</h3>
            <div><b>Address:</b> ${props.Address || ''}, ${props.Zip_Code || ''}</div>
            <div><b>Phone:</b> ${props.Phone || ''}</div>
            <div><b>Supervisor:</b> ${props.SUPERVISOR || ''}</div>
          </div>
        `)
        .addTo(map.current);
    }
  }, [onMarkerClick, showFloodplainDistanceLines]);

  const detachHandlers = () => {
    console.log('[DEBUG] Detaching community center click handler');
    map.current.off('click', layerId, handleMarkerClick);
    map.current.off('mouseenter', layerId);
    map.current.off('mouseleave', layerId);
  };

  const attachHandlers = useCallback(() => {
    if (!map.current.getLayer(layerId)) return;
    detachHandlers(); // Always detach before attaching
    console.log('[DEBUG] Attaching community center click handler', { showFloodplainDistanceLines });
    map.current.on('click', layerId, handleMarkerClick);
    map.current.on('mouseenter', layerId, () => {
      map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', layerId, () => {
      map.current.getCanvas().style.cursor = '';
    });
  }, [map, handleMarkerClick, showFloodplainDistanceLines]);

  const show = useCallback(async () => {
    if (!map.current || !communityCentersData) return;
    if (!map.current.getSource(sourceId)) {
      map.current.addSource(sourceId, {
        type: 'geojson',
        data: communityCentersData
      });
      // Find a layer to insert before (e.g., a label or marker layer)
      let beforeLayer = null;
      const preferredBelow = ['road-label', 'waterway-label', 'poi-label', 'place-label'];
      const layers = map.current.getStyle().layers;
      if (layers) {
        for (let pref of preferredBelow) {
          if (map.current.getLayer(pref)) {
            beforeLayer = pref;
            break;
          }
        }
      }
      map.current.addLayer({
        id: layerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': [
            'case',
            ['all', ['has', 'Square_Foo'], ['>', ['to-number', ['get', 'Square_Foo']], 0]],
              [
                'interpolate',
                ['linear'],
                ['to-number', ['get', 'Square_Foo'], 0],
                0, 4.8,
                2000, 6.4,
                5000, 9.6,
                10000, 14.4,
                20000, 19.2
              ],
              6.4
          ],
          'circle-color': '#FF00B7',
          'circle-stroke-width': 0,
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['get', 'vulnerability'],
            0, 0.1,   // Least vulnerable (very transparent)
            1, 1.0    // Most vulnerable (fully opaque)
          ]
        }
      }, beforeLayer);
      // Always move the marker layer to the top to ensure visibility
      map.current.moveLayer(layerId);
    } else {
      map.current.setLayoutProperty(layerId, 'visibility', 'visible');
      // Always move the marker layer to the top to ensure visibility
      map.current.moveLayer(layerId);
    }
  }, [map, communityCentersData]);

  const hide = useCallback(() => {
    if (!map.current) return;
    if (map.current.getLayer(layerId)) {
      map.current.setLayoutProperty(layerId, 'visibility', 'none');
    }
  }, [map]);

  useEffect(() => {
    if (showLayer && communityCentersData) {
      show();
    } else {
      hide();
    }
  }, [showLayer, show, hide, communityCentersData]);

  useEffect(() => {
    if (map.current && map.current.getLayer(layerId) && showLayer) {
      detachHandlers();
      attachHandlers();
    }
  }, [onMarkerClick, showLayer, attachHandlers, showFloodplainDistanceLines]);

  return { show, hide, loaded: true };
} 
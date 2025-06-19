import { useCallback, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

export function useCommunityCentersLayer(map, showLayer, onMarkerClick) {
  const loaded = useRef(false);
  const handlersAttached = useRef(false);
  const sourceId = 'community-centers';
  const layerId = 'community-centers';

  // Convert Web Mercator to lon/lat
  const mercatorToLngLat = (xy) => {
    const x = xy[0] / 20037508.34 * 180;
    let y = xy[1] / 20037508.34 * 180;
    y = 180 / Math.PI * (2 * Math.atan(Math.exp(y * Math.PI / 180)) - Math.PI / 2);
    return [x, y];
  };

  const attachHandlers = () => {
    if (!map.current.getLayer(layerId) || handlersAttached.current) return;
    // Remove previous handlers to avoid duplicates
    map.current.off('click', layerId);
    map.current.off('mouseenter', layerId);
    map.current.off('mouseleave', layerId);
    map.current.on('click', layerId, (e) => {
      const feature = e.features[0];
      const props = feature.properties;
      const coordinates = feature.geometry.coordinates.slice();
      const lngLat = (Math.abs(coordinates[0]) > 180 || Math.abs(coordinates[1]) > 90)
        ? mercatorToLngLat(coordinates)
        : coordinates;
      if (typeof onMarkerClick === 'function') {
        onMarkerClick(feature, lngLat);
      } else {
        mapboxgl.Popup && new mapboxgl.Popup({ closeOnClick: true })
          .setLngLat(lngLat)
          .setHTML(`
            <div style="min-width:220px">
              <h3 style="margin:0 0 4px 0; color:#FF00B7">${props.Name || ''}</h3>
              <div><b>Address:</b> ${props.Address || ''}, ${props.Zip_Code || ''}</div>
              <div><b>Phone:</b> ${props.Phone || ''}</div>
              <div><b>Supervisor:</b> ${props.SUPERVISOR || ''}</div>
            </div>
          `)
          .addTo(map.current);
      }
    });
    map.current.on('mouseenter', layerId, () => {
      map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', layerId, () => {
      map.current.getCanvas().style.cursor = '';
    });
    handlersAttached.current = true;
  };

  const detachHandlers = () => {
    if (!handlersAttached.current) return;
    map.current.off('click', layerId);
    map.current.off('mouseenter', layerId);
    map.current.off('mouseleave', layerId);
    handlersAttached.current = false;
  };

  const show = useCallback(async () => {
    if (!map.current) return;
    // Add source and layer if not present
    if (!map.current.getSource(sourceId)) {
      const response = await fetch('/houston-texas-community-centers.geojson');
      const data = await response.json();
      const converted = {
        ...data,
        features: data.features.map(f =>
          f.geometry.type === 'Point'
            ? {
                ...f,
                geometry: {
                  ...f.geometry,
                  coordinates: mercatorToLngLat(f.geometry.coordinates)
                }
              }
            : f
        )
      };
      map.current.addSource(sourceId, {
        type: 'geojson',
        data: converted
      });
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
                0, 4.8,         // 6 * 0.8
                2000, 6.4,      // 8 * 0.8
                5000, 9.6,      // 12 * 0.8
                10000, 14.4,    // 18 * 0.8
                20000, 19.2     // 24 * 0.8
              ],
              6.4 // Default size if Square_Foo is missing or not a number (8 * 0.8)
          ],
          'circle-color': '#FF00B7',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
          'circle-opacity': [
            'case',
            ['all', ['has', 'Square_Foo'], ['>', ['to-number', ['get', 'Square_Foo']], 0]],
              0.95, // Normal opacity if Square_Foo is present
              0.4   // Lower opacity if missing
          ]
        }
      });
      attachHandlers();
    } else {
      map.current.setLayoutProperty(layerId, 'visibility', 'visible');
      attachHandlers();
    }
    loaded.current = true;
  }, [map]);

  const hide = useCallback(() => {
    if (!map.current) return;
    if (map.current.getLayer(layerId)) {
      map.current.setLayoutProperty(layerId, 'visibility', 'none');
    }
    detachHandlers();
  }, [map]);

  useEffect(() => {
    if (showLayer) {
      show();
    } else {
      hide();
    }
    return hide;
  }, [showLayer, show, hide]);

  return { show, hide, loaded: loaded.current };
} 
import { useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { MAP_CONFIG } from '../constants';
import { formatWaterData, formatAIConsensusData } from '../components/PopupCards';
import { mockDisagreementData } from '../constants/mockData';
import { handlePanelCollapse } from '../hooks/mapAnimations';  // Import the handlePanelCollapse function

export const useMapInitialization = (map, mapContainer) => {
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_CONFIG.style,
      center: MAP_CONFIG.center,
      zoom: MAP_CONFIG.zoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      dragRotate: MAP_CONFIG.dragRotate,
      touchZoomRotate: MAP_CONFIG.touchZoomRotate,
      doubleClickZoom: MAP_CONFIG.doubleClickZoom,
      touchPitch: MAP_CONFIG.touchPitch,
      pitch: 0
    });
    
    // Force panel to be collapsed on initial map load
    map.current.once('load', () => {
      // Ensure chat panel is initially collapsed
      setTimeout(() => {
        handlePanelCollapse(true, map.current);
      }, 100);
    });

    // Add water styling when the style loads
    map.current.on('style.load', async () => {
      // Wait for style to be fully loaded
      await new Promise(resolve => {
        if (map.current.isStyleLoaded()) {
          resolve();
        } else {
          map.current.once('styledata', resolve);
        }
      });

      // Style water in the base map layers
      const waterLayers = [
        'water',
        'water-shadow',
        'waterway',
        'water-depth',
        'water-pattern'
      ];

      waterLayers.forEach(layerId => {
        if (!map.current.getLayer(layerId)) return;

        try {
          const layer = map.current.getLayer(layerId);
          if (!layer) return;

          // Handle fill layers
          if (layer.type === 'fill') {
            map.current.setPaintProperty(layerId, 'fill-color', '#0088cc');
            map.current.setPaintProperty(layerId, 'fill-opacity', 0.8);
          }
          
          // Handle line layers
          if (layer.type === 'line') {
            map.current.setPaintProperty(layerId, 'line-color', '#0088cc');
            map.current.setPaintProperty(layerId, 'line-opacity', 0.8);
          }
        } catch (error) {
          console.warn(`Could not style water layer ${layerId}:`, error);
        }
      });

      // Style parks and green areas
      const parkLayers = [
        'landuse',
        'park',
        'park-label',
        'national-park',
        'natural',
        'golf-course',
        'pitch',
        'grass'
      ];

      parkLayers.forEach(layerId => {
        if (!map.current.getLayer(layerId)) return;

        try {
          const layer = map.current.getLayer(layerId);
          if (!layer) return;

          if (layer.type === 'fill') {
            map.current.setPaintProperty(layerId, 'fill-color', '#3a9688');
            map.current.setPaintProperty(layerId, 'fill-opacity', 0.4);
          }
          if (layer.type === 'symbol' && map.current.getPaintProperty(layerId, 'background-color') !== undefined) {
            map.current.setPaintProperty(layerId, 'background-color', '#3a9688');
          }
        } catch (error) {
          console.warn(`Could not style park layer ${layerId}:`, error);
        }
      });
    });

    const initializeMapLayers = async () => {
      try {
        if (!map.current.isStyleLoaded()) {
          await new Promise(resolve => map.current.once('style.load', resolve));
        }

        // --- Commented out all other fetches and layers for focused development ---
        /*
        // Load census blocks
        const censusResponse = await fetch('/houston-census-blocks.geojson');
        const censusData = await censusResponse.json();
        map.current.addSource('census-blocks', {
          type: 'geojson',
          data: censusData
        });
        map.current.addLayer({
          'id': 'census-blocks',
          'type': 'fill',
          'source': 'census-blocks',
          'paint': {
            'fill-color': '#FF0000',
            'fill-opacity': 0.4,
            'fill-outline-color': '#000000'
          },
          'layout': {
            'visibility': 'none'
          }
        });
        // ... (other fetches and layers for buildings, MUD, water, etc.) ...
        */
        // --- ZIP code source/layer logic removed; handled by custom hook ---

        // Add Surface Water layers
        const [
          surfaceWaterResponse,
          surfaceWaterIntakeResponse,
          smallTribalAreasResponse,
          smallAreasResponse,
          pwsReservoirResponse,
          waterwellGridResponse,
          wastewaterOutfallsResponse
        ] = await Promise.all([
          fetch('/Surface_Water.geojson'),
          fetch('/Surface_Water_Intake.geojson'),
          fetch('/small_tribal_areas.geojson'),
          fetch('/small_areas.geojson'),
          fetch('/PWS_Reservoir.geojson'),
          fetch('/Waterwell_Grid.geojson'),
          fetch('/Wastewater_Outfalls.geojson')
        ]);
        
        const [
          surfaceWaterData,
          surfaceWaterIntakeData,
          smallTribalAreasData,
          smallAreasData,
          pwsReservoirData,
          waterwellGridData,
          wastewaterOutfallsData
        ] = await Promise.all([
          surfaceWaterResponse.json(),
          surfaceWaterIntakeResponse.json(),
          smallTribalAreasResponse.json(),
          smallAreasResponse.json(),
          pwsReservoirResponse.json(),
          waterwellGridResponse.json(),
          wastewaterOutfallsResponse.json()
        ]);
        
        // Add all sources
        const sources = {
          'surface-water': surfaceWaterData,
          'surface-water-intake': surfaceWaterIntakeData,
          'small-tribal-areas': smallTribalAreasData,
          'small-areas': smallAreasData,
          'pws-reservoir': pwsReservoirData,
          'waterwell-grid': waterwellGridData,
          'wastewater-outfalls': wastewaterOutfallsData,
        };

        Object.entries(sources).forEach(([id, data]) => {
          map.current.addSource(id, {
            type: 'geojson',
            data: data
          });
        });

        // Add Surface Water layer (main water bodies)
        map.current.addLayer({
          'id': 'surface-water',
          'type': 'fill',
          'source': 'surface-water',
          'paint': {
            'fill-color': '#00ffff',
            'fill-opacity': 0.9,
            'fill-outline-color': '#0088cc'
          },
          'layout': {
            'visibility': 'none'
          }
        });

        // Add Surface Water Intake points
        map.current.addLayer({
          'id': 'surface-water-intake',
          'type': 'circle',
          'source': 'surface-water-intake',
          'paint': {
            'circle-radius': 3,
            'circle-color': '#0088cc',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff'
          },
          'layout': {
            'visibility': 'none'
          }
        });

        // Add Small Tribal Areas
        map.current.addLayer({
          'id': 'small-tribal-areas',
          'type': 'fill',
          'source': 'small-tribal-areas',
          'paint': {
            'fill-color': '#80cbc4',
            'fill-opacity': 0.3,
            'fill-outline-color': '#4db6ac'
          },
          'layout': {
            'visibility': 'none'
          }
        });

        // Add Small Areas
        map.current.addLayer({
          'id': 'small-areas',
          'type': 'fill',
          'source': 'small-areas',
          'paint': {
            'fill-color': '#90caf9',
            'fill-opacity': 0.3,
            'fill-outline-color': '#42a5f5'
          },
          'layout': {
            'visibility': 'none'
          }
        });

        // Add PWS Reservoir
        map.current.addLayer({
          'id': 'pws-reservoir',
          'type': 'fill',
          'source': 'pws-reservoir',
          'paint': {
            'fill-color': '#4dd0e1',
            'fill-opacity': 0.5,
            'fill-outline-color': '#00acc1'
          },
          'layout': {
            'visibility': 'none'
          }
        });

        // Add Waterwell Grid
        map.current.addLayer({
          'id': 'waterwell-grid',
          'type': 'circle',
          'source': 'waterwell-grid',
          'paint': {
            'circle-radius': 4,
            'circle-color': '#0277bd',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff'
          },
          'layout': {
            'visibility': 'none'
          }
        });

        // Add Wastewater Outfalls
        map.current.addLayer({
          'id': 'wastewater-outfalls',
          'type': 'circle',
          'source': 'wastewater-outfalls',
          'paint': {
            'circle-radius': 3,
            'circle-color': '#7b1fa2',
            'circle-opacity': 0.8
          },
          'layout': {
            'visibility': 'none'
          }
        });

        // Add AI consensus layer
        map.current.addLayer({
          'id': 'ai-consensus-particles',
          'type': 'circle',
          'source': 'surface-water-intake',
          'paint': {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10, 4,
              15, 6,
              20, 8
            ],
            'circle-color': [
              'interpolate',
              ['linear'],
              ['get', 'disagreement'],
              0.8, '#ff9800',
              0.85, '#f57c00',
              0.9, '#e65100',
              0.95, '#d84315'
            ],
            'circle-opacity': 0.95,
            'circle-blur': 0.2
          },
          'layout': {
            'visibility': 'none'
          }
        });

        // Update source data with mock AI disagreement values
        const surfaceWaterSource = map.current.getSource('surface-water');
        const updatedFeatures = surfaceWaterData.features.map(feature => {
          const zipCode = feature.properties.Zip_Code;
          const modelData = mockDisagreementData[zipCode];
          return {
            ...feature,
            properties: {
              ...feature.properties,
              ai_disagreement: modelData?.disagreement || 0,
              model_data: modelData
            }
          };
        });

        surfaceWaterSource.setData({
          type: 'FeatureCollection',
          features: updatedFeatures
        });

        // Add hover effect for AI consensus layer
        let aiConsensusPopup = null;
        
        map.current.on('mousemove', 'ai-consensus-particles', (e) => {
          if (e.features.length > 0) {
            map.current.getCanvas().style.cursor = 'pointer';
            const feature = e.features[0];
            const zipCode = feature.properties.Zip_Code;
            const modelData = feature.properties.model_data;
            
            // Remove existing popup if it exists
            if (aiConsensusPopup) {
              aiConsensusPopup.remove();
            }
            
            if (modelData && modelData.models) {  // Add null check for models
              aiConsensusPopup = new mapboxgl.Popup({
                closeButton: false,
                closeOnClick: false,
                className: 'ai-consensus-popup',
                maxWidth: '300px'
              })
                .setLngLat(e.lngLat)
                .setHTML(formatAIConsensusData(modelData))
                .addTo(map.current);
            } else {
              // Show a simpler popup for areas without model data
              aiConsensusPopup = new mapboxgl.Popup({
                closeButton: true,
                closeOnClick: false,
                className: 'ai-consensus-popup',
                maxWidth: '300px'
              })
                .setLngLat(e.lngLat)
                .setHTML(`
                  <div>
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">
                      ZIP Code: ${zipCode}
                    </div>
                    <div style="font-size: 14px; opacity: 0.7;">
                      No model predictions available
                    </div>
                  </div>
                `)
                .addTo(map.current);
            }
          }
        });

        map.current.on('mouseleave', 'ai-consensus-particles', () => {
          map.current.getCanvas().style.cursor = '';
          if (aiConsensusPopup) {
            aiConsensusPopup.remove();
            aiConsensusPopup = null;
          }
        });
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    map.current.on('load', initializeMapLayers);
  }, []);
}; 
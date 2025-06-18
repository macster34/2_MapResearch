import React, { useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { formatWaterData, formatAIConsensusData } from './PopupCards';

export const PopupManager = ({ map }) => {
  useEffect(() => {
    if (!map.current) return;

    // Create a single reference for the current popup
    let currentPopup = null;
    let aiConsensusPopup = null;

    // Add hover effects and popups for point layers
    const pointLayers = ['surface-water-intake', 'waterwell-grid', 'wastewater-outfalls'];

    pointLayers.forEach(layerId => {
      // Add hover effect
      map.current.on('mouseenter', layerId, () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', layerId, () => {
        map.current.getCanvas().style.cursor = '';
      });

      // Add click handler for popup
      map.current.on('click', layerId, (e) => {
        e.preventDefault(); // Prevent event from bubbling to other layers
        
        if (!e.features?.length) return;
        
        const feature = e.features[0];
        const props = feature.properties;

        // Remove any existing popup
        if (currentPopup) {
          currentPopup.remove();
          currentPopup = null;
        }

        // Create new popup
        currentPopup = new mapboxgl.Popup({
          closeButton: true,
          closeOnClick: false,
          className: 'custom-popup'
        })
          .setLngLat(e.lngLat)
          .setHTML(formatWaterData(props))
          .addTo(map.current);

        // Add event listener for when popup is closed
        currentPopup.on('close', () => {
          currentPopup = null;
        });
      });
    });

    // Add hover effect for AI consensus layer
    map.current.on('mousemove', 'ai-consensus-analysis', (e) => {
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

    map.current.on('mouseleave', 'ai-consensus-analysis', () => {
      map.current.getCanvas().style.cursor = '';
      if (aiConsensusPopup) {
        aiConsensusPopup.remove();
        aiConsensusPopup = null;
      }
    });

    // Cleanup function
    return () => {
      if (currentPopup) {
        currentPopup.remove();
        currentPopup = null;
      }
      if (aiConsensusPopup) {
        aiConsensusPopup.remove();
        aiConsensusPopup = null;
      }
    };
  }, [map]);

  return null; // This component doesn't render anything
}; 
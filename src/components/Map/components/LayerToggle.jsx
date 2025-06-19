import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useZipCodeLayer } from '../../../hooks/useZipCodeLayer';
import { useMUDLayer } from '../../../hooks/useMUDLayer';

const LayerToggleContainer = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  padding: 10px;
  border-radius: 4px;
  z-index: 1;
  transition: transform 0.3s ease;
  transform: translateX(${props => props.$isCollapsed ? 'calc(100% + 10px)' : '0'});
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const LayerCollapseButton = styled.div`
  position: absolute;
  left: -32px;
  top: 10px;
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;

  svg {
    width: 24px;
    height: 24px;
    fill: white;
    transform: rotate(${props => props.$isCollapsed ? '180deg' : '0deg'});
    transition: transform 0.3s ease;
  }

  &:hover {
    background: rgba(0, 0, 0, 0.9);
  }
`;

const ToggleButton = styled.button`
  padding: 8px 12px;
  background: ${props => props.$active ? '#2196F3' : '#666'};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  width: 150px;
  text-align: left;
  transition: all 0.3s ease;

  &:hover {
    background: ${props => props.$active ? '#1976D2' : '#777'};
  }
`;

const FloodDropdown = styled.div`
  background: rgba(0,0,0,0.85);
  border-radius: 4px;
  margin-bottom: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  padding: 0 0 8px 0;
`;

const FloodDropdownHeader = styled.div`
  padding: 8px 12px;
  cursor: pointer;
  color: #fff;
  font-weight: 600;
  background: ${props => props.$active ? '#2196F3' : '#666'};
  border-radius: 4px 4px 0 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const FloodDropdownContent = styled.div`
  padding: 8px 12px 0 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const LayerToggle = ({
  map,
  isLayerMenuCollapsed,
  setIsLayerMenuCollapsed,
  isErcotMode,
  setIsErcotMode,
  showRoadGrid,
  setShowRoadGrid,
  showRoadParticles,
  setShowRoadParticles,
  showMUDLayer,
  setShowMUDLayer,
  showHarveyData,
  setShowHarveyData,
  showSurfaceWater,
  setShowSurfaceWater,
  showWastewaterOutfalls,
  setShowWastewaterOutfalls,
  showZipCodes,
  setShowZipCodes,
  showZipFloodAnalysis,
  setShowZipFloodAnalysis,
  showAIConsensus,
  setShowAIConsensus,
  fetchErcotData,
  loadHarveyData,
  showCensusBlocks,
  setShowCensusBlocks,
  showCensusBlockDemographic,
  setShowCensusBlockDemographic,
  showCensusBlock2023Demographic,
  setShowCensusBlock2023Demographic,
  showCommunityCenters,
  setShowCommunityCenters,
  showFlood100,
  setShowFlood100,
  showFlood500,
  setShowFlood500,
  showFloodplainDistanceLines,
  setShowFloodplainDistanceLines
}) => {
  console.log('[LayerToggle] Rendered with showMUDLayer:', showMUDLayer);
  const { showZipCodes: showZipCodesLayer, hideZipCodes: hideZipCodesLayer } = useZipCodeLayer(map, showZipCodes);
  const { showMUD, hideMUD } = useMUDLayer(map, showMUDLayer);
  const [isFloodDropdownOpen, setIsFloodDropdownOpen] = useState(false);

  // Add clearErcotMode function
  const clearErcotMode = () => {
    setIsErcotMode(false);
    if (map.current) {
      // Hide the census blocks layer when exiting ERCOT mode
      map.current.setLayoutProperty('census-blocks', 'visibility', 'none');
      
      // First remove the road layer if it exists
      if (map.current.getLayer('road-grid')) {
        map.current.removeLayer('road-grid');
      }
      
      // Then reset the census blocks
      map.current.setPaintProperty('census-blocks', 'fill-color', '#FF5500');
      map.current.setPaintProperty('census-blocks', 'fill-opacity', 0.6);
      
      // Reset road grid state
      setShowRoadGrid(false);
    }
  };

  // Add effect for building layers
  useEffect(() => {
    if (!map.current) return;

    // Wait for map style to load
    map.current.once('style.load', () => {
      // Make 3D buildings solid
      const buildingLayers = [
        'building', // OSM buildings
        'building-extrusion', // Mapbox 3D buildings
        '3d-buildings' // Custom 3D buildings if any
      ];

      buildingLayers.forEach(layerId => {
        if (map.current.getLayer(layerId)) {
          // Update fill-extrusion-opacity for 3D buildings
          if (map.current.getPaintProperty(layerId, 'fill-extrusion-opacity') !== undefined) {
            map.current.setPaintProperty(layerId, 'fill-extrusion-opacity', 1);
          }
          // Update fill-opacity for 2D buildings
          if (map.current.getPaintProperty(layerId, 'fill-opacity') !== undefined) {
            map.current.setPaintProperty(layerId, 'fill-opacity', 1);
          }
        }
      });

      // Ensure buildings are rendered above other layers
      buildingLayers.forEach(layerId => {
        if (map.current.getLayer(layerId)) {
          map.current.moveLayer(layerId);
        }
      });
    });
  }, [map]);

  return (
    <LayerToggleContainer $isCollapsed={isLayerMenuCollapsed}>
      <LayerCollapseButton 
        onClick={() => setIsLayerMenuCollapsed(!isLayerMenuCollapsed)}
        $isCollapsed={isLayerMenuCollapsed}
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/>
        </svg>
      </LayerCollapseButton>

      <ToggleButton 
        $active={isErcotMode}
        onClick={isErcotMode ? clearErcotMode : fetchErcotData}
        style={{ 
          height: '32px', 
          padding: '0 12px', 
          fontSize: '14px', 
          marginBottom: '8px',
          backgroundColor: isErcotMode ? '#0288D1' : '#666'
        }}
      >
        ERCOT
      </ToggleButton>

      <ToggleButton 
        $active={showRoadGrid}
        onClick={() => setShowRoadGrid(!showRoadGrid)}
        style={{ height: '32px', padding: '0 12px', fontSize: '14px' }}
      >
        Roads
      </ToggleButton>

      <ToggleButton 
        $active={showMUDLayer}
        onClick={async () => {
          setShowMUDLayer(!showMUDLayer);
          if (!showMUDLayer) {
            await showMUD();
          } else {
            hideMUD();
          }
        }}
        style={{ height: '32px', padding: '0 12px', fontSize: '14px', marginBottom: '8px' }}
      >
        MUDs
      </ToggleButton>

      <ToggleButton 
        $active={showHarveyData}
        onClick={() => {
          console.log('Harvey data button clicked, current state:', showHarveyData);
          setShowHarveyData(!showHarveyData);
          if (!showHarveyData) {
            console.log('Enabling Harvey data visualization');
            map.current.setLayoutProperty('census-blocks', 'visibility', 'visible');
          } else {
            console.log('Disabling Harvey data visualization');
            map.current.setLayoutProperty('census-blocks', 'visibility', 'none');
            // Remove any existing popups
            const existingPopups = document.getElementsByClassName('mapboxgl-popup');
            Array.from(existingPopups).forEach(popup => popup.remove());
          }
        }}
        style={{ height: '32px', padding: '0 12px', fontSize: '14px', marginBottom: '8px' }}
      >
        Harvey Data
      </ToggleButton>

      <ToggleButton 
        $active={showSurfaceWater}
        onClick={() => {
          setShowSurfaceWater(!showSurfaceWater);
          // List of water-related layers (excluding wastewater outfalls)
          const waterLayers = [
            'surface-water',
            'surface-water-intake',
            'small-tribal-areas',
            'small-areas',
            'pws-reservoir'
          ];
          
          // Toggle visibility for water layers
          waterLayers.forEach(layerId => {
            map.current.setLayoutProperty(
              layerId,
              'visibility',
              !showSurfaceWater ? 'visible' : 'none'
            );
          });
        }}
        style={{ height: '32px', padding: '0 12px', fontSize: '14px', marginBottom: '8px' }}
      >
        Water Layers
      </ToggleButton>

      <ToggleButton 
        $active={showWastewaterOutfalls}
        onClick={() => {
          setShowWastewaterOutfalls(!showWastewaterOutfalls);
          map.current.setLayoutProperty(
            'wastewater-outfalls',
            'visibility',
            !showWastewaterOutfalls ? 'visible' : 'none'
          );
        }}
        style={{ height: '32px', padding: '0 12px', fontSize: '14px', marginBottom: '8px' }}
      >
        Outfalls
      </ToggleButton>

      <ToggleButton 
        $active={showZipCodes}
        onClick={async () => {
          setShowZipCodes(!showZipCodes);
          if (!showZipCodes) {
            await showZipCodesLayer();
          } else {
            hideZipCodesLayer();
          }
        }}
        style={{ height: '32px', padding: '0 12px', fontSize: '14px', marginBottom: '8px' }}
      >
        ZIP Codes
      </ToggleButton>

      <ToggleButton 
        $active={showZipFloodAnalysis}
        onClick={async () => {
          setShowZipFloodAnalysis(!showZipFloodAnalysis);
          map.current.setLayoutProperty(
            'zipcode-flood-analysis',
            'visibility',
            !showZipFloodAnalysis ? 'visible' : 'none'
          );
          if (!showZipFloodAnalysis) {
            if (!showHarveyData) {
              setShowHarveyData(true);
            }
            // Load and process flood analysis data
            await loadHarveyData(map.current, true);
          }
        }}
        style={{ height: '32px', padding: '0 12px', fontSize: '14px', marginBottom: '8px' }}
      >
        Flood Analysis
      </ToggleButton>

      <ToggleButton 
        $active={showAIConsensus}
        onClick={() => {
          setShowAIConsensus(!showAIConsensus);
          map.current.setLayoutProperty(
            'ai-consensus-analysis',
            'visibility',
            !showAIConsensus ? 'visible' : 'none'
          );
        }}
        style={{ height: '32px', padding: '0 12px', fontSize: '14px', marginBottom: '8px' }}
      >
        AI Consensus
      </ToggleButton>

      <ToggleButton 
        $active={showCensusBlocks}
        onClick={() => setShowCensusBlocks(!showCensusBlocks)}
        style={{ height: '32px', padding: '0 12px', fontSize: '14px', marginBottom: '8px' }}
      >
        Census Blocks
      </ToggleButton>

      <ToggleButton 
        $active={showCensusBlockDemographic}
        onClick={() => setShowCensusBlockDemographic(!showCensusBlockDemographic)}
        style={{ height: '32px', padding: '0 12px', fontSize: '14px', marginBottom: '8px', backgroundColor: showCensusBlockDemographic ? '#C41E3A' : '#666' }}
      >
        2010 Census Block Demographics
      </ToggleButton>

      <ToggleButton 
        $active={showCommunityCenters}
        onClick={() => setShowCommunityCenters(!showCommunityCenters)}
        style={{ height: '32px', padding: '0 12px', fontSize: '14px', marginBottom: '8px' }}
      >
        Community Centers
      </ToggleButton>

      <ToggleButton
        $active={showFloodplainDistanceLines}
        onClick={() => setShowFloodplainDistanceLines(!showFloodplainDistanceLines)}
        style={{ height: '32px', padding: '0 12px', fontSize: '14px', marginBottom: '8px', background: showFloodplainDistanceLines ? '#00BFFF' : '#666' }}
      >
        Floodplain Distance Lines
      </ToggleButton>

      <FloodDropdown>
        <FloodDropdownHeader $active={showFlood100 || showFlood500} onClick={() => setIsFloodDropdownOpen(v => !v)}>
          Flood Plains
          <span style={{ fontSize: 18 }}>{isFloodDropdownOpen ? '▾' : '▸'}</span>
        </FloodDropdownHeader>
        {isFloodDropdownOpen && (
          <FloodDropdownContent>
            <ToggleButton
              $active={showFlood100}
              onClick={() => setShowFlood100(v => !v)}
              style={{ background: showFlood100 ? '#7EC8E3' : '#666', color: '#222' }}
            >
              100-Year Floodplain
            </ToggleButton>
            <ToggleButton
              $active={showFlood500}
              onClick={() => setShowFlood500(v => !v)}
              style={{ background: showFlood500 ? '#1B263B' : '#666', color: '#fff' }}
            >
              500-Year Floodplain
            </ToggleButton>
          </FloodDropdownContent>
        )}
      </FloodDropdown>
    </LayerToggleContainer>
  );
};

export default LayerToggle; 
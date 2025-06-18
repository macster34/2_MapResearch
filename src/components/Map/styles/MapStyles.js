import styled, { keyframes } from 'styled-components';

export const MapContainer = styled.div`
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;

  @media (max-width: 768px) {
    height: 100vh; // Fill entire viewport height
    position: fixed; // Ensure it stays fixed
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .callout-annotation {
    cursor: default;
    
    &:hover {
      z-index: 2;
    }
  }

  .mapboxgl-marker {
    z-index: 1;
  }

  .custom-popup .mapboxgl-popup-content {
    background: none;
    padding: 0;
    border: none;
    box-shadow: none;
  }

  .custom-popup .mapboxgl-popup-close-button {
    color: white;
    font-size: 16px;
    padding: 4px 8px;
    right: 4px;
    top: 4px;
  }

  .custom-popup .mapboxgl-popup-tip {
    display: none;
  }

  /* Add custom styling for all popups */
  .mapboxgl-popup {
    z-index: 3;
  }

  .mapboxgl-popup-content {
    background: rgba(0, 0, 0, 0.85) !important;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px !important;
    padding: 16px !important;
    color: white !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) !important;
    backdrop-filter: blur(8px);
  }

  .mapboxgl-popup-tip {
    display: none;
  }

  .mapboxgl-popup-close-button {
    color: rgba(255, 255, 255, 0.6) !important;
    font-size: 18px !important;
    padding: 8px !important;
    right: 4px !important;
    top: 4px !important;
    
    &:hover {
      color: white !important;
      background: none !important;
    }
  }

  /* Specific styles for flood analysis popup */
  .flood-analysis-popup .mapboxgl-popup-content {
    background: rgba(0, 0, 0, 0.9) !important;
    border-color: rgba(77, 212, 172, 0.2) !important;
  }

  /* Specific styles for AI consensus popup */
  .ai-consensus-popup .mapboxgl-popup-content {
    background: rgba(0, 0, 0, 0.9) !important;
    border-color: rgba(255, 152, 0, 0.2) !important;
  }
`;

export const LayerToggleContainer = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  
  @media (max-width: 768px) {
    top: auto;
    bottom: 20px;
    right: 10px;
    max-width: 90%;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
`;

export const LayerCollapseButton = styled.div`
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

export const ToggleButton = styled.button`
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

  @media (max-width: 768px) {
    padding: 8px;
    font-size: 12px;
    width: auto;
    min-width: 80px;
    height: 36px;
  }
`;

export const Panel = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  width: 400px;
  max-height: calc(100vh - 40px);
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  transform: ${props => props.$isCollapsed ? 'translateX(-420px)' : 'translateX(0)'};
  transition: transform 0.3s ease;
  z-index: 2;
`;

/* ... rest of the existing styles ... */ 
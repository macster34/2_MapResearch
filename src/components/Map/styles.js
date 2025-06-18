import styled from 'styled-components';

export const mapStyles = `
  .custom-marker {
    transform: translate(-50%, -50%);
  }

  .map-container {
    width: 100%;
    height: 100vh;
    position: relative;
  }

  .mapboxgl-popup {
    max-width: 400px;
    font: 12px/20px 'Helvetica Neue', Arial, Helvetica, sans-serif;
    z-index: 3000 !important;
  }

  .mapboxgl-popup-content {
    background: rgba(0, 0, 0, 0.85);
    color: #fff;
    padding: 15px;
    border-radius: 8px;
    border: 2px solid #4CAF50;
  }

  .mapboxgl-popup-anchor-top .mapboxgl-popup-tip {
    border-bottom-color: #4CAF50;
  }

  .mapboxgl-popup-anchor-bottom .mapboxgl-popup-tip {
    border-top-color: #4CAF50;
  }

  .mapboxgl-popup-anchor-left .mapboxgl-popup-tip {
    border-right-color: #4CAF50;
  }

  .mapboxgl-popup-anchor-right .mapboxgl-popup-tip {
    border-left-color: #4CAF50;
  }

  .building-popup {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .building-popup h3 {
    margin: 0;
    color: #4CAF50;
    font-size: 14px;
  }

  .building-popup p {
    margin: 5px 0;
    font-size: 12px;
  }

  .building-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .stat-item svg {
    width: 16px;
    height: 16px;
    stroke: #4CAF50;
  }

  .power-grid-marker {
    width: 20px;
    height: 20px;
    background-color: rgba(76, 175, 80, 0.8);
    border: 2px solid #fff;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .power-grid-marker:hover {
    background-color: #4CAF50;
    transform: scale(1.1);
  }

  .power-grid-marker.main-station {
    background-color: rgba(255, 152, 0, 0.8);
    width: 24px;
    height: 24px;
  }

  .power-grid-marker.main-station:hover {
    background-color: #FF9800;
  }

  .power-grid-marker.substation {
    background-color: rgba(156, 39, 176, 0.8);
  }

  .power-grid-marker.substation:hover {
    background-color: #9C27B0;
  }

  .power-grid-marker.distribution {
    background-color: rgba(3, 169, 244, 0.8);
  }

  .power-grid-marker.distribution:hover {
    background-color: #03A9F4;
  }

  .power-grid-marker.building-connection {
    width: 16px;
    height: 16px;
    background-color: rgba(76, 175, 80, 0.6);
  }

  .power-grid-marker.building-connection:hover {
    background-color: rgba(76, 175, 80, 0.8);
  }
`;

export const MapContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;

  .callout-annotation {
    cursor: default;
    
    &:hover {
      z-index: 2;
    }
  }

  .mapboxgl-marker {
    z-index: 1;
  }
`;

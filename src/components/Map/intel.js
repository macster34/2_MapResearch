import mapboxgl from 'mapbox-gl';

// Popup configuration
const POPUP_CONFIG = {
  className: 'custom-popup',
  closeButton: true,
  maxWidth: '360px',
  closeOnClick: true,
  closeOnMove: false
};

// Popup styles
const POPUP_STYLES = {
  container: `
    background: rgba(26, 26, 26, 0.95); 
    padding: 10px;
    border-radius: 4px;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    min-width: 200px;
    cursor: move;
    user-select: none;
  `,
  handle: `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 15px;
    cursor: move;
  `,
  grid: `
    display: grid;
    grid-gap: 6px;
  `,
  header: `
    display: flex;
    justify-content: space-between;
    align-items: center;
  `,
  price: (value) => `
    font-size: 18px; 
    color: ${value > 100 ? '#ff4d4d' : '#4CAF50'};
  `,
  priceLabel: `
    font-size: 6px; 
    color: #888;
  `,
  status: (value) => `
    padding: 2px 4px;
    border-radius: 2px;
    background: ${value > 100 ? '#ff4d4d33' : '#4CAF5033'};
    color: ${value > 100 ? '#ff4d4d' : '#4CAF50'};
    font-size: 6px;
  `,
  consumption: `
    font-size: 10px;
  `,
  consumptionLabel: `
    font-size: 6px; 
    color: #888;
  `,
  footer: `
    margin-top: 2px;
    padding-top: 6px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 8px;
    color: #888;
  `
};

export const createErcotPopup = (feature, lngLat) => {
  return new mapboxgl.Popup(POPUP_CONFIG)
    .setLngLat(lngLat)
    .setHTML(`
      <div style="${POPUP_STYLES.container}" class="draggable-popup">
        <div class="popup-handle" style="${POPUP_STYLES.handle}"></div>
        <div style="${POPUP_STYLES.grid}">
          <div style="${POPUP_STYLES.header}">
            <div>
              <div style="${POPUP_STYLES.price(feature.properties.price)}">
                $${feature.properties.price?.toFixed(2)}
              </div>
              <div style="${POPUP_STYLES.priceLabel}">Current Price/MWh</div>
            </div>
            <div style="${POPUP_STYLES.status(feature.properties.price)}">
              ${feature.properties.price > 100 ? '⚠️ High' : '✓ Normal'}
            </div>
          </div>

          <div>
            <div style="${POPUP_STYLES.consumption}">${feature.properties.mw?.toFixed(1)} MW</div>
            <div style="${POPUP_STYLES.consumptionLabel}">Power Consumption</div>
          </div>

          <div style="${POPUP_STYLES.footer}">
            <div style="margin-bottom: 2px;">Source: ERCOT</div>
            <div style="display: flex; justify-content: space-between;">
              <div>Block #${feature.properties.OBJECTID}</div>
              <div>${new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        </div>
      </div>
    `);
};

import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { giraffeState, rpc } from "@gi-nx/iframe-sdk";
import 'mapbox-gl/dist/mapbox-gl.css';

const DC_BOUNDS = [
  [-77.1231, 38.8936],
  [-76.9093, 38.9958]
];

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

const Map = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapError, setMapError] = useState(null);

  // ... rest of implementation ...

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      {mapError && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255,0,0,0.8)',
          color: 'white',
          padding: '20px',
          borderRadius: '5px'
        }}>
          Error loading map: {mapError}
        </div>
      )}
    </div>
  );
};

export default Map; 
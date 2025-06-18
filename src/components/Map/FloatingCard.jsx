import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const FloatingCard = ({ coordinates, map, iconColor = '#4CAF50' }) => {
  const [position, setPosition] = useState(() => map.project(coordinates));

  useEffect(() => {
    const updatePosition = () => {
      setPosition(map.project(coordinates));
    };

    // Add map event listeners
    map.on('move', updatePosition);
    map.on('zoom', updatePosition);
    map.on('rotate', updatePosition);

    // Cleanup listeners
    return () => {
      map.off('move', updatePosition);
      map.off('zoom', updatePosition);
      map.off('rotate', updatePosition);
    };
  }, [map, coordinates]);

  return (
    <div style={{
      position: 'fixed',
      left: `${position.x}px`,
      top: `${position.y - 40}px`,
      transform: 'translate(10%, -100%)',
      background: 'rgba(0, 0, 0, 0.85)',
      borderRadius: '8px',
      padding: '8px',
      width: 'auto',
      border: '2px solid #4CAF50',
      color: 'white',
      zIndex: 1000,
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
      pointerEvents: 'none',
      transition: 'left 0.1s, top 0.1s'
    }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        {/* Charts Icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
          <path d="M2 2v20h20"/><path d="M14 10v8"/><path d="M10 14v4"/><path d="M18 6v12"/>
        </svg>
        
        {/* Power Icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
        
        {/* Server Icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        </svg>
        
        {/* Plus Icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
          <path d="M12 2v20M2 12h20"/>
        </svg>
        
        {/* Circle Icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
          <path d="M12 18c3.3 0 6-2.7 6-6s-2.7-6-6-6-6 2.7-6 6 2.7 6 6 6z"/>
        </svg>
      </div>
    </div>
  );
};

FloatingCard.propTypes = {
  coordinates: PropTypes.arrayOf(PropTypes.number).isRequired,
  map: PropTypes.object.isRequired,
  iconColor: PropTypes.string
};

export default FloatingCard; 
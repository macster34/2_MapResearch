import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import { createErcotPopup } from '../intel';

export const ErcotManager = forwardRef(({ map, isErcotMode, setIsErcotMode }, ref) => {
  useEffect(() => {
    if (!map.current) return;

    // Add click handler for census blocks
    const handleCensusBlockClick = (e) => {
      if (!e.features?.length) return;
      
      const feature = e.features[0];
      const clickedId = feature.properties.OBJECTID;
      
      console.log('Block clicked:', {
        id: clickedId,
        price: feature.properties.price,
        mw: feature.properties.mw,
        isErcotMode
      });

      // Update opacity for all blocks - clicked one stays full opacity, others dim
      map.current.setPaintProperty('census-blocks', 'fill-opacity', [
        'case',
        ['==', ['get', 'OBJECTID'], clickedId],
        0.7,  // Keep full opacity for clicked block
        0.3   // Dim other blocks
      ]);

      // Always show popup when we have ERCOT data
      if (feature.properties.price !== undefined && feature.properties.mw !== undefined) {
        // Remove existing popups
        const existingPopups = document.getElementsByClassName('mapboxgl-popup');
        Array.from(existingPopups).forEach(popup => popup.remove());

        // Create and add the popup
        createErcotPopup(feature, e.lngLat).addTo(map.current);
      }
    };

    // Add the click handler
    map.current.on('click', 'census-blocks', handleCensusBlockClick);

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.off('click', 'census-blocks', handleCensusBlockClick);
      }
    };
  }, [map, isErcotMode]);

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
      map.current.setPaintProperty('census-blocks', 'fill-color', '#FF0000');
      map.current.setPaintProperty('census-blocks', 'fill-opacity', 0.4);
    }
  };

  const fetchErcotData = async () => {
    try {
      console.log('🔄 Loading ERCOT data...');
      setIsErcotMode(true);
      
      // Show the census blocks layer when entering ERCOT mode
      map.current.setLayoutProperty('census-blocks', 'visibility', 'visible');
      
      const response = await fetch('http://localhost:3001/api/ercot-data', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data?.data && map.current) {
        // Merge ERCOT data with census blocks
        const source = map.current.getSource('census-blocks');
        if (!source) {
          console.error('❌ Census blocks source not found');
          return;
        }

        const currentFeatures = source._data.features;
        const mergedFeatures = currentFeatures.map((feature, index) => {
          const ercotData = data.data[index % data.data.length];
          return {
            ...feature,
            properties: {
              ...feature.properties,
              price: ercotData.price,
              mw: ercotData.mw
            }
          };
        });

        // Update source data
        source.setData({
          type: 'FeatureCollection',
          features: mergedFeatures
        });

        // Set colors based on price - UPDATED TO BLUE COLOR SCHEME
        const prices = data.data.map(d => d.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        // Apply blue color scheme
        map.current.setPaintProperty('census-blocks', 'fill-color', [
          'interpolate',
          ['linear'],
          ['get', 'price'],
          minPrice, '#E0F7FA',      // Light cyan/blue
          minPrice + (maxPrice - minPrice) * 0.25, '#81D4FA',  // Light blue
          minPrice + (maxPrice - minPrice) * 0.5, '#4FC3F7',   // Medium blue
          minPrice + (maxPrice - minPrice) * 0.75, '#0288D1',  // Darker blue
          maxPrice, '#01579B'       // Deep blue
        ]);

        // Add outline for better contrast
        map.current.setPaintProperty('census-blocks', 'fill-outline-color', '#002171'); // Very dark blue outline
        map.current.setPaintProperty('census-blocks', 'fill-opacity', 0.8); // Slightly increased opacity
      }
    } catch (error) {
      console.error('❌ Error fetching ERCOT data:', error);
      setIsErcotMode(false);
    }
  };

  // Update color values for ERCOT visualization
  const getColorForPrice = (price) => {
    // Change from blue-green to orange-red color scheme
    if (price <= 25) return '#FF8C00'; // Dark Orange
    if (price <= 35) return '#FF7800'; 
    if (price <= 45) return '#FF6400';
    if (price <= 55) return '#FF5000';
    if (price <= 65) return '#FF3C00';
    if (price <= 75) return '#FF2800';
    if (price <= 85) return '#FF1400';
    return '#FF0000'; // Bright Red for highest values
  };

  // Update highlight colors from blue to orange
  const getHighlightColor = (price) => {
    // Change from blue-green to orange-red color scheme for highlights
    if (price <= 25) return '#FFAC40'; // Lighter Dark Orange
    if (price <= 35) return '#FF9840'; 
    if (price <= 45) return '#FF8440';
    if (price <= 55) return '#FF7040';
    if (price <= 65) return '#FF5C40';
    if (price <= 75) return '#FF4840';
    if (price <= 85) return '#FF3440';
    return '#FF2020'; // Lighter Bright Red for highlights
  };

  const visualizeErcotData = (data) => {
    if (!map.current || !data?.data || !Array.isArray(data.data)) {
      console.error('Invalid ERCOT data or map not available');
      return;
    }

    // Process ERCOT data
    console.log('Processing ERCOT data for visualization:', data);
    
    // Create a price map for census blocks (assuming this is part of the existing code)
    const priceMap = new Map();
    data.data.forEach(point => {
      priceMap.set(point.id, point.price);
    });
    
    // Update census blocks with the new color scheme
    map.current.setLayoutProperty('census-blocks', 'visibility', 'visible');
    
    // Apply new color scheme to census blocks
    map.current.setPaintProperty('census-blocks', 'fill-color', [
      'case',
      ['has', 'id'],
      [
        'match',
        ['get', 'id'],
        ...Array.from(priceMap).flatMap(([id, price]) => [id, getColorForPrice(price)]),
        '#FFB266' // Default orange color for blocks with ID but no price
      ],
      '#FF8C00' // Default dark orange for blocks without ID
    ]);
    
    // Adjust opacity
    map.current.setPaintProperty('census-blocks', 'fill-opacity', 0.7);
    
    // Add an outline for better visibility
    map.current.setPaintProperty('census-blocks', 'fill-outline-color', '#BB0000'); // Dark red outline
  
    // Update any other visualizations (like road grids) with the new color scheme
    // Assuming there might be other related code here
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    fetchErcotData,
    clearErcotMode
  }));

  return null; // This component doesn't render anything
}); 
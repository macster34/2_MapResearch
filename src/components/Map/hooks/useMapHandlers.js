export const handlePMTClick = (e, map, currentFilter) => {
  // Move PMT click handler logic here
};

export const handlePMTMouseLeave = (map, currentFilter) => {
  if (map && currentFilter.current) {
    map.setFilter('pmt-boundaries', currentFilter.current);
  }
};

// ... other event handlers 
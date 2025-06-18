import { useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import FloatingCard from '../components/Map/FloatingCard';

export const useBuildingInteraction = (map, onArticleUpdate) => {
  const currentFloatingCard = useRef(null);
  const currentRoot = useRef(null);

  const handleBuildingClick = useCallback((building) => {
    // Move building click handler from index.jsx lines 3012-3023
    if (!map.current) return;

    // Clear existing floating card
    if (currentRoot.current) {
      currentRoot.current.unmount();
    }
    if (currentFloatingCard.current) {
      currentFloatingCard.current.remove();
    }

    // Create new floating card
    const container = document.createElement('div');
    currentFloatingCard.current = container;
    document.body.appendChild(container);

    const root = createRoot(container);
    currentRoot.current = root;

    root.render(
      <FloatingCard 
        coordinates={building.geometry.coordinates} 
        map={map.current}
        buildingData={building.properties}
      />
    );

    onArticleUpdate(building);
  }, [map, onArticleUpdate]);

  return {
    handleBuildingClick,
    currentFloatingCard,
    currentRoot
  };
}; 
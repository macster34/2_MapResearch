import { useCallback, useRef } from 'react';
import {
  PARTICLE_COUNT,
  PARTICLE_SPEED,
  COGENT_PARTICLE_COLOR,
  THROTTLE_TIME,
  MIN_ZOOM
} from '../components/Map/constants';

export const useParticleSystem = (map) => {
  const animationFrame = useRef(null);
  const lastAnimationTime = useRef(0);

  const createCogentParticles = useCallback((sourceCoords, nearbyBuildings) => {
    const features = [];
    
    nearbyBuildings.forEach((building, index) => {
      const targetCoords = building.geometry.coordinates[0][0];
      const duration = 1 + Math.random() * 2; // Random duration between 1-3 seconds
      
      features.push({
        type: 'Feature',
        properties: {
          duration: duration,
          'line-progress': 0
        },
        geometry: {
          type: 'LineString',
          coordinates: [sourceCoords, targetCoords]
        }
      });
    });

    return {
      type: 'FeatureCollection',
      features: features
    };
  }, []);

  const generateParticles = useCallback((buildingCenters, roads) => {
    const particles = {
      type: 'FeatureCollection',
      features: []
    };

    // Generate particles along roads
    roads.forEach(road => {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const progress = Math.random();
        const coords = [
          road.start[0] + (road.end[0] - road.start[0]) * progress,
          road.start[1] + (road.end[1] - road.start[1]) * progress
        ];

        particles.features.push({
          type: 'Feature',
          properties: {
            speed: PARTICLE_SPEED * (0.5 + Math.random()),
            progress,
            roadStart: road.start,
            roadEnd: road.end
          },
          geometry: {
            type: 'Point',
            coordinates: coords
          }
        });
      }
    });

    return particles;
  }, []);

  const generateGreenBuildingParticles = useCallback((greenBuildings) => {
    const particles = [];
    const baseParticleCount = 100;
    const greenBuildingParticleCount = Math.floor(baseParticleCount * 1.5);
    
    greenBuildings.forEach(building => {
      const coordinates = building.geometry.coordinates[0][0];
      const particleCount = greenBuildingParticleCount;
      
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 0.002;
        
        const particle = {
          type: 'Feature',
          properties: {
            particleSize: Math.random() * 4 + 3,
            color: '#51ff00',
            opacity: Math.random() * 0.5 + 0.4
          },
          geometry: {
            type: 'Point',
            coordinates: [
              coordinates[0] + Math.cos(angle) * radius,
              coordinates[1] + Math.sin(angle) * radius
            ]
          }
        };
        particles.push(particle);
        
        if (i % 3 === 0) {
          const largeParticle = {
            type: 'Feature',
            properties: {
              particleSize: Math.random() * 6 + 5,
              color: '#51ff00',
              opacity: Math.random() * 0.3 + 0.2
            },
            geometry: {
              type: 'Point',
              coordinates: [
                coordinates[0] + Math.cos(angle) * (radius * 0.8),
                coordinates[1] + Math.sin(angle) * (radius * 0.8)
              ]
            }
          };
          particles.push(largeParticle);
        }
      }
    });

    return {
      type: 'FeatureCollection',
      features: particles
    };
  }, []);

  const animate = useCallback(() => {
    const currentTime = Date.now();
    
    if (currentTime - lastAnimationTime.current < THROTTLE_TIME) {
      animationFrame.current = requestAnimationFrame(animate);
      return;
    }
    
    lastAnimationTime.current = currentTime;

    if (!map.current || !map.current.loaded() || map.current.getZoom() < MIN_ZOOM) {
      animationFrame.current = requestAnimationFrame(animate);
      return;
    }

    try {
      const source = map.current.getSource('particles');
      if (!source) return;

      const data = source.getData();
      const updatedFeatures = data.features.map(feature => {
        const { progress, speed, roadStart, roadEnd } = feature.properties;
        let newProgress = progress + speed;
        
        if (newProgress > 1) {
          newProgress = 0;
        }

        const coords = [
          roadStart[0] + (roadEnd[0] - roadStart[0]) * newProgress,
          roadStart[1] + (roadEnd[1] - roadStart[1]) * newProgress
        ];

        return {
          ...feature,
          properties: {
            ...feature.properties,
            progress: newProgress
          },
          geometry: {
            ...feature.geometry,
            coordinates: coords
          }
        };
      });

      source.setData({
        type: 'FeatureCollection',
        features: updatedFeatures
      });
    } catch (error) {
      console.error('Animation error:', error);
    }

    animationFrame.current = requestAnimationFrame(animate);
  }, [map]);

  return {
    generateParticles,
    generateGreenBuildingParticles,
    createCogentParticles,
    animate,
    animationFrame
  };
}; 
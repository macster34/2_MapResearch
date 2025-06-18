import { brickellGEOIDs } from '../constants/geoIds';
import { addGeoIdTags } from '../utils';
import mapboxgl from 'mapbox-gl';
import { clearExistingElements, handleLLMResponse } from '../hooks/mapAnimations';

// Add these constants at the top
const POI_PARTICLE_COLOR = '#FF4500';
const PARTICLE_COUNT = 200;
const PULSE_DURATION = 2000;

const handleBuildingHighlight = (map, buildingId) => {
    // Remove previous highlights
    map.setFeatureState(
        { source: 'composite', sourceLayer: 'building', id: buildingId },
        { isHighlighted: false }
    );

    // Add new highlight
    map.setFeatureState(
        { source: 'composite', sourceLayer: 'building', id: buildingId },
        { isHighlighted: true }
    );

    // Query building details
    const features = map.queryRenderedFeatures(null, {
        layers: ['3d-buildings'],
        filter: ['==', ['id'], buildingId]
    });

    if (features.length > 0) {
        const building = features[0];
        
        // Create popup content
        const popupContent = document.createElement('div');
        popupContent.className = 'building-popup';
        popupContent.innerHTML = `
            <h3>${building.properties.name || 'Building'}</h3>
            <div class="building-stats">
                <div class="stat-item">
                    <span>Height: ${building.properties.height}m</span>
                </div>
                <div class="stat-item">
                    <span>Year: ${building.properties.yearBuilt || 'N/A'}</span>
                </div>
            </div>
        `;

        // Show popup at building center
        const coordinates = building.geometry.coordinates[0][0];
        new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setDOMContent(popupContent)
            .addTo(map);
    }
};

export const handleBuildingClick = (e, map, highlightedBuildingsData) => {
    console.log('🎯 Click detected on map');
    
    if (!map || !highlightedBuildingsData.current) {
        console.log('❌ Map or highlighted buildings data not available');
        return;
    }

    const features = map.queryRenderedFeatures(e.point, {
        layers: ['3d-buildings']
    });
    
    if (features.length > 0) {
        const clickedBuildingId = features[0].id;
        if (highlightedBuildingsData.current.buildings.has(clickedBuildingId)) {
            // Show boundaries and handle highlighting
            handleBuildingHighlight(map, clickedBuildingId);
        }
    }
};

export const handlePMTClick = (e, map, currentFilter) => {
    console.log('🎯 Click detected on map');
    
    const clearExistingElements = () => {
        const existingMarkers = document.querySelectorAll('.mapboxgl-marker');
        existingMarkers.forEach(marker => marker.remove());
        
        const existingCallouts = document.querySelectorAll('.callout-annotation');
        existingCallouts.forEach(callout => callout.remove());
        
        if (map.getSource('area-highlights')) {
            map.getSource('area-highlights').setData({
                type: 'FeatureCollection',
                features: []
            });
        }
    };

    clearExistingElements();
    
    const features = map.queryRenderedFeatures(e.point, {
        layers: ['pmt-boundaries']
    });
    
    if (features.length > 0) {
        const clickedFeature = features[0];
        console.log('🎯 Clicked GEOID:', clickedFeature.properties.GEOID);
        console.log('📍 Feature properties:', clickedFeature.properties);
    }
    
    const brickellCenter = [-80.2088, 25.7647];
    const zoomLevel = 13.8;
    
    map.flyTo({
        center: brickellCenter,
        zoom: zoomLevel,
        duration: 1000,
        essential: true
    });

    map.once('moveend', () => {
        map.once('idle', () => {
            handlePMTBoundaries(map, currentFilter);
        });
    });
};

const generatePOIBuildingParticles = (buildings) => {
    const particles = [];
    const baseParticleCount = PARTICLE_COUNT;
    const poiBuildingParticleCount = Math.floor(baseParticleCount * 1.5);
    const currentTime = Date.now();
    
    buildings.forEach(building => {
        const coordinates = building.geometry.coordinates[0][0];
        const particleCount = poiBuildingParticleCount;
        
        // Add a large central glow
        const centralGlow = {
            type: 'Feature',
            properties: {
                particleSize: 25,
                color: POI_PARTICLE_COLOR,
                opacity: 0.15 + (Math.sin(currentTime / PULSE_DURATION * Math.PI * 2) + 1) * 0.1
            },
            geometry: {
                type: 'Point',
                coordinates: coordinates
            }
        };
        particles.push(centralGlow);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 0.003;
            
            // Regular orange particles
            const particle = {
                type: 'Feature',
                properties: {
                    particleSize: Math.random() * 6 + 4,
                    color: POI_PARTICLE_COLOR,
                    opacity: Math.random() * 0.6 + 0.4
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
            
            // Add more glow particles (every other particle)
            if (i % 2 === 0) {
                const glowParticle = {
                    type: 'Feature',
                    properties: {
                        particleSize: Math.random() * 12 + 8,
                        color: POI_PARTICLE_COLOR,
                        opacity: (Math.random() * 0.3 + 0.2) * 
                            (Math.sin(currentTime / PULSE_DURATION * Math.PI * 2) + 1) * 0.5
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [
                            coordinates[0] + Math.cos(angle) * (radius * 0.9),
                            coordinates[1] + Math.sin(angle) * (radius * 0.9)
                        ]
                    }
                };
                particles.push(glowParticle);
            }
            
            // Add extra large glow particles (every fifth particle)
            if (i % 5 === 0) {
                const largeGlowParticle = {
                    type: 'Feature',
                    properties: {
                        particleSize: Math.random() * 18 + 12,
                        color: POI_PARTICLE_COLOR,
                        opacity: (Math.random() * 0.2 + 0.1) * 
                            (Math.sin((currentTime + 500) / PULSE_DURATION * Math.PI * 2) + 1) * 0.5
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [
                            coordinates[0] + Math.cos(angle) * (radius * 1.2),
                            coordinates[1] + Math.sin(angle) * (radius * 1.2)
                        ]
                    }
                };
                particles.push(largeGlowParticle);
            }
        }
    });

    return {
        type: 'FeatureCollection',
        features: particles
    };
};

const handlePMTBoundaries = (map, currentFilter) => {
    if (map.getLayer('pmt-boundaries')) {
        currentFilter.current = ['in', ['get', 'GEOID'], ['literal', brickellGEOIDs]];
        map.setFilter('pmt-boundaries', currentFilter.current);
        
        // Show PMT boundaries
        map.setLayoutProperty('pmt-boundaries', 'visibility', 'visible');
        map.setPaintProperty('pmt-boundaries', 'fill-color', 'rgba(0, 0, 0, 0)');
        map.setPaintProperty('pmt-boundaries', 'fill-outline-color', '#FF4500');
        map.setPaintProperty('pmt-boundaries', 'fill-opacity', 1);

        // Add POI particle layer if it doesn't exist
        if (!map.getSource('poi-particles')) {
            map.addSource('poi-particles', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });

            // Add circle layer for particles with enhanced blur and composition
            map.addLayer({
                id: 'poi-particles',
                type: 'circle',
                source: 'poi-particles',
                paint: {
                    'circle-radius': ['get', 'particleSize'],
                    'circle-color': ['get', 'color'],
                    'circle-opacity': ['get', 'opacity'],
                    'circle-blur': 1.5,
                    'circle-pitch-alignment': 'map'
                }
            });
        }

        // Start particle animation for POI buildings
        const animatePOIParticles = () => {
            const poiBuildings = map.queryRenderedFeatures({
                layers: ['3d-buildings'],
                filter: ['==', ['get', 'isPOI'], true]
            });

            if (poiBuildings.length > 0) {
                const particles = generatePOIBuildingParticles(poiBuildings);
                if (map.getSource('poi-particles')) {
                    map.getSource('poi-particles').setData(particles);
                }
            }

            requestAnimationFrame(animatePOIParticles);
        };

        // Start the animation
        animatePOIParticles();

        setTimeout(() => {
            addHatchPatterns(map);
            setTimeout(() => {
                addGeoIdTags(map, brickellGEOIDs);
            }, 500);
        }, 200);

        // Hide other layers
        ['subdivision-boundaries', 'area-circles', 'area-highlights-outline'].forEach(layer => {
            if (map.getLayer(layer)) {
                map.setLayoutProperty(layer, 'visibility', 'none');
            }
        });
    }
};

const addHatchPatterns = (map) => {
    // Add the hatch patterns
    const size = 16;
    const patterns = [
        {
            id: 'light-diagonal',
            angle: 45,
            lineWidth: 0.3,
            opacity: 0.25,
            spacing: 6
        },
        {
            id: 'dots-fine',
            type: 'dots',
            lineWidth: 0.2,
            opacity: 0.2,
            spacing: 8
        },
        {
            id: 'thin-lines',
            angle: 0,
            lineWidth: 0.4,
            opacity: 0.18,
            spacing: 5
        },
        {
            id: 'fine-grid',
            angles: [0, 90],
            lineWidth: 0.15,
            opacity: 0.15,
            spacing: 7
        },
        {
            id: 'sparse-dots',
            type: 'dots',
            lineWidth: 0.15,
            opacity: 0.2,
            spacing: 12
        },
        {
            id: 'thin-cross',
            angles: [45, -45],
            lineWidth: 0.4,
            opacity: 0.42,
            spacing: 10
        },
        {
            id: 'vertical-thin',
            angle: 90,
            lineWidth: 0.2,
            opacity: 0.65,
            spacing: 6
        }
    ];

    // Create and add patterns
    patterns.forEach(pattern => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Clear the canvas with a background
        ctx.fillStyle = `rgba(255, 69, 0, ${pattern.opacity})`;
        ctx.fillRect(0, 0, size, size);
        
        if (pattern.type === 'dots') {
            ctx.beginPath();
            ctx.fillStyle = '#FF4500';
            ctx.arc(size/2, size/2, pattern.lineWidth || 1, 0, Math.PI * 2);
            ctx.fill();
        } else if (pattern.angles) {
            ctx.beginPath();
            ctx.strokeStyle = '#FF4500';
            ctx.lineWidth = pattern.lineWidth || 0.5;
            pattern.angles.forEach(angle => {
                ctx.save();
                ctx.translate(size/2, size/2);
                ctx.rotate(angle * Math.PI / 180);
                ctx.translate(-size/2, -size/2);
                ctx.moveTo(0, 0);
                ctx.lineTo(size, size);
                ctx.restore();
            });
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.strokeStyle = '#FF4500';
            ctx.lineWidth = pattern.lineWidth || 0.5;
            ctx.save();
            ctx.translate(size/2, size/2);
            ctx.rotate(pattern.angle * Math.PI / 180);
            ctx.translate(-size/2, -size/2);
            ctx.moveTo(0, 0);
            ctx.lineTo(size, size);
            ctx.restore();
            ctx.stroke();
        }

        if (map.hasImage(pattern.id)) {
            map.removeImage(pattern.id);
        }
        map.addImage(pattern.id, ctx.getImageData(0, 0, size, size), {
            pixelRatio: 2
        });
    });

    // Add layers for each GEOID
    brickellGEOIDs.forEach((geoid, index) => {
        const patternId = patterns[index % patterns.length].id;
        const layerId = `hatched-area-${geoid}`;

        if (map.getLayer(layerId)) {
            map.removeLayer(layerId);
        }

        map.addLayer({
            'id': layerId,
            'type': 'fill',
            'source': 'pmt-boundaries',
            'paint': {
                'fill-pattern': patternId,
                'fill-opacity': 0,
                'fill-opacity-transition': {
                    duration: 83,
                    delay: index * 8
                }
            },
            'filter': ['==', ['get', 'GEOID'], geoid]
        }, 'pmt-boundaries');

        setTimeout(() => {
            map.setPaintProperty(
                layerId,
                'fill-opacity',
                1
            );
        }, index * 8);
    });
};

// Helper functions for pattern creation and layer addition
const createPattern = (map, pattern) => {
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Pattern creation logic...
    
    if (map.hasImage(pattern.id)) {
        map.removeImage(pattern.id);
    }
    map.addImage(pattern.id, ctx.getImageData(0, 0, size, size), {
        pixelRatio: 2
    });
};

const addGeoIdLayer = (map, geoid, index, patterns) => {
    const patternId = patterns[index % patterns.length].id;
    const layerId = `hatched-area-${geoid}`;

    if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
    }

    map.addLayer({
        'id': layerId,
        'type': 'fill',
        'source': 'pmt-boundaries',
        'paint': {
            'fill-pattern': patternId,
            'fill-opacity': 0,
            'fill-opacity-transition': {
                duration: 83,
                delay: index * 8
            }
        },
        'filter': ['==', ['get', 'GEOID'], geoid]
    }, 'pmt-boundaries');

    setTimeout(() => {
        map.setPaintProperty(
            layerId,
            'fill-opacity',
            1
        );
    }, index * 8);
};

export const dragStart = (e, map) => {
  // Get coordinates of clicked point
  const coords = e.lngLat;

  // Add dragging class
  map.getCanvas().style.cursor = 'grabbing';

  // Add a point feature under the mouse
  map.addSource('point', {
    'type': 'geojson',
    'data': {
      'type': 'FeatureCollection',
      'features': [{
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [coords.lng, coords.lat]
        }
      }]
    }
  });
};

export const dragEnd = (map) => {
  // Remove dragging cursor
  map.getCanvas().style.cursor = '';

  // Remove the point
  if (map.getSource('point')) {
    map.removeSource('point');
  }
};

export const drag = (e, map) => {
  // Update point feature coordinates
  if (map.getSource('point')) {
    map.getSource('point').setData({
      'type': 'FeatureCollection',
      'features': [{
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [e.lngLat.lng, e.lngLat.lat]
        }
      }]
    });
  }
};

export const handleQuestion = async (question, map) => {
  try {
    // Clear any existing elements
    clearExistingElements(map);
    
    // Process the question and get response
    const response = await fetch('/api/question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ question })
    });
    
    const data = await response.json();
    
    // Handle the response
    handleLLMResponse(map, data);
    
    return data;
  } catch (error) {
    console.error('Error handling question:', error);
    return null;
  }
};

export const initializeMapLayers = (map) => {
  // Add ZIP Codes Flood Analysis layer
  map.addLayer({
    'id': 'zipcode-flood-analysis',
    'type': 'fill',
    'source': 'zipcodes',
    'paint': {
      'fill-color': [
        'case',
        ['has', 'flood_height'],
        [
          'interpolate',
          ['linear'],
          ['get', 'flood_height'],
          0, '#f7fbff',    // Very light blue for lowest heights
          2, '#9ecae1',    // Light blue
          4, '#4292c6',    // Medium blue
          6, '#2171b5',    // Deep blue
          8, '#084594'     // Very dark blue for highest heights
        ],
        '#404040'  // Dark gray for ZIP codes without measurements
      ],
      'fill-opacity': [
        'case',
        ['has', 'flood_height'],
        0.6,  // Changed from 0.7 to 0.5 for ZIP codes with flood data
        0.1   // Keep 0.1 for ZIP codes without measurements
      ]
    },
    'layout': {
      'visibility': 'none'
    }
  });
}; 
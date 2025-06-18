import { useRef, useCallback, useEffect } from 'react';
import { MAIN_CORRIDORS, MAP_CONFIG } from './mapConstants';
import { initializePowerGrid } from './mapAnimations';

export const useMapAnimation = (map) => {
    const animationFrame = useRef(null);
    const frameCount = useRef(0);
    const lastAnimationTime = useRef(0);
    const isAnimating = useRef(false);

    const initializeParticleLayers = useCallback(() => {
        console.log('Starting particle layer initialization...');
        if (!map.current) {
            console.log('Map not available in initializeParticleLayers');
            return;
        }

        console.log('Calling initializePowerGrid...');
        // Initialize power grid
        initializePowerGrid(map.current);

        /* Commenting out all particle-related layers
        // Add TCP flow sources
        map.current.addSource('tcp-flow', {
            type: 'vector',
            url: 'mapbox://mapbox.mapbox-streets-v8'
        });

        map.current.addSource('tcp2-flow', {
            type: 'vector',
            url: 'mapbox://mapbox.mapbox-streets-v8'
        });

        map.current.addSource('tcp3-flow', {
            type: 'vector',
            url: 'mapbox://mapbox.mapbox-streets-v8'
        });

        // Add TCP particle layers
        map.current.addLayer({
            'id': 'tcp-flow-particles',
            'type': 'circle',
            'source': 'tcp-flow',
            'source-layer': 'road',
            'filter': [
                'all',
                ['match',
                    ['get', 'class'],
                    ['secondary', 'tertiary', 'service'],
                    true,
                    false
                ],
                ['>=', ['zoom'], 13]
            ],
            'paint': {
                'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    12, 1.5,
                    16, 2.5
                ],
                'circle-color': '#FF4500',
                'circle-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    12, 0.8,
                    16, 0.95
                ],
                'circle-blur': 0.2
            }
        });

        map.current.addLayer({
            'id': 'tcp2-flow-particles',
            'type': 'circle',
            'source': 'tcp2-flow',
            'source-layer': 'road',
            'filter': [
                'all',
                ['match',
                    ['get', 'class'],
                    ['primary', 'trunk', 'motorway'],
                    true,
                    false
                ],
                ['>=', ['zoom'], 13]
            ],
            'paint': {
                'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    12, 1.8,
                    16, 3.0
                ],
                'circle-color': '#FFD700',
                'circle-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    12, 0.7,
                    16, 0.9
                ],
                'circle-blur': 0.3
            }
        });

        map.current.addLayer({
            'id': 'tcp3-flow-particles',
            'type': 'circle',
            'source': 'tcp3-flow',
            'source-layer': 'road',
            'filter': [
                'all',
                ['match',
                    ['get', 'class'],
                    ['residential', 'service', 'street', 'path'],
                    true,
                    false
                ],
                ['>=', ['zoom'], 13]
            ],
            'paint': {
                'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    12, 1.0,
                    16, 1.8
                ],
                'circle-color': '#FFFFFF',
                'circle-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    12, 0.6,
                    16, 0.8
                ],
                'circle-blur': 0.2
            }
        });

        // Add green building particles
        map.current.addSource('green-building-particles', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });

        map.current.addLayer({
            id: 'green-building-particles',
            type: 'circle',
            source: 'green-building-particles',
            minzoom: 13, // Only show particles at zoom >= 13
            maxzoom: 20,
            paint: {
                'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    13, 0.5,  // Smaller at lower zoom
                    16, 1     // Fully opaque at higher zoom
                ],
                'circle-color': '#4CAF50',
                'circle-blur': 1,
                'circle-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    13, 0.5,  // More transparent at lower zoom
                    16, 1     // Fully opaque at higher zoom
                ]
            }
        });

        // Add particle source if it doesn't exist
        if (!map.current.getSource('particles')) {
            map.current.addSource('particles', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });
        }

        // Add particle layer with zoom constraints
        if (!map.current.getLayer('particles')) {
            map.current.addLayer({
                id: 'particles',
                type: 'circle',
                source: 'particles',
                minzoom: 13, // Only show particles at zoom >= 13
                maxzoom: 20,
                paint: {
                    'circle-radius': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        13, 0.5,  // Smaller at lower zoom
                        16, 1     // Fully opaque at higher zoom
                    ],
                    'circle-color': '#4CAF50',
                    'circle-blur': 1,
                    'circle-opacity': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        13, 0.5,  // More transparent at lower zoom
                        16, 1     // Fully opaque at higher zoom
                    ]
                }
            });
        }
        */

        // Optimize particle updates based on zoom level
        const handleZoom = () => {
            const zoom = map.current.getZoom();
            if (zoom < MAP_CONFIG.MIN_ZOOM) {
                if (isAnimating.current) {
                    stopAnimation();
                }
            } else if (!isAnimating.current) {
                startAnimation();
            }
        };

        map.current.on('zoom', handleZoom);

        // Initial zoom check
        handleZoom();

        return () => {
            if (map.current) {
                map.current.off('zoom', handleZoom);
            }
        };
    }, [map, MAP_CONFIG]);

    // Comment out or remove particle generation and animation
    /* 
    const generateParticles = useCallback(() => {
        if (!map.current) return;
        
        const zoom = map.current.getZoom();
        const bounds = map.current.getBounds();
        
        // Adjust particle count based on zoom and performance
        let particlesPerRoadSegment;
        if (zoom <= 12) return; // No particles at very low zoom
        if (zoom <= 13) particlesPerRoadSegment = 1;
        else if (zoom <= 14) particlesPerRoadSegment = Math.min(2, window.devicePixelRatio);
        else if (zoom <= 15) particlesPerRoadSegment = Math.min(3, window.devicePixelRatio * 1.5);
        else particlesPerRoadSegment = Math.min(4, window.devicePixelRatio * 2);

        // Only process visible segments and limit total particles
        const visibleSegments = MAIN_CORRIDORS.filter(corridor => {
            return bounds.contains([corridor.start[0], corridor.start[1]]) ||
                   bounds.contains([corridor.end[0], corridor.end[1]]);
        }).slice(0, Math.min(20, Math.floor(zoom))); // Dynamically limit segments based on zoom

        for (const corridor of visibleSegments) {
            for (let i = 0; i < particlesPerRoadSegment; i++) {
                if (map.current && map.current.getSource('particles')) {
                    const progress = (frameCount.current * 0.001) % 1;
                    const position = [
                        corridor.start[0] + (corridor.end[0] - corridor.start[0]) * progress,
                        corridor.start[1] + (corridor.end[1] - corridor.start[1]) * progress
                    ];

                    map.current.getSource('particles').setData({
                        type: 'FeatureCollection',
                        features: [{
                            type: 'Feature',
                            geometry: {
                                type: 'Point',
                                coordinates: position
                            }
                        }]
                    });
                }
            }
        }
    }, [map]);

    const animate = useCallback(() => {
        if (!map.current || !map.current.loaded()) {
            animationFrame.current = requestAnimationFrame(animate);
            return;
        }

        frameCount.current += 1;
        
        // Only process every Nth frame
        if (frameCount.current % MAP_CONFIG.FRAME_SKIP !== 0) {
            animationFrame.current = requestAnimationFrame(animate);
            return;
        }

        const zoom = map.current.getZoom();
        
        // Skip animation completely at low zoom levels
        if (zoom < MAP_CONFIG.MIN_ZOOM) {
            animationFrame.current = requestAnimationFrame(animate);
            return;
        }

        const currentTime = Date.now();
        
        // Throttle animation updates
        if (currentTime - lastAnimationTime.current < MAP_CONFIG.THROTTLE_TIME) {
            animationFrame.current = requestAnimationFrame(animate);
            return;
        }
        
        lastAnimationTime.current = currentTime;

        try {
            generateParticles();
        } catch (error) {
            console.warn('Animation error:', error);
        }

        animationFrame.current = requestAnimationFrame(animate);
    }, [map, generateParticles]);
    */

    const startAnimation = useCallback(() => {
        if (!isAnimating.current) {
            isAnimating.current = true;
        }
    }, []);

    const stopAnimation = useCallback(() => {
        isAnimating.current = false;
        if (animationFrame.current) {
            cancelAnimationFrame(animationFrame.current);
            animationFrame.current = null;
        }
    }, []);

    return {
        startAnimation,
        stopAnimation,
        initializeParticleLayers
    };
}; 
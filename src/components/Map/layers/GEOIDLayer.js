import { brickellGEOIDs } from '../constants/geoIds';

const defaultPatterns = [
    { id: 'diagonal-hatch-orange', color: '#FF4500' },
    { id: 'diagonal-hatch-orange-light', color: '#FF6347' },
    { id: 'diagonal-hatch-orange-dark', color: '#FF8C00' }
];

export const initializeGEOIDLayer = (map, customPatterns = defaultPatterns) => {
    const patterns = customPatterns || defaultPatterns;

    // First ensure patterns are loaded
    patterns.forEach(pattern => {
        if (!map.hasImage(pattern.id)) {
            createHatchPattern(map, pattern.id, pattern.color);
        }
    });

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

// Helper function to create hatch pattern
const createHatchPattern = (map, id, color) => {
    const size = 4; // Reduced size for tighter pattern
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Set transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, size, size);

    // Draw diagonal lines
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    // Main diagonal line
    ctx.moveTo(0, size);
    ctx.lineTo(size, 0);
    
    // Additional diagonal lines for density
    ctx.moveTo(-size/2, size/2);
    ctx.lineTo(size/2, -size/2);
    ctx.moveTo(size/2, 3*size/2);
    ctx.lineTo(3*size/2, size/2);
    
    ctx.stroke();

    map.addImage(id, { 
        width: size, 
        height: size, 
        data: new Uint8Array(ctx.getImageData(0, 0, size, size).data.buffer) 
    });
};

export const getGEOIDLayerId = (geoid) => `hatched-area-${geoid}`;

export const getAllGEOIDLayerIds = () => brickellGEOIDs.map(geoid => getGEOIDLayerId(geoid)); 
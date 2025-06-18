export const osmToGeoJSON = (osmData) => {
    if (!osmData || !osmData.elements || !Array.isArray(osmData.elements)) {
        console.error('Invalid OSM data structure:', osmData);
        return {
            type: 'FeatureCollection',
            features: []
        };
    }

    const features = [];
    const nodes = new Map();
    
    // First, index all nodes
    osmData.elements.forEach(element => {
        if (element.type === 'node') {
            nodes.set(element.id, [element.lon, element.lat]);
        }
    });
    
    // Transform buildings
    osmData.elements.forEach(element => {
        if (element.type === 'way' && element.tags?.building) {
            try {
                const coordinates = element.nodes
                    .map(nodeId => nodes.get(nodeId))
                    .filter(coord => coord); // Filter out any undefined nodes

                if (coordinates.length >= 3) { // Valid polygon needs at least 3 points
                    // Close the polygon if it's not closed
                    if (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
                        coordinates[0][1] !== coordinates[coordinates.length - 1][1]) {
                        coordinates.push(coordinates[0]);
                    }

                    features.push({
                        type: 'Feature',
                        geometry: {
                            type: 'Polygon',
                            coordinates: [coordinates]
                        },
                        properties: {
                            type: 'building',
                            ...element.tags,
                            osmId: element.id
                        }
                    });
                }
            } catch (error) {
                console.warn('Error processing building:', error, element);
            }
        }
    });

    // Transform POIs
    osmData.elements.forEach(element => {
        if (element.type === 'node' && (element.tags?.amenity || element.tags?.shop)) {
            try {
                features.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [element.lon, element.lat]
                    },
                    properties: {
                        type: 'poi',
                        ...element.tags,
                        osmId: element.id
                    }
                });
            } catch (error) {
                console.warn('Error processing POI:', error, element);
            }
        }
    });

    return {
        type: 'FeatureCollection',
        features
    };
}; 
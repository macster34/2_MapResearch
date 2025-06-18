const TIMEOUT = 30000;
const PROXY_URL = 'http://localhost:8080/proxy';

export const fetchOSMData = async (bounds) => {
    // Reduce the query size by limiting to just essential data
    const query = `
        [out:json][timeout:25];
        (
            way["building"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        );
        out geom qt;
    `;

    console.log('Fetching OSM data with bounds:', bounds);
    
    try {
        const overpassUrl = 'https://overpass-api.de/api/interpreter';
        const targetUrl = `${overpassUrl}?data=${encodeURIComponent(query)}`;
        
        // Try direct request first to avoid proxy size limits
        try {
            const response = await fetch(targetUrl, {
                signal: AbortSignal.timeout(TIMEOUT)
            });
            
            if (!response.ok) {
                throw new Error(`OSM API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            return data;
        } catch (directError) {
            console.warn('Direct request failed, trying proxy:', directError);
            
            // Fall back to proxy if direct request fails
            const proxyUrl = `${PROXY_URL}?url=${encodeURIComponent(targetUrl)}`;
            const response = await fetch(proxyUrl, {
                signal: AbortSignal.timeout(TIMEOUT)
            });
            
            if (!response.ok) {
                throw new Error(`Proxy error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            return data;
        }
    } catch (error) {
        console.error('Failed to fetch OSM data:', error);
        // Return minimal test data
        return {
            elements: [
                {
                    type: "way",
                    id: 123456789,
                    nodes: [1, 2, 3, 4, 1],
                    tags: { building: "yes" },
                    geometry: [
                        { lat: bounds.south + 0.001, lon: bounds.west + 0.001 },
                        { lat: bounds.south + 0.002, lon: bounds.west + 0.001 },
                        { lat: bounds.south + 0.002, lon: bounds.west + 0.002 },
                        { lat: bounds.south + 0.001, lon: bounds.west + 0.002 },
                        { lat: bounds.south + 0.001, lon: bounds.west + 0.001 }
                    ]
                }
            ]
        };
    }
};
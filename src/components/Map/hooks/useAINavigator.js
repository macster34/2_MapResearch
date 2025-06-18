import { askClaude } from '../../../services/claude';

export class AINavigator {
  // Example queries that show the system's capabilities
  static EXAMPLE_QUERIES = [
    "What's the tallest building that's also in a high-activity area?",
    "Which areas show the highest population growth?",
    "Which areas have the best mix of residential and commercial?"
  ];

  constructor({ map, censusData, onUpdate }) {
    if (!map) {
      console.error('Map is required for AINavigator');
      throw new Error('Map is required for AINavigator');
    }
    
    this.map = map;
    this.censusData = censusData;
    this.onUpdate = onUpdate;
    this.currentLocation = null;
    console.log('AINavigator initialized with map:', !!map); // Debug log
    this.joinedData = this.joinDataSources();
    this.previousHighlight = null;
    this.analysisHistory = [];
    
    // Wait for both map and style to be loaded
    this.mapReady = new Promise((resolve) => {
      const checkLoaded = () => {
        if (this.map.loaded() && this.map.isStyleLoaded()) {
          console.log('Map and style fully loaded');
          resolve(true);
          return true;
        }
        return false;
      };

      // Check if already loaded
      if (checkLoaded()) return;

      // Listen for both events
      this.map.on('load', () => {
        console.log('Map load event fired');
        checkLoaded();
      });

      this.map.on('style.load', () => {
        console.log('Style load event fired');
        checkLoaded();
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        console.log('Timeout reached, proceeding anyway');
        resolve(true);
      }, 10000);
    });
    
    // Initialize analysis capabilities
    this.capabilities = {
      buildings: {
        canAnalyzeHeight: true,
        canAnalyzeDensity: true,
        canAnalyzeType: true
      },
      demographics: {
        hasPopulationData: !!this.censusData,
        hasIncomeData: !!this.censusData,
        hasAgeData: !!this.censusData
      },
      pois: {
        categories: ['restaurants', 'retail', 'transit', 'parks', 'cultural'],
        canAnalyzeDensity: true,
        canAnalyzeProximity: true
      }
    };
  }

  joinDataSources() {
    // Get features from the map's current building source
    const features = this.map.querySourceFeatures('buildings');
    
    // Join Census data with map features based on location
    const joined = features.map(feature => {
      const censusMatch = this.censusData.find(cd => {
        const [lng, lat] = feature.geometry.coordinates;
        return cd.properties && 
               cd.properties.latitude === lat && 
               cd.properties.longitude === lng;
      });
      
      return {
        ...feature,
        properties: {
          ...feature.properties,
          ...censusMatch,
          analyzed: false
        }
      };
    });

    return {
      type: 'FeatureCollection',
      features: joined
    };
  }

  async navigateTo(coordinates) {
    this.map.flyTo({
      center: coordinates,
      zoom: 15,
      duration: 2000
    });
    
    // Wait for the navigation to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return any features at the new location
    return this.map.queryRenderedFeatures(
      this.map.project(coordinates),
      { layers: ['3d-buildings'] }
    );
  }

  async analyzeArea(prompt) {
    if (!this.currentLocation) return null;

    // Get features in current view
    const bounds = this.map.getBounds();
    const features = this.joinedData.features.filter(feature => {
      const [lng, lat] = feature.geometry.coordinates;
      return lng >= bounds.getWest() &&
             lng <= bounds.getEast() &&
             lat >= bounds.getSouth() &&
             lat <= bounds.getNorth();
    });

    // Mark features as analyzed
    features.forEach(feature => {
      feature.properties.analyzed = true;
    });

    // Update the source
    this.onUpdate(this.joinedData);

    return {
      features,
      analysis: `Analyzed ${features.length} features in current view`
    };
  }

  async handlePrompt(prompt) {
    try {
      console.log('Waiting for map to be ready...');
      await this.mapReady;
      console.log('Map is ready, proceeding with prompt:', prompt);

      // Verify map is still valid
      if (!this.map) {
        console.error('Map became invalid');
        return '[Error] Map is not properly initialized. Please try again.';
      }

      // Query buildings directly
      let features = this.map.queryRenderedFeatures(
        undefined,
        { layers: ['3d-buildings'] }
      );

      console.log(`Initial query found ${features?.length || 0} buildings`);

      // If no buildings found, try waiting a bit
      if (!features || features.length === 0) {
        console.log('No buildings found, waiting briefly...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        features = this.map.queryRenderedFeatures(
          undefined,
          { layers: ['3d-buildings'] }
        );
        console.log(`After waiting, found ${features?.length || 0} buildings`);
      }

      // Sort buildings by total height
      const sortedFeatures = features.sort((a, b) => {
        const heightA = (a.properties?.height || 0) + (a.properties?.min_height || 0);
        const heightB = (b.properties?.height || 0) + (b.properties?.min_height || 0);
        return heightB - heightA;
      });

      // Log the top 5 tallest buildings for debugging
      console.log('Top 5 tallest buildings:', sortedFeatures.slice(0, 5).map(f => ({
        id: f.id,
        height: (f.properties?.height || 0) + (f.properties?.min_height || 0),
        coordinates: f.geometry.coordinates[0][0]
      })));

      // Create context with building information
      const mapContext = {
        center: {
          lng: this.map.getCenter().lng.toFixed(6),
          lat: this.map.getCenter().lat.toFixed(6)
        },
        zoom: this.map.getZoom(),
        bounds: this.map.getBounds().toArray(),
        buildings: sortedFeatures.map(f => ({
          id: f.id,
          height: f.properties?.height || 0,
          baseHeight: f.properties?.min_height || 0,
          totalHeight: (f.properties?.height || 0) + (f.properties?.min_height || 0),
          coordinates: [
            f.geometry.coordinates[0][0][0],
            f.geometry.coordinates[0][0][1]
          ],
          type: f.properties?.type || 'building'
        }))
      };

      // Try Claude API
      try {
        const enhancedPrompt = `${prompt}. Analyze the buildings in the current view and find the ${
          prompt.toLowerCase().includes('small') ? 'smallest' : 'largest'
        } building. There are ${mapContext.buildings.length} buildings visible with heights ranging from ${
          Math.min(...mapContext.buildings.map(b => b.totalHeight))
        }m to ${
          Math.max(...mapContext.buildings.map(b => b.totalHeight))
        }m. Return the exact coordinates and height of the selected building.`;

        console.log('Sending prompt to Claude:', enhancedPrompt);
        const claudeResponse = await askClaude(enhancedPrompt, mapContext);
        
        if (claudeResponse?.content?.[0]?.text) {
          const action = JSON.parse(claudeResponse.content[0].text.match(/\{[\s\S]*\}/)[0]);
          
          if (action.coordinates) {
            // Find and highlight the building
            const point = this.map.project(action.coordinates);
            const buildingFeatures = this.map.queryRenderedFeatures(
              [[point.x - 20, point.y - 20], [point.x + 20, point.y + 20]],
              { layers: ['3d-buildings'] }
            );

            console.log('Found building features:', buildingFeatures);

            if (buildingFeatures.length > 0) {
              const building = buildingFeatures[0];
              
              // Clear previous highlight if exists
              if (this.previousHighlight) {
                try {
                  await this.map.setFeatureState(
                    { 
                      source: 'composite', 
                      sourceLayer: 'building', 
                      id: this.previousHighlight 
                    },
                    { isHighlighted: false }
                  );
                } catch (error) {
                  console.log('Error clearing previous highlight:', error);
                }
              }

              // Get the correct building ID
              const buildingId = building.id;
              console.log('Highlighting building:', buildingId);

              if (buildingId) {
                this.previousHighlight = buildingId;
                
                try {
                  // Highlight the building
                  await this.map.setFeatureState(
                    { 
                      source: 'composite', 
                      sourceLayer: 'building', 
                      id: buildingId 
                    },
                    { isHighlighted: true }
                  );
                  console.log('Successfully highlighted building');
                } catch (error) {
                  console.error('Error highlighting building:', error);
                }
              }

              // Zoom to building with dramatic camera
              this.map.flyTo({
                center: action.coordinates,
                zoom: 17.5,
                pitch: 60,
                bearing: 45,
                duration: 2000,
                essential: true
              });
            } else {
              console.log('No building features found at coordinates');
            }
            
            return `[Claude AI] ${action.explanation}`;
          }
        }
        
        throw new Error('Invalid response format from Claude');
      } catch (error) {
        console.error('Claude API error:', error);
        return `[Error] Failed to process request: ${error.message}`;
      }
    } catch (error) {
      console.error('Navigation error:', error);
      return `[Error] Navigation error: ${error.message}`;
    }
  }

  async analyzeQuery(prompt) {
    const queryType = this.categorizeQuery(prompt);
    const context = await this.gatherContextData(queryType);
    return this.processQuery(prompt, queryType, context);
  }

  categorizeQuery(prompt) {
    const keywords = {
      buildings: ['building', 'tall', 'height', 'structure', 'construction'],
      demographics: ['population', 'income', 'growth', 'value', 'development'],
      pois: ['restaurant', 'shop', 'park', 'transit', 'activity'],
      urban: ['neighborhood', 'district', 'area', 'walkability', 'density']
    };

    // Return the most relevant category based on keyword matches
    return Object.entries(keywords).reduce((best, [category, words]) => {
      const matches = words.filter(word => prompt.toLowerCase().includes(word)).length;
      return matches > best.matches ? { category, matches } : best;
    }, { category: 'general', matches: 0 }).category;
  }

  async gatherContextData(queryType) {
    const baseContext = {
      center: this.map.getCenter(),
      zoom: this.map.getZoom(),
      bounds: this.map.getBounds(),
      buildings: await this.getVisibleBuildings(),
      pois: await this.getVisiblePOIs()
    };

    // Add specific data based on query type
    switch (queryType) {
      case 'buildings':
        return {
          ...baseContext,
          buildingStats: this.calculateBuildingStats(baseContext.buildings),
          poiClusters: this.analyzePOIClusters(baseContext.pois)
        };
      case 'demographics':
        return {
          ...baseContext,
          censusData: await this.getCensusDataForArea(),
          developmentTrends: await this.analyzeDevelopmentTrends()
        };
      case 'pois':
        return {
          ...baseContext,
          poiDensity: this.calculatePOIDensity(baseContext.pois),
          activityHeatmap: this.generateActivityHeatmap()
        };
      default:
        return baseContext;
    }
  }

  async processQuery(prompt, queryType, context) {
    const enhancedPrompt = this.buildEnhancedPrompt(prompt, queryType, context);
    
    try {
      const response = await askClaude(enhancedPrompt, context);
      const result = this.parseAndVisualizeResponse(response, queryType);
      
      // Store analysis in history
      this.analysisHistory.push({
        timestamp: new Date(),
        query: prompt,
        result: result
      });

      return result;
    } catch (error) {
      console.error('Analysis error:', error);
      return `[Error] Could not complete analysis: ${error.message}`;
    }
  }

  buildEnhancedPrompt(prompt, queryType, context) {
    const basePrompt = `Analyze the following geographic data for Miami and ${prompt}.`;
    
    const contextPrompt = {
      buildings: `There are ${context.buildings.length} buildings in view, with heights from ${
        Math.min(...context.buildings.map(b => b.height))
      }m to ${
        Math.max(...context.buildings.map(b => b.height))
      }m. The area has ${context.pois.length} points of interest.`,
      demographics: `The area shows ${
        context.censusData ? 'population and development trends' : 'urban development patterns'
      } with multiple distinct neighborhoods.`,
      pois: `The area contains various activity clusters with ${
        context.poiDensity.hotspots.length
      } major hotspots of activity.`
    }[queryType] || '';

    return `${basePrompt} ${contextPrompt} Please analyze this data and provide specific geographic insights with exact coordinates and metrics.`;
  }

  // ... rest of the implementation methods ...
} 
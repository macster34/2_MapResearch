const CENSUS_API_KEY = '852bd45712daff2cd3fd945ce178335ee838af28';
const BASE_URL = 'https://api.census.gov/data/2020';

export const analyzeCensusData = async () => {
  try {
    // Fetch demographic data for Miami-Dade County
    const response = await fetch(
      `${BASE_URL}/acs/acs5?get=NAME,B01001_001E,B19013_001E,B25077_001E&for=tract:*&in=state:12&in=county:086&key=${CENSUS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Census API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform the census data for easier joining
    // First row contains column headers
    const [headers, ...rows] = data;
    
    return rows.map(row => {
      const tract = row[headers.indexOf('tract')];
      const state = row[headers.indexOf('state')];
      const county = row[headers.indexOf('county')];
      
      return {
        GEOID: `${state}${county}${tract}`, // Create GEOID for joining
        population: parseInt(row[headers.indexOf('B01001_001E')]) || 0,
        medianIncome: parseInt(row[headers.indexOf('B19013_001E')]) || 0,
        medianHomeValue: parseInt(row[headers.indexOf('B25077_001E')]) || 0,
        name: row[headers.indexOf('NAME')]
      };
    });

  } catch (error) {
    console.error('Error fetching census data:', error);
    return [];
  }
}; 
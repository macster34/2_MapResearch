const testCensusAPI = async () => {
  const CENSUS_API_KEY = '852bd45712daff2cd3fd945ce178335ee838af28';
  
  try {
    // Test with a simpler endpoint first
    const url = `https://api.census.gov/data/2020/acs/acs5?get=NAME,B01001_001E&for=county:086&in=state:12&key=${CENSUS_API_KEY}`;
    console.log('Requesting URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    // Log everything for debugging
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    const text = await response.text();
    console.log('Raw response:', text);
    
    // Try to parse as JSON if it looks like JSON
    if (text.startsWith('[') || text.startsWith('{')) {
      const data = JSON.parse(text);
      console.log('Parsed JSON:', data);
    }

  } catch (error) {
    console.error('Error fetching Census data:', error);
  }
};

// Run the test
testCensusAPI(); 
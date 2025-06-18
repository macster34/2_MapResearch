const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

let buildingsData = [];
let currentIndex = 0;

// Load buildings data
async function loadBuildingsData() {
  try {
    const data = await fs.readFile(path.join(__dirname, 'public', 'DC.json'), 'utf8');
    buildingsData = JSON.parse(data);
  } catch (error) {
    console.error('Error loading buildings data:', error);
  }
}

// Query Perplexity API
async function queryPerplexity(prompt) {
  try {
    const response = await axios.post('https://api.perplexity.ai/chat/completions', {
      model: 'mistral-7b-instruct',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.PR_API}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error querying Perplexity API:', error);
    return null;
  }
}

// Update building info
async function updateBuildingInfo(building) {
  const address = building.location.address;
  const prompt = `Provide updated information for the building at ${address} in Washington DC. Include details about its conversion from office to residential if applicable. Format the response as a JSON object with the following fields: title, url, published_date, summary, location (city, state, neighborhood, address, latitude, longitude), property_type, new_use, size, cost, developer, current_owner, completion_date, proposed_units, stories, expected_sale_completion, market_trend, related_initiative, market_context, broker, primary_source, last_updated, image_url, zoning_district, far, off_street_parking, density_bonus, tdrs, minimum_unit_size, maximum_height, parking_spaces_per_unit, affordable_housing, and regulatory_info (including zoning_details, recent_changes, required_permits, fast_track_process, and incentives).`;

  const response = await queryPerplexity(prompt);
  
  if (!response) {
    return { original: building, updated: null };
  }

  try {
    const updatedInfo = JSON.parse(response);
    return { original: building, updated: updatedInfo };
  } catch (error) {
    console.error('Error parsing JSON response:', error);
    console.log('Raw response:', response);
    return { original: building, updated: null };
  }
}

app.get('/data', async (req, res) => {
  if (currentIndex >= buildingsData.length) {
    return res.json({ status: 'complete' });
  }

  const result = await updateBuildingInfo(buildingsData[currentIndex]);
  res.json({
    ...result,
    index: currentIndex,
    total: buildingsData.length
  });
});

app.post('/apply', async (req, res) => {
  try {
    const updatedBuilding = req.body;
    const buildingIndex = buildingsData.findIndex(building => 
      building.location.address === updatedBuilding.location.address
    );

    if (buildingIndex === -1) {
      return res.status(404).json({ status: 'error', message: 'Building not found' });
    }

    buildingsData[buildingIndex] = {
      ...buildingsData[buildingIndex],
      ...updatedBuilding,
      last_updated: new Date().toISOString().split('T')[0]
    };

    await fs.writeFile(path.join(__dirname, 'public', 'DC.json'), JSON.stringify(buildingsData, null, 2));
    
    res.json({ status: 'success', updatedBuilding: buildingsData[buildingIndex] });
  } catch (error) {
    console.error('Error applying changes:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.post('/next', (req, res) => {
  currentIndex++;
  res.json({ status: 'success' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

loadBuildingsData().then(() => {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
});

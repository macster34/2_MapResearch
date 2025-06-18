const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');

const app = express();

// Configure CORS for localhost:3000
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/claude', async (req, res) => {
  // Mock response for development without AI key
  res.json({
    id: 'mock-response',
    object: 'chat.completion',
    created: Date.now(),
    model: 'mock',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: 'This is a mock AI response. AI features are currently disabled.'
        },
        finish_reason: 'stop'
      }
    ]
  });
});

// Update ERCOT endpoint
app.get('/api/ercot-data', async (req, res) => {
  console.log('Server: Starting ERCOT data fetch...');
  
  const scriptPath = path.join(__dirname, 'public', 'Ercot.py');
  console.log('Server: Python script path:', scriptPath);
  
  const python = spawn('python', [scriptPath]);
  let dataString = '';

  python.stdout.on('data', (data) => {
    dataString += data.toString();
    console.log('Server: Python stdout:', data.toString());
  });

  python.stderr.on('data', (data) => {
    console.error('Server: Python stderr:', data.toString());
  });

  python.on('error', (error) => {
    console.error('Server: Python process error:', error);
    res.status(500).json({
      error: 'Failed to start Python process',
      details: error.message
    });
  });

  python.on('close', (code) => {
    console.log('Server: Python process completed with code:', code);
    
    if (code !== 0) {
      console.error('Server: Python process exited with code:', code);
      return res.status(500).json({
        error: 'Python process failed',
        code: code
      });
    }
    
    try {
      // Find and parse just the JSON data
      const jsonStart = dataString.indexOf('{');
      const jsonEnd = dataString.lastIndexOf('}') + 1;
      const jsonStr = dataString.slice(jsonStart, jsonEnd);
      
      console.log('Server: Raw JSON string:', jsonStr);
      
      const data = JSON.parse(jsonStr);
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid data structure');
      }

      // Ensure all prices are positive and in a realistic range
      data.data = data.data.map(point => ({
        ...point,
        price: Math.max(20, Math.min(1000, point.price)),
        mw: Math.max(0, point.mw),
        // Add color values based on the new orange-red scheme
        color: getErcotColor(Math.max(20, Math.min(1000, point.price)))
      }));

      console.log('Server: Processed ERCOT data:', {
        points: data.data.length,
        priceRange: {
          min: Math.min(...data.data.map(d => d.price)),
          max: Math.max(...data.data.map(d => d.price))
        },
        mwRange: {
          min: Math.min(...data.data.map(d => d.mw)),
          max: Math.max(...data.data.map(d => d.mw))
        }
      });

      res.json(data);
    } catch (error) {
      console.error('Server: Data processing error:', error);
      console.error('Server: Raw data string:', dataString);
      res.status(500).json({ 
        error: 'Failed to process ERCOT data',
        details: error.message,
        rawData: dataString
      });
    }
  });
});

// Helper function to generate colors based on price
function getErcotColor(price) {
  // Orange to red color scheme
  if (price <= 25) return '#FF8C00'; // Dark Orange
  if (price <= 35) return '#FF7800'; 
  if (price <= 45) return '#FF6400';
  if (price <= 55) return '#FF5000';
  if (price <= 65) return '#FF3C00';
  if (price <= 75) return '#FF2800';
  if (price <= 85) return '#FF1400';
  return '#FF0000'; // Bright Red for highest values
}

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log('Claude API Key exists:', !!process.env.CLAUDE_API_KEY);
}); 
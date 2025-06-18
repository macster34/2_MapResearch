const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();  // Add this to load environment variables

const app = express();

// Configure CORS with more permissive options
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'anthropic-beta', 'anthropic-version'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Proxy server is running',
    endpoints: {
      health: '/health',
      proxy: '/proxy'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Main proxy endpoint
app.post('/proxy', async (req, res) => {
  try {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    console.log('Incoming request:', {
      url: targetUrl,
      headers: req.headers,
      body: req.body
    });

    const response = await axios({
      method: 'POST',
      url: decodeURIComponent(targetUrl),
      headers: {
        'Content-Type': 'application/json',
        'anthropic-beta': 'messages-2023-12-15',
        'x-api-key': process.env.REACT_APP_CLAUDE_API_KEY || req.headers['x-api-key'],
        'anthropic-version': '2023-06-01'
      },
      data: req.body,
      validateStatus: (status) => status < 500
    });

    console.log('Proxy response:', {
      status: response.status,
      headers: response.headers,
      data: response.data
    });

    return res.status(response.status).json(response.data);

  } catch (error) {
    console.error('Proxy error:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });

    return res.status(error.response?.status || 500).json({
      error: 'Proxy request failed',
      message: error.message,
      details: error.response?.data
    });
  }
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log('CORS enabled for:', 'http://localhost:3000');
  console.log('API Key exists:', !!process.env.REACT_APP_CLAUDE_API_KEY);
  console.log('Available endpoints:');
  console.log('  GET  /         - Server info');
  console.log('  GET  /health   - Health check');
  console.log('  POST /proxy    - Main proxy endpoint');
}); 
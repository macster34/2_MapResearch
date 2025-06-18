import React, { useState, useEffect, useCallback, useRef } from 'react';
import Map from './components/Map';
import axios from 'axios';
import 'mapbox-gl/dist/mapbox-gl.css';

axios.defaults.withCredentials = true;

const debug = process.env.NODE_ENV === 'development' 
  ? (message, ...args) => {
      // Only log critical messages
      if (message.includes('Error') || message.includes('Setting articles')) {
        console.log(message, ...args);
      }
    }
  : () => {};

function App() {
  debug('App: Component function called');
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const isUpdatingRef = useRef(false);
  const articlesRef = useRef([]);

  const fetchArticles = useCallback(async () => {
    debug('App: fetchArticles called, isUpdatingRef:', isUpdatingRef.current);
    if (isUpdatingRef.current) {
      debug('App: Skipping fetch due to article update');
      return;
    }
    debug('App: Proceeding with fetchArticles');
    setIsLoading(true);
    setError(null);
    try {
      debug('App: Sending GET request to /DC.json');
      const response = await axios.get('/DC.json');
      debug('App: Received response from /DC.json');
      if (Array.isArray(response.data)) {
        debug('App: Setting articles, length:', response.data.length);
        setArticles(response.data);
        articlesRef.current = response.data;
      } else {
        throw new Error('Received data is not an array');
      }
    } catch (error) {
      debug('App: Error fetching articles:', error);
      setError(error.message || 'An error occurred while fetching articles');
    } finally {
      debug('App: Setting isLoading to false');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    debug('App: useEffect triggered');
    fetchArticles();
  }, [fetchArticles]);

  const handleArticleUpdate = useCallback((updatedArticle) => {
    if (updatedArticle === null) {
      debug('App: Closing popup, no article selected');
      return;
    }
    if (!updatedArticle || !updatedArticle.location) {
      debug('App: Invalid updatedArticle received:', updatedArticle);
      return;
    }
    debug('App: handleArticleUpdate called with:', updatedArticle.location.address);
    isUpdatingRef.current = true;
    debug('App: Set isUpdatingRef to true');
    setArticles(prevArticles => {
      const newArticles = prevArticles.map(article => 
        article.location.address === updatedArticle.location.address ? updatedArticle : article
      );
      articlesRef.current = newArticles;
      debug('App: Articles updated');
      return newArticles;
    });
    setTimeout(() => {
      debug('App: Resetting isUpdatingRef to false');
      isUpdatingRef.current = false;
    }, 0);
  }, []);

  debug('App: Rendering App component, isLoading:', isLoading, 'error:', error);

  return (
    <div>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <Map articles={articlesRef.current} onArticleUpdate={handleArticleUpdate} />
      )}
      {error && <p>Error: {error}</p>}
    </div>
  );
}

export default App;

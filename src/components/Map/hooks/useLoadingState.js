import { useState, useEffect } from 'react';

const LOADING_MESSAGES = [
  "Analyzing spatial data...",
  "Processing urban patterns...",
  "Calculating density metrics...",
  "Mapping neighborhood features...",
  "Evaluating development zones..."
];

export const useLoadingState = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing...');

  useEffect(() => {
    let messageInterval;
    if (isLoading) {
      let index = 0;
      setLoadingMessage(LOADING_MESSAGES[0]);
      messageInterval = setInterval(() => {
        index = (index + 1) % LOADING_MESSAGES.length;
        setLoadingMessage(LOADING_MESSAGES[index]);
      }, 2000);
    }
    return () => clearInterval(messageInterval);
  }, [isLoading]);

  return { isLoading, setIsLoading, loadingMessage };
}; 
import { useState } from 'react';
import { askClaude, parseClaudeResponse } from '../../../services/claude';

export const useAIChat = (map) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  
  const handleQuestion = async (question) => {
    // Move AI chat handling logic here
  };

  return {
    messages,
    inputValue,
    setInputValue,
    handleQuestion
  };
}; 
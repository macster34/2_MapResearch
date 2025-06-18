import React, { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { handlePanelQuestion, handleQuickAction, MOCK_RESPONSES } from '../../services/claude';
import { initializePanelAnimations, handlePanelCollapse } from './hooks/mapAnimations';
import { 
  AlertTriangle, 
  Building, 
  BarChart2, 
  Clock, 
  Map as MapIcon,
  ArrowRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

// Mock data for a commercial intersection cluster
const clusterData = {
  name: "Westheimer & Post Oak",
  type: "Retail & Office Hub",
  price: "$8.4M",
  priceUnit: "daily economic impact",
  address: "Post Oak Blvd & Westheimer Rd",
  city: "Houston, TX 77056",
  properties: 42,
  sqft: "1.2M",
  avgFloodDepth: 2.8,
  lastFlood: "Hurricane Harvey (2017)",
  keyTenants: "Galleria Mall, Financial Services, Luxury Retail",
  imageUrl: "https://images.unsplash.com/photo-1582225373839-3f67b3057106?q=80&w=2787&auto=format&fit=crop"
};

// LLM models for benchmarking
const llmModels = [
  { id: 'gpt4', name: 'GPT-4', color: '#3b82f6', confidence: 89 },
  { id: 'claude3', name: 'Claude 3', color: '#8b5cf6', confidence: 92 },
  { id: 'llama3', name: 'Llama 3', color: '#10b981', confidence: 85 },
  { id: 'deepseek', name: 'DeepSeek-R1', color: '#f97316', confidence: 87 }
];

// Add milestone categories to organize risk factors
const milestoneCategories = {
  'Infrastructure': {
    color: '#4B5563',
    factors: ['Power Infrastructure', 'Building Age']
  },
  'Environmental': {
    color: '#047857',
    factors: ['Elevation', 'Bayou Proximity']
  },
  'Operational': {
    color: '#1D4ED8',
    factors: ['Business Continuity', 'Historical Flooding']
  }
};

// Update risk factor data with categories
const riskFactorData = [
  { 
    factor: 'Elevation',
    category: 'Environmental',
    'GPT-4': 25, 
    'Claude 3': 20, 
    'Llama 3': 38,
    'DeepSeek-R1': 42,
    description: 'Property sits 3.5ft below surrounding area',
    impact: 'Critical factor for flood vulnerability'
  },
  { 
    factor: 'Building Age',
    category: 'Infrastructure', 
    'GPT-4': 15, 
    'Claude 3': 23, 
    'Llama 3': 10,
    'DeepSeek-R1': 12,
    description: 'Most structures built between 1990-2005',
    impact: 'Affects structural resilience during floods'
  },
  { 
    factor: 'Power Infrastructure',
    category: 'Infrastructure', 
    'GPT-4': 25, 
    'Claude 3': 30, 
    'Llama 3': 12,
    'DeepSeek-R1': 18,
    description: 'Multiple substations with partial redundancy',
    impact: 'Critical for maintaining operations'
  },
  { 
    factor: 'Bayou Proximity',
    category: 'Environmental', 
    'GPT-4': 20, 
    'Claude 3': 12, 
    'Llama 3': 32,
    'DeepSeek-R1': 25,
    description: '0.6 miles to Buffalo Bayou',
    impact: 'Direct exposure to flooding risk'
  },
  { 
    factor: 'Business Continuity',
    category: 'Operational', 
    'GPT-4': 10, 
    'Claude 3': 15, 
    'Llama 3': 5,
    'DeepSeek-R1': 3,
    description: '64% of businesses have continuity plans',
    impact: 'Affects recovery speed and resilience'
  },
  { 
    factor: 'Historical Flooding',
    category: 'Operational', 
    'GPT-4': 5, 
    'Claude 3': 5, 
    'Llama 3': 3,
    'DeepSeek-R1': 5,
    description: '2 major flood events in past 10 years',
    impact: 'Indicates recurring vulnerability'
  }
];

// Recovery timeline data
const recoveryTimelineData = [
  { day: 0, 'GPT-4': 0, 'Claude 3': 0, 'Llama 3': 0, 'DeepSeek-R1': 0 },
  { day: 2, 'GPT-4': 8, 'Claude 3': 15, 'Llama 3': 5, 'DeepSeek-R1': 3 },
  { day: 4, 'GPT-4': 21, 'Claude 3': 32, 'Llama 3': 11, 'DeepSeek-R1': 9 },
  { day: 6, 'GPT-4': 36, 'Claude 3': 48, 'Llama 3': 18, 'DeepSeek-R1': 16 },
  { day: 8, 'GPT-4': 47, 'Claude 3': 62, 'Llama 3': 26, 'DeepSeek-R1': 35 },
  { day: 10, 'GPT-4': 58, 'Claude 3': 73, 'Llama 3': 35, 'DeepSeek-R1': 52 },
  { day: 12, 'GPT-4': 67, 'Claude 3': 81, 'Llama 3': 43, 'DeepSeek-R1': 63 },
  { day: 14, 'GPT-4': 74, 'Claude 3': 89, 'Llama 3': 51, 'DeepSeek-R1': 70 },
  { day: 16, 'GPT-4': 81, 'Claude 3': 94, 'Llama 3': 58, 'DeepSeek-R1': 76 },
  { day: 18, 'GPT-4': 86, 'Claude 3': 98, 'Llama 3': 65, 'DeepSeek-R1': 82 },
  { day: 20, 'GPT-4': 91, 'Claude 3': 100, 'Llama 3': 71, 'DeepSeek-R1': 87 },
  { day: 24, 'GPT-4': 97, 'Claude 3': 100, 'Llama 3': 83, 'DeepSeek-R1': 95 },
  { day: 28, 'GPT-4': 100, 'Claude 3': 100, 'Llama 3': 91, 'DeepSeek-R1': 98 },
  { day: 32, 'GPT-4': 100, 'Claude 3': 100, 'Llama 3': 96, 'DeepSeek-R1': 100 },
  { day: 36, 'GPT-4': 100, 'Claude 3': 100, 'Llama 3': 100, 'DeepSeek-R1': 100 }
];

// Model conclusions
const modelConclusions = [
  {
    id: 'llama3',
    name: 'Llama 3',
    color: '#10b981',
    recoveryTime: '36 days',
    riskScore: 78,
    keyInsight: 'Elevation is the dominant risk factor',
    uniqueFinding: 'Historical flood patterns suggest longer recovery periods than other models predict'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek-R1',
    color: '#f97316',
    recoveryTime: '32 days',
    riskScore: 73,
    keyInsight: 'Elevation combined with bayou proximity creates compound risk',
    uniqueFinding: 'Retail businesses recover significantly slower than office spaces in this area'
  },
  {
    id: 'gpt4',
    name: 'GPT-4',
    color: '#3b82f6',
    recoveryTime: '24 days',
    riskScore: 65,
    keyInsight: 'Power infrastructure is the critical path dependency',
    uniqueFinding: 'Building proximity to backup power grid significantly reduces recovery time'
  },
  {
    id: 'claude3',
    name: 'Claude 3',
    color: '#8b5cf6',
    recoveryTime: '20 days',
    riskScore: 52,
    keyInsight: 'Business continuity plans most important for rapid recovery',
    uniqueFinding: 'Tenants with remote work capabilities recover 42% faster than those without'
  }
];

// Styled components from the older version
const Panel = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 35%;
  background: #1A1A1A;
  color: white;
  display: flex;
  flex-direction: column;
  z-index: 1;
  transform: translateX(${props => props.$isCollapsed ? '-100%' : '0'});
  transition: transform 0.3s ease;
  box-shadow: ${props => props.$isCollapsed ? 'none' : '0 0 20px rgba(0,0,0,0.5)'};

  @media (max-width: 768px) {
    position: fixed;
    width: 100%;
    height: 60vh;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    transform: translateY(${props => props.$isCollapsed ? '100%' : '0'});
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
    z-index: 1000;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
`;

const ChatHeader = styled.div`
  padding: 20px;
  font-size: 24px;
  font-weight: 500;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: 768px) {
    padding: 12px;
    font-size: 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
`;

const ChatMessages = styled.div`
  flex-grow: 1;
  overflow-y: auto;
  padding: 20px;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch; /* For smoother scrolling on iOS */

  @media (max-width: 768px) {
    padding: 12px;
    max-height: calc(60vh - 138px); /* Adjust based on header and input area heights */
  }

  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const Message = styled.div`
  margin-bottom: 24px;
`;

const MessageHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
`;

const Avatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #2A2A2A;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Sender = styled.div`
  font-size: 18px;
  font-weight: 500;
`;

const MessageContent = styled.div`
  font-size: 16px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
`;

const InputArea = styled.div`
  padding: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: 768px) {
    padding: 16px;
    position: sticky;
    bottom: 0;
    background: #1A1A1A;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.2);
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 16px;
  background: #2A2A2A;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 16px;
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
  
  @media (max-width: 768px) {
    padding: 12px 16px;
    border-radius: 24px;
    font-size: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) inset;
  }
`;

const InitialPrompt = styled.div`
  text-align: center;
  font-size: 20px;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 40px;
  padding: 0 20px;
`;

const QuestionButton = styled.button`
  width: 95%;
  margin: 10px auto;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  color: white;
  font-size: 18px;
  text-align: left;
  cursor: pointer;
  display: block;
  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
`;

const FollowUpButton = styled(QuestionButton)`
  margin-top: 10px;
  padding: 12px;
  font-size: 16px;
  opacity: 0.8;
  &:hover {
    opacity: 1;
  }
`;

const SeeMoreButton = styled(QuestionButton)`
  background: rgba(0, 136, 204, 0.15);  // Using #0088cc (the blue) with transparency
  border: 1px solid rgba(0, 136, 204, 0.3);
  
  &:hover {
    background: rgba(0, 136, 204, 0.25);
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const AnimatedDiv = styled.div`
  margin-bottom: 12px;
  opacity: 0;
  animation: ${fadeIn} 0.5s ease-out forwards;
  animation-delay: ${props => props.$delay}s;
`;

const CollapseIconContainer = styled.div`
  position: absolute;
  left: ${props => props.$isCollapsed ? '10px' : '35%'};
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  transition: left 0.3s ease;

  @media (max-width: 768px) {
    position: fixed;
    left: 50%;
    top: ${props => props.$isCollapsed ? 'auto' : 'calc(40vh - 28px)'}; /* Position above panel when open */
    bottom: ${props => props.$isCollapsed ? '20px' : 'auto'};
    transform: translateX(-50%) ${props => props.$isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)'};
    z-index: 1001; /* Ensure it's above the panel */
  }
`;

const CollapseIcon = styled.div`
  width: 48px;
  height: 48px;
  background: rgba(0, 0, 0, 0.85);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  transition: all 0.2s ease;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);

  @media (max-width: 768px) {
    width: 56px;
    height: 56px;
    background: #1A1A1A;
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  svg {
    width: 24px;
    height: 24px;
    transform: rotate(${props => props.$isCollapsed ? '0deg' : '180deg'});
    transition: transform 0.3s ease;
  }

  &:hover {
    background: ${props => props.$isCollapsed ? 'rgba(0, 0, 0, 0.95)' : '#2A2A2A'};
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

const LoadingMessage = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  color: rgba(255, 255, 255, 0.7);
`;

const LoadingStep = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  opacity: 0;
  transform: translateY(10px);
  animation: ${fadeIn} 0.3s ease-out forwards;
  animation-delay: ${props => props.$delay}ms;

  .icon {
    font-size: 16px;
    min-width: 24px;
  }

  .text {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
  }

  .dots {
    color: rgba(255, 255, 255, 0.4);
    animation: loadingDots 1.4s infinite;
  }
`;

// New styled components for visualizations
const VisualizationCard = styled.div`
  background: #2A2A2A;
  border-radius: 12px;
  padding: 16px;
  margin: 16px 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden; /* Prevent content overflow */
  
  @media (max-width: 768px) {
    padding: 12px;
    margin: 12px 0;
    width: 100%;
    border-radius: 8px;
    /* Improve touch scrolling for content inside visualization cards */
    > div {
      -webkit-overflow-scrolling: touch;
    }
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  gap: 8px;
  
  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: white;
  }
`;

const ModelCard = styled.div`
  background: #1A1A1A;
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0;
  border-left: 3px solid ${props => props.$color};
`;

const ModelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const ModelName = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => props.$color};
  }
  
  .name {
    font-weight: 600;
    color: white;
  }
`;

const ModelStats = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  
  .risk-score {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 600;
    background: ${props => props.$color}20;
    color: ${props => props.$color};
  }
  
  .recovery-time {
    color: white;
    font-weight: 500;
  }
`;

const ChartContainer = styled.div`
  height: 200px;
  width: 100%;
  margin: 16px 0;

  @media (max-width: 768px) {
    height: 160px;
    margin: 12px 0;
  }
`;

const ChartLegend = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 8px;
  flex-wrap: wrap;
  
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    
    .label {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.7);
    }
  }
`;

const InsightText = styled.p`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  font-style: italic;
  margin: 8px 0 0 0;
`;

const AIChatPanel = ({ messages, setMessages, handleQuestion, map, initialCollapsed = true }) => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const messagesEndRef = useRef(null);
  const panelInitializedRef = useRef(false);

  // Add toggle handler with enhanced debug logging
  const handleCollapseToggle = () => {
    console.log('🔍 Panel collapse clicked');
    console.log('Current collapse state:', isCollapsed);
    console.log('Window width:', window.innerWidth);
    console.log('Is mobile?:', window.innerWidth <= 768);
    
    const newState = !isCollapsed;
    console.log('Setting new collapse state to:', newState);
    
    setIsCollapsed(newState);
    
    // Log after state update
    setTimeout(() => {
      console.log('Updated collapse state:', newState);
      console.log('Panel transform should be:', newState ? '100%' : '0');
    }, 0);
  };

  // Add effect to log panel state changes
  useEffect(() => {
    console.log('Panel collapse state changed to:', isCollapsed);
    console.log('Panel should be:', isCollapsed ? 'hidden' : 'visible');
  }, [isCollapsed]);

  // Auto-scroll effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle panel collapse
  useEffect(() => {
    if (map && map.current) {
      console.log('Applying panel collapse state:', isCollapsed);
      handlePanelCollapse(isCollapsed, map);
    }
  }, [isCollapsed, map]);

  // Special effect for initial load - runs only once on component mount
  useEffect(() => {
    if (!panelInitializedRef.current) {
      console.log('Forcing initial panel collapse');
      setIsCollapsed(true);
      
      // Try multiple times to ensure it stays collapsed during initialization
      const applyCollapse = () => {
        if (map && map.current) {
          handlePanelCollapse(true, map);
        }
      };
      
      // Apply immediately
      applyCollapse();
      
      // And also after short delays to ensure it applies after any other initialization
      const timers = [
        setTimeout(applyCollapse, 100),
        setTimeout(applyCollapse, 500),
        setTimeout(applyCollapse, 1000)
      ];
      
      panelInitializedRef.current = true;
      
      return () => timers.forEach(timer => clearTimeout(timer));
    }
  }, [map]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      // When user submits a question, open the panel if it's closed
      if (isCollapsed) {
        setIsCollapsed(false);
      }
      await handlePanelQuestion(inputValue.trim(), map, setMessages, setIsLoading);
      setInputValue('');
    }
  };

  // Add a safe question handler for predefined questions
  const handlePredefinedQuestion = async (questionText) => {
    console.log('Handling predefined question:', questionText);
    
    // When user clicks a question, open the panel if it's closed
    if (isCollapsed) {
      setIsCollapsed(false);
    }
    
    try {
      // Check if map or map.current exists, otherwise use mock data
      const mapRef = map && (map.current || map);
      if (!mapRef) {
        console.log('Map reference not available, using mock data');
      }
      
      // For hardcoded questions like "Where are the major flood-prone areas?", 
      // we can directly use the mock response if available
      if (questionText === "Where are the major flood-prone areas?" && 
          MOCK_RESPONSES && MOCK_RESPONSES[questionText]) {
        setMessages(prev => [
          ...prev,
          { isUser: true, content: questionText },
          { isUser: false, content: JSON.parse(MOCK_RESPONSES[questionText].content[0].text) }
        ]);
        return;
      }
      
      await handlePanelQuestion(questionText, mapRef, setMessages, setIsLoading);
    } catch (error) {
      console.error('Error handling predefined question:', error);
      setMessages(prev => [
        ...prev, 
        { isUser: true, content: questionText },
        { 
          isUser: false, 
          content: { 
            preGraphText: "Sorry, I encountered an error processing your request.", 
            postGraphText: "Please try again or select another question." 
          } 
        }
      ]);
    }
  };

  return (
    <>
      <Panel 
        $isCollapsed={isCollapsed}
        style={{ willChange: 'transform' }}
      >
        <ChatHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <span style={{ color: '#666', fontSize: '14px', fontWeight: 500 }}>Chat with</span>
              <span style={{ color: '#0088cc', fontSize: '14px', fontWeight: 600, marginLeft: '4px' }}>ATLAS</span>
            </div>
            <span style={{ 
              color: '#ffffff', 
              fontSize: '12px', 
              fontWeight: 600,
              backgroundColor: '#0088cc',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>v0.1</span>
          </div>
        </ChatHeader>

        <ChatMessages>
          {messages.length === 0 ? (
            <>
              <InitialPrompt>
                <div style={{ fontSize: '24px', marginBottom: '12px' }}>
                  Ask me about Houston's <span style={{ fontWeight: 800 }}>flood patterns</span>, <span style={{ fontWeight: 800 }}>water infrastructure</span>, and <span style={{ fontWeight: 800 }}>historical flood data</span>.
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 300 }}>
                  I can help you analyze flood risks, drainage systems, watershed patterns, and historical flooding impacts across Houston.
                </div>
              </InitialPrompt>

              <AnimatedDiv $delay={0.2}>
                <QuestionButton onClick={() => handlePredefinedQuestion("Show me the areas most impacted by Hurricane Harvey")}>
                  Show me areas most impacted by Hurricane Harvey
                </QuestionButton>
              </AnimatedDiv>

              <AnimatedDiv $delay={0.4}>
                <QuestionButton onClick={() => handlePredefinedQuestion("Where are the major flood-prone areas?")}>
                  Where are the major flood-prone areas?
                </QuestionButton>
              </AnimatedDiv>

              <AnimatedDiv $delay={0.6}>
                <QuestionButton onClick={() => handlePredefinedQuestion("Analyze flood risks by ZIP code")}>
                  Analyze flood risks by ZIP code
                </QuestionButton>
              </AnimatedDiv>

              <AnimatedDiv $delay={0.8}>
                <SeeMoreButton onClick={() => handlePredefinedQuestion("Show me more flood analysis options")}>
                  See more
                </SeeMoreButton>
              </AnimatedDiv>
            </>
          ) : (
            <>
              {messages.map((msg, i) => (
                <Message key={i}>
                  <MessageHeader>
                    <Avatar />
                    <Sender>{msg.isUser ? 'You' : 'ATLAS'}</Sender>
                  </MessageHeader>
                  <MessageContent>
                    {msg.isUser ? msg.content : (
                      <>
                        {msg.content.action === "showCommercialCluster" && (
                          <div className="bg-gray-900 rounded-xl overflow-hidden shadow-xl border border-gray-800 w-full max-w-3xl">
                            {/* Commercial Info Header */}
                            <div className="p-4 border-b border-gray-800">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Building className="w-5 h-5 text-gray-400" />
                                  <h2 className="text-xl font-bold text-white">{msg.content.clusterData.name}</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-red-500" />
                                  <span className="text-red-500 font-medium text-sm">High Risk Zone</span>
                                </div>
                              </div>
                              <div className="text-sm text-gray-400">
                                {msg.content.clusterData.type} | {msg.content.clusterData.properties} properties | {msg.content.clusterData.sqft} sq ft
                              </div>
                            </div>

                            {/* Recovery Timeline */}
                            <div className="p-4 border-b border-gray-800">
                              <h3 className="font-bold text-white mb-3 flex items-center">
                                <Clock className="w-5 h-5 mr-2" />
                                AI Recovery Timeline
                              </h3>
                              
                              <div className="bg-gray-800 rounded-lg p-3 mb-4 text-gray-300 text-sm">
                                <p>Modeling a <span className="text-white font-bold">Category 4</span> hurricane scenario with sustained winds of <span className="text-white font-bold">130 mph</span> and rainfall of <span className="text-white font-bold">40+ inches</span> over <span className="text-white font-bold">4 days</span>. Initial impact shows <span className="text-white font-bold">65%</span> of the area experiencing power outages and flood depths averaging <span className="text-white font-bold">2.8 feet</span> above ground level, comparable to Hurricane Harvey conditions.</p>
                              </div>
                              
                              <div className="h-64 w-full mb-4">
                                <div className="text-gray-300 text-sm font-semibold mb-4 text-center">Recovery Projection scenario 102</div>
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart 
                                    data={[
                                      { time: 0, Infrastructure: 100, Environmental: 100, Operational: 100 },
                                      { time: 6, Infrastructure: 35, Environmental: 45, Operational: 60 },
                                      { time: 12, Infrastructure: 30, Environmental: 40, Operational: 55 },
                                      { time: 24, Infrastructure: 40, Environmental: 45, Operational: 65 },
                                      { time: 48, Infrastructure: 55, Environmental: 50, Operational: 75 },
                                      { time: 72, Infrastructure: 70, Environmental: 60, Operational: 85 },
                                      { time: 96, Infrastructure: 80, Environmental: 65, Operational: 90 },
                                      { time: 120, Infrastructure: 85, Environmental: 70, Operational: 95 },
                                      { time: 168, Infrastructure: 90, Environmental: 80, Operational: 98 },
                                      { time: 240, Infrastructure: 95, Environmental: 90, Operational: 100 }
                                    ]}
                                    margin={{ top: 10, right: 15, left: 5, bottom: 20 }}
                                  >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis 
                                      dataKey="time" 
                                      stroke="#9ca3af"
                                      tickFormatter={(value) => `${value}h`}
                                      tick={{ fontSize: 10 }}
                                      label={{ 
                                        value: 'Hours Since Impact', 
                                        position: 'insideBottom',
                                        fill: '#9ca3af',
                                        fontSize: 11,
                                        dy: 10,
                                        offset: -5
                                      }}
                                    />
                                    <YAxis 
                                      stroke="#9ca3af"
                                      tick={{ fontSize: 10 }}
                                      tickCount={5}
                                      tickFormatter={(value) => `${value}%`}
                                      axisLine={false}
                                      tickLine={false}
                                      label={{ 
                                        value: 'System Functionality', 
                                        angle: -90, 
                                        position: 'center',
                                        fill: '#9ca3af',
                                        fontSize: 11,
                                        dx: -25
                                      }}
                                    />
                                    <Tooltip 
                                      contentStyle={{ 
                                        backgroundColor: '#1f2937', 
                                        border: '1px solid #374151', 
                                        color: '#e5e7eb',
                                        fontSize: 11,
                                        padding: '8px'
                                      }}
                                      formatter={(value, name) => [`${value}%`, name]}
                                      labelFormatter={(value) => `Hour ${value}`}
                                    />
                                    <Legend 
                                      verticalAlign="bottom" 
                                      height={36}
                                      wrapperStyle={{
                                        fontSize: '11px',
                                        paddingTop: '15px',
                                        marginBottom: '-25px'
                                      }}
                                    />
                                    <Area
                                      type="monotone"
                                      dataKey="Infrastructure"
                                      stroke={milestoneCategories.Infrastructure.color}
                                      fill={milestoneCategories.Infrastructure.color}
                                      fillOpacity={0.2}
                                      name="Infrastructure"
                                      strokeWidth={2}
                                    />
                                    <Area
                                      type="monotone"
                                      dataKey="Environmental"
                                      stroke={milestoneCategories.Environmental.color}
                                      fill={milestoneCategories.Environmental.color}
                                      fillOpacity={0.2}
                                      name="Environmental"
                                      strokeWidth={2}
                                    />
                                    <Area
                                      type="monotone"
                                      dataKey="Operational"
                                      stroke={milestoneCategories.Operational.color}
                                      fill={milestoneCategories.Operational.color}
                                      fillOpacity={0.2}
                                      name="Operational"
                                      strokeWidth={2}
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                            
                            {/* Model Conclusions */}
                            <div className="p-4 pt-8 pb-8 border-b border-gray-800">
                              <h3 className="font-bold text-white mb-3">LLM Recovery Predictions</h3>
                              <div className="space-y-3">
                                {msg.content.modelConclusions.map(model => (
                                  <div 
                                    key={model.id} 
                                    className="bg-gray-800 rounded-lg p-3 border border-gray-700"
                                    style={{ borderLeftColor: model.color, borderLeftWidth: '3px' }}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center">
                                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: model.color }}></div>
                                        <span className="text-white font-bold">{model.name}</span>
                                      </div>
                                      <div className="flex items-center">
                                        <span className="text-gray-400 text-sm mr-2">Risk Score:</span>
                                        <span 
                                          className="text-sm font-bold rounded-lg px-2 py-0.5" 
                                          style={{ backgroundColor: `${model.color}30`, color: model.color }}
                                        >
                                          {model.riskScore}
                                        </span>
                                        <span className="text-white font-medium ml-3">{model.recoveryTime}</span>
                                      </div>
                                    </div>
                                    <p className="text-sm text-gray-300 italic">"{model.uniqueFinding}"</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {/* Risk Factors Chart */}
                            <div className="p-4 border-b border-gray-800">
                              <h3 className="font-bold text-white mb-3 flex items-center">
                                <BarChart2 className="w-5 h-5 mr-2" />
                                Risk Factor Analysis
                              </h3>
                              
                              <div className="h-80 w-full mb-2">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart
                                    data={msg.content.riskFactorData}
                                    layout="vertical"
                                    barGap={2}
                                    barSize={8}
                                  >
                                    <defs>
                                      {msg.content.llmModels.map(model => (
                                        <linearGradient key={model.id} id={`gradient-${model.id}`} x1="0" y1="0" x2="1" y2="0">
                                          <stop offset="0%" stopColor={`${model.color}40`} />
                                          <stop offset="100%" stopColor={model.color} />
                                        </linearGradient>
                                      ))}
                                    </defs>
                                    <CartesianGrid 
                                      strokeDasharray="3 3" 
                                      stroke="#374151" 
                                      horizontal={true}
                                    />
                                    <XAxis 
                                      type="number" 
                                      domain={[0, 100]} 
                                      stroke="#9ca3af"
                                      tickLine={false}
                                      axisLine={false}
                                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                                      label={{ 
                                        value: 'Risk Impact Score (%)', 
                                        position: 'bottom',
                                        fill: '#e5e7eb',
                                        fontSize: 13,
                                        dy: 15
                                      }}
                                    />
                                    <YAxis 
                                      dataKey="factor" 
                                      type="category" 
                                      stroke="#9ca3af"
                                      tickLine={false}
                                      axisLine={false}
                                      tick={(props) => {
                                        const factor = msg.content.riskFactorData.find(d => d.factor === props.payload.value);
                                        const category = factor?.category;
                                        const categoryColor = milestoneCategories[category]?.color;
                                        return (
                                          <g transform={`translate(${props.x},${props.y})`}>
                                            <rect
                                              x={-135}
                                              y={-10}
                                              width={130}
                                              height={20}
                                              fill={`${categoryColor}15`}
                                              rx={4}
                                            />
                                            <text
                                              x={-15}
                                              y={0}
                                              dy={4}
                                              textAnchor="end"
                                              fill="#e5e7eb"
                                              fontSize={13}
                                              fontWeight={500}
                                            >
                                              {props.payload.value}
                                            </text>
                                            <text
                                              x={-125}
                                              y={0}
                                              dy={4}
                                              textAnchor="start"
                                              fill={categoryColor}
                                              fontSize={12}
                                              fontWeight={600}
                                            >
                                              {category}
                                            </text>
                                          </g>
                                        );
                                      }}
                                      width={140}
                                    />
                                    <Legend
                                      verticalAlign="top"
                                      align="right"
                                      iconType="circle"
                                      wrapperStyle={{
                                        paddingBottom: '10px'
                                      }}
                                    />
                                    <Tooltip 
                                      cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                      contentStyle={{ 
                                        backgroundColor: '#1f2937', 
                                        border: '1px solid #374151', 
                                        borderRadius: '6px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                        padding: '12px 16px',
                                        minWidth: '280px'
                                      }}
                                      itemStyle={{ color: '#e5e7eb', fontSize: '12px' }}
                                      labelStyle={{ color: '#e5e7eb', fontWeight: 600, marginBottom: '8px' }}
                                      formatter={(value, name, props) => {
                                        const data = props.payload;
                                        const model = msg.content.llmModels.find(m => m.name === name);
                                        return [
                                          <>
                                            <div style={{ 
                                              display: 'flex', 
                                              alignItems: 'center', 
                                              gap: '8px',
                                              padding: '4px 8px',
                                              background: `${model.color}15`,
                                              borderRadius: '4px',
                                              marginBottom: '4px'
                                            }}>
                                              <div style={{
                                                width: '3px',
                                                height: '16px',
                                                background: model.color,
                                                borderRadius: '2px'
                                              }} />
                                              <span style={{ 
                                                color: model.color,
                                                fontWeight: 600
                                              }}>
                                                {value}% Impact
                                              </span>
                                            </div>
                                          </>,
                                          name
                                        ];
                                      }}
                                      labelFormatter={(label) => {
                                        const factor = msg.content.riskFactorData.find(d => d.factor === label);
                                        const category = factor?.category;
                                        const categoryColor = milestoneCategories[category]?.color;
                                        return (
                                          <div>
                                            <div style={{ 
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '8px',
                                              marginBottom: '8px'
                                            }}>
                                              <div style={{
                                                width: '4px',
                                                height: '20px',
                                                background: categoryColor,
                                                borderRadius: '2px'
                                              }} />
                                              <div>
                                                <div style={{ 
                                                  fontSize: '14px',
                                                  fontWeight: 600,
                                                  color: categoryColor
                                                }}>
                                                  {category}
                                                </div>
                                                <div style={{ 
                                                  fontSize: '13px',
                                                  color: '#e5e7eb'
                                                }}>
                                                  {label}
                                                </div>
                                              </div>
                                            </div>
                                            <div style={{
                                              padding: '8px',
                                              background: '#374151',
                                              borderRadius: '4px',
                                              marginTop: '8px'
                                            }}>
                                              <div style={{ 
                                                fontSize: '12px',
                                                color: '#9ca3af',
                                                marginBottom: '4px'
                                              }}>
                                                {factor?.description}
                                              </div>
                                              <div style={{ 
                                                fontSize: '12px',
                                                color: '#d1d5db',
                                                fontStyle: 'italic'
                                              }}>
                                                {factor?.impact}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      }}
                                    />
                                    {msg.content.llmModels.map(model => (
                                      <Bar
                                        key={model.id}
                                        dataKey={model.name}
                                        fill={`url(#gradient-${model.id})`}
                                        radius={[0, 4, 4, 0]}
                                        name={model.name}
                                      />
                                    ))}
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                            
                            {/* More Details Bar */}
                            <div className="p-4 bg-gray-800 flex justify-between items-center">
                              <div className="text-gray-300">
                                <span className="text-white font-bold">Prediction Range:</span> 20-36 day recovery
                              </div>
                              <button className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-blue-700 transition-colors">
                                <span>Full Analysis</span>
                                <ArrowRight className="w-4 h-4 ml-1" />
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {msg.content.quickActions && (
                          <div style={{ marginTop: '20px' }}>
                            {msg.content.quickActions.map((action, index) => (
                              <FollowUpButton 
                                key={index}
                                onClick={() => handleQuickAction(action, map, setMessages, setIsLoading)}
                              >
                                {action.text}
                              </FollowUpButton>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </MessageContent>
                </Message>
              ))}

              {isLoading && (
                <Message>
                  <MessageHeader>
                    <Avatar />
                    <Sender>ATLAS</Sender>
                  </MessageHeader>
                  <MessageContent>
                    <LoadingMessage>
                      <LoadingStep $delay={300}>
                        <span className="icon">🌊</span>
                        <span className="text">Analyzing flood patterns...</span>
                        <span className="dots" />
                      </LoadingStep>
                      <LoadingStep $delay={600}>
                        <span className="icon">📊</span>
                        <span className="text">Processing historical flood data...</span>
                        <span className="dots" />
                      </LoadingStep>
                      <LoadingStep $delay={900}>
                        <span className="icon">🗺️</span>
                        <span className="text">Mapping flood-prone areas...</span>
                        <span className="dots" />
                      </LoadingStep>
                    </LoadingMessage>
                  </MessageContent>
                </Message>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </ChatMessages>

        <InputArea>
          <Input 
            placeholder="Ask about Houston flooding..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSubmit(e);
              }
            }}
          />
        </InputArea>
      </Panel>

      <CollapseIconContainer 
        $isCollapsed={isCollapsed}
        style={{ willChange: 'transform' }}
      >
        <CollapseIcon 
          onClick={handleCollapseToggle}
          title={isCollapsed ? "Expand panel" : "Collapse panel"}
          $isCollapsed={isCollapsed}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/>
          </svg>
        </CollapseIcon>
      </CollapseIconContainer>
    </>
  );
};

export default AIChatPanel; 
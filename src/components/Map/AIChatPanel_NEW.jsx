import React, { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { handlePanelQuestion, handleQuickAction } from '../../services/claude';
import { initializePanelAnimations, handlePanelCollapse } from './hooks/mapAnimations';

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
`;

const ChatHeader = styled.div`
  padding: 20px;
  font-size: 24px;
  font-weight: 500;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const ChatMessages = styled.div`
  flex-grow: 1;
  overflow-y: auto;
  padding: 20px;
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
  z-index: 2;
  transition: left 0.3s ease;
`;

const CollapseIcon = styled.div`
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  transition: background-color 0.2s;

  svg {
    width: 24px;
    height: 24px;
    transform: rotate(${props => props.$isCollapsed ? '0deg' : '180deg'});
    transition: transform 0.3s ease;
  }

  &:hover {
    background: rgba(0, 0, 0, 0.9);
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

const AIChatPanel = ({ messages, setMessages, handleQuestion, map }) => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const messagesEndRef = useRef(null);

  // Auto-scroll effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle panel collapse
  useEffect(() => {
    handlePanelCollapse(isCollapsed, map);
  }, [isCollapsed, map]);

  // Initial collapse effect
  useEffect(() => {
    handlePanelCollapse(true, map);
  }, [map]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      await handlePanelQuestion(inputValue.trim(), map, setMessages, setIsLoading);
      setInputValue('');
    }
  };

  return (
    <>
      <Panel $isCollapsed={isCollapsed}>
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
                <QuestionButton onClick={() => handlePanelQuestion("Show me the areas most impacted by Hurricane Harvey", map, setMessages, setIsLoading)}>
                  Show me areas most impacted by Hurricane Harvey
                </QuestionButton>
              </AnimatedDiv>

              <AnimatedDiv $delay={0.4}>
                <QuestionButton onClick={() => handlePanelQuestion("Where are the major flood-prone areas?", map, setMessages, setIsLoading)}>
                  Where are the major flood-prone areas?
                </QuestionButton>
              </AnimatedDiv>

              <AnimatedDiv $delay={0.6}>
                <QuestionButton onClick={() => handlePanelQuestion("Analyze flood risks by ZIP code", map, setMessages, setIsLoading)}>
                  Analyze flood risks by ZIP code
                </QuestionButton>
              </AnimatedDiv>

              <AnimatedDiv $delay={0.8}>
                <SeeMoreButton onClick={() => handlePanelQuestion("Show me more flood analysis options", map, setMessages, setIsLoading)}>
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
                        {msg.content.preGraphText && <div>{msg.content.preGraphText}</div>}
                        {msg.content.postGraphText && <div>{msg.content.postGraphText}</div>}
                        
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

                        {msg.content.followUpSuggestions && (
                          <div style={{ marginTop: '20px' }}>
                            {msg.content.followUpSuggestions.map((followUp, index) => (
                              <FollowUpButton 
                                key={index}
                                onClick={() => handlePanelQuestion(followUp.prompt, map, setMessages, setIsLoading)}
                              >
                                {followUp.text}
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

      <CollapseIconContainer $isCollapsed={isCollapsed}>
        <CollapseIcon 
          onClick={() => setIsCollapsed(!isCollapsed)} 
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
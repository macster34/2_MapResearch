import styled, { keyframes } from 'styled-components';

export const Panel = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  width: 400px;
  max-height: calc(100vh - 40px);
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  transform: ${props => props.$isCollapsed ? 'translateX(-420px)' : 'translateX(0)'};
  transition: transform 0.3s ease;
  z-index: 2;
`;

export const CollapseIconContainer = styled.div`
  position: absolute;
  top: 20px;
  left: ${props => props.$isCollapsed ? '20px' : '420px'};
  transition: left 0.3s ease;
  z-index: 2;
`;

export const CollapseIcon = styled.div`
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transform: ${props => props.$isCollapsed ? 'rotate(180deg)' : 'rotate(0)'};
  transition: transform 0.3s ease;

  svg {
    width: 24px;
    height: 24px;
    fill: white;
  }

  &:hover {
    background: rgba(0, 0, 0, 0.9);
  }
`;

export const Header = styled.div`
  padding: 16px;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

export const Messages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }
`;

export const Message = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const MessageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const Avatar = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #FF4500;
`;

export const Sender = styled.div`
  font-weight: 600;
  font-size: 14px;
`;

export const Content = styled.div`
  font-size: 14px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
`;

export const InputArea = styled.div`
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

export const Input = styled.input`
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 14px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  &:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.15);
  }
`;

export const QuestionButton = styled.button`
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  background: rgba(255, 69, 0, 0.2);
  border: 1px solid #FF4500;
  border-radius: 4px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 69, 0, 0.3);
  }
`;

export const FollowUpButton = styled.button`
  width: 100%;
  padding: 8px 12px;
  margin-top: 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: white;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
`;

export const SeeMoreButton = styled.button`
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
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

export const AnimatedDiv = styled.div`
  animation: ${fadeIn} 0.5s ease forwards;
  animation-delay: ${props => props.$delay}s;
  opacity: 0;
`;

export const Toggle3DButton = styled.button`
  position: absolute;
  bottom: 80px;
  right: 10px;
  width: 40px;
  height: 40px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 5;
  font-size: 16px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);

  &:active {
    background: rgba(0, 0, 0, 0.9);
    transform: scale(0.95);
  }

  &:hover {
    background: rgba(0, 0, 0, 0.9);
  }

  ${props => props.$active && `
    background: #0088cc;
    border-color: #0088cc;
  `}

  @media (min-width: 768px) {
    display: none;
  }
`;

export const RotateButton = styled.button`
  position: absolute;
  bottom: 140px;
  right: 10px;
  width: 40px;
  height: 40px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 5;
  font-size: 18px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);

  &:active {
    background: rgba(0, 0, 0, 0.9);
    transform: scale(0.95);
  }

  &:hover {
    background: rgba(0, 0, 0, 0.9);
  }

  @media (min-width: 768px) {
    display: none;
  }
`; 
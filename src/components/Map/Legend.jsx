import React from 'react';
import styled from 'styled-components';

const LegendContainer = styled.div`
  position: absolute;
  bottom: ${props => props.slideUp ? '110px' : '24px'};
  ${props => props.position === 'left' ? 'left: 24px;' : 'right: 24px;'}
  background: rgba(0,0,0,0.85);
  color: #fff;
  padding: 16px 20px 12px 20px;
  border-radius: 8px;
  z-index: 10;
  min-width: 220px;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  transition: bottom 0.4s cubic-bezier(0.4, 0, 0.2, 1), left 0.4s, right 0.4s;
`;
const LegendBar = styled.div`
  height: 18px;
  width: 320px;
  background: linear-gradient(to right, rgba(196,30,58,0.1) 0%, rgba(196,30,58,0.55) 50%, rgba(196,30,58,1) 100%);
  margin: 8px 0 4px 0;
  border-radius: 4px;
`;
const LegendLabels = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-top: 2px;
`;
const VulnerabilitySwatch = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 6px;
`;
const SwatchCircle = styled.div`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  margin-right: 10px;
  background: #FF00B7;
  opacity: ${props => props.opacity};
`;

const VulnerabilityLegend = ({ slideUp, position }) => (
  <LegendContainer slideUp={slideUp} position={position}>
    <div style={{ fontWeight: 600, marginBottom: 8 }}>Community Center Vulnerability</div>
    <VulnerabilitySwatch><SwatchCircle opacity={0.1} />Least vulnerable</VulnerabilitySwatch>
    <VulnerabilitySwatch><SwatchCircle opacity={0.4} />Low-moderate</VulnerabilitySwatch>
    <VulnerabilitySwatch><SwatchCircle opacity={0.7} />Moderate-high</VulnerabilitySwatch>
    <VulnerabilitySwatch opacity={1.0}><SwatchCircle opacity={1.0} />Most vulnerable</VulnerabilitySwatch>
  </LegendContainer>
);

const Legend = ({ visible, showVulnerability, slideUp, position }) => {
  if (showVulnerability) return <VulnerabilityLegend slideUp={slideUp} position={position} />;
  if (!visible) return null;
  return (
    <LegendContainer position={position}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>2010 Median Income</div>
      <LegendBar />
      <LegendLabels>
        <span>$0</span>
        <span>$30,000</span>
        <span>$60,000</span>
        <span>$90,000</span>
        <span>$120,000+</span>
      </LegendLabels>
    </LegendContainer>
  );
};

export default Legend; 
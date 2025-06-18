import React, { useRef, useState, useEffect } from 'react';
import PhysicalView from './Views/Building/PhysicalView';
import FinanceView from './Views/Finance/FinanceView';
import ZoningView from './Views/Zoning/ZoningView';
import ValidationPanel from '../ValidationPanel';
import MasterMetrics from './Views/Comps/Dashboard';
import { Book, Scale } from 'lucide-react';
import ScalePopup from './Views/Comps/Scale';
import { useAIAnalysis } from '../hooks/useAIAnalysis';

// Add InfoTooltip component
const InfoTooltip = ({ content }) => (
  <div className="group relative inline-block ml-1">
    <div className="cursor-help text-gray-400 hover:text-gray-300">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-sm text-gray-100 rounded-md absolute z-50 px-4 py-2 w-64 bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 pointer-events-none">
      {content}
      <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
        <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
      </svg>
    </div>
  </div>
);

const BUILDING_COLORS = {
  OUTER: '#FF4136',  // Red color matching map layer
  INNER: '#4CAF50',  // Green color matching map layer
  BUTTON_ACTIVE: '#FF0000',
  BUTTON_INACTIVE: '#333',
};

// Update building type data with more comprehensive information
const buildingExamples = {
  'Office Class A': {
    location: {
      address: "1401 S St NW",
      neighborhood: "Downtown",
      city: "Washington",
      state: "DC"
    },
    completion_date: "2025",
    snapshot: {
      propertyType: "Office (Class A)",
      totalArea: "220,000 sq ft",
      floors: 12,
      zoning: "C-2",
      owner: "Franklin Holdings"
    },
    connectivity: {
      clecsOnNet: [
        { name: "Cogent", type: "Tier 1" },
        { name: "Zayo", type: "Dark Fiber" },
        { name: "Crown Castle", type: "Metro Fiber" }
      ],
      peeringDb: {
        facility: "DcNet-1",
        ixpDistance: 1.2
      },
      broadbandProviders: {
        fiber: 2,
        dsl: 1,
        cable: 1
      },
      litBuilding: true
    },
    power: {
      substationDistance: 0.6,
      utilityRate: 0.12,
      reliabilityScore: 8.0,
      backupGenerators: false
    },
    environmental: {
      avgTemp: 65,
      humidity: "moderate",
      coolingPotential: true,
      restrictions: "none"
    },
    scores: {
      connectivity: 8.5,
      power: 7.2,
      zoning: 6.9,
      overall: 7.8
    }
  },
  'Industrial': {
    location: {
      address: "2500 V St NE",
      neighborhood: "Industrial District",
      city: "Washington",
      state: "DC"
    },
    completion_date: "2024",
    snapshot: {
      propertyType: "Industrial",
      totalArea: "180,000 sq ft",
      floors: 2,
      zoning: "PDR-1",
      owner: "DC Industrial Partners"
    },
    connectivity: {
      clecsOnNet: [
        { name: "Cogent", type: "Tier 1" },
        { name: "Crown Castle", type: "Metro Fiber" }
      ],
      peeringDb: {
        facility: "DcNet-2",
        ixpDistance: 1.8
      },
      broadbandProviders: {
        fiber: 1,
        dsl: 1,
        cable: 1
      },
      litBuilding: false
    },
    power: {
      substationDistance: 0.4,
      utilityRate: 0.11,
      reliabilityScore: 8.5,
      backupGenerators: true
    },
    environmental: {
      avgTemp: 68,
      humidity: "low",
      coolingPotential: true,
      restrictions: "none"
    },
    scores: {
      connectivity: 7.8,
      power: 8.5,
      zoning: 7.2,
      overall: 7.9
    }
  },
  'Mixed Use': {
    location: {
      address: "800 New Jersey Ave SE",
      neighborhood: "Navy Yard",
      city: "Washington",
      state: "DC"
    },
    completion_date: "2026",
    snapshot: {
      propertyType: "Mixed Use",
      totalArea: "320,000 sq ft",
      floors: 8,
      zoning: "MU-9",
      owner: "Capital Development"
    },
    connectivity: {
      clecsOnNet: [
        { name: "Cogent", type: "Tier 1" },
        { name: "Zayo", type: "Dark Fiber" },
        { name: "Verizon", type: "Metro Fiber" }
      ],
      peeringDb: {
        facility: "DcNet-3",
        ixpDistance: 0.9
      },
      broadbandProviders: {
        fiber: 3,
        dsl: 2,
        cable: 2
      },
      litBuilding: true
    },
    power: {
      substationDistance: 0.8,
      utilityRate: 0.13,
      reliabilityScore: 7.8,
      backupGenerators: true
    },
    environmental: {
      avgTemp: 70,
      humidity: "moderate",
      coolingPotential: true,
      restrictions: "limited"
    },
    scores: {
      connectivity: 9.0,
      power: 7.8,
      zoning: 8.2,
      overall: 8.3
    }
  }
};

// Add this component at the top level
const BuildingTypeSelector = ({ selectedType, onTypeChange }) => (
  <div className="mb-4">
    <div className="flex gap-2">
      {['Office Class A', 'Industrial', 'Mixed Use'].map((type) => (
        <button
          key={type}
          onClick={() => onTypeChange(type)}
          className={`px-3 py-2 rounded ${
            selectedType === type 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {type}
        </button>
      ))}
    </div>
  </div>
);

function BuildingPopup({
  selectedArticle,
  handleBackToOriginal,
  handleValidate,
  handleMatchResults,
  showComparison,
  validationError,
  isValidating,
  retryCount,
  MAX_RETRIES,
  lastValidationTime,
  showTypewriter,
  matchedResults,
  validatedData,
  validationScore,
  handleAnalysis,
  onCogentClick,
  cogentActive,
  aiNavigator,
  onAIPrompt
}) {
  // Move all hooks to the top, before any conditional logic
  const popupRef = useRef(null);
  const [popupWidth] = useState(490);
  const [popupHeight, setPopupHeight] = useState('85vh');
  const [activeView, setActiveView] = useState('dashboard');
  const [showScalePopup, setShowScalePopup] = useState(false);
  const [buildingOffset] = useState(30);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const { analyzeBuilding } = useAIAnalysis();

  useEffect(() => {
    console.log('BuildingPopup rendered');
  }, []);

  // Now add the safety check
  if (!selectedArticle || !selectedArticle.location) {
    return null;
  }

  console.log('BuildingPopup props:', { onCogentClick: !!onCogentClick, cogentActive });

  const handleViewChange = (view) => {
    console.log(`Changing view to: ${view}`);
    setActiveView(activeView === view ? 'dashboard' : view);
  };

  const toggleScalePopup = () => {
    setShowScalePopup(!showScalePopup);
  };

  // Get building type from the selected article
  const currentBuildingType = selectedArticle.buildingType || 'Office Class A';

  const mainContentStyle = {
    width: `${popupWidth}px`,
    flex: 'none',
  };

  const scalePopupStyle = {
    width: `${popupWidth}px`,
    flex: 'none',
    marginLeft: '10px',
  };

  // Add AI analysis panel
  const renderAIPanel = () => (
    <div className="ai-analysis-panel">
      <h3>AI Insights</h3>
      <div className="ai-suggestions">
        {aiSuggestions.map((suggestion, i) => (
          <div key={i} className="suggestion">
            <p>{suggestion.text}</p>
            <button onClick={() => onAIPrompt(suggestion.prompt)}>
              Explore This
            </button>
          </div>
        ))}
      </div>
      <input 
        type="text"
        placeholder="Ask about this building..."
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            onAIPrompt(e.target.value);
          }
        }}
      />
    </div>
  );

  return (
    <div 
      ref={popupRef}
      style={{
        position: 'absolute',
        left: '10px',
        top: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: '#fff',
        padding: '10px',
        borderRadius: '5px',
        maxHeight: '95vh',
        overflowY: 'auto',
        maxWidth: '118vw',
        display: 'flex',
        width: 'auto',
      }}
    >
      <div style={mainContentStyle}>
        <BuildingTypeSelector 
          selectedType={currentBuildingType}
          onTypeChange={(type) => {
            // This function is called when a building type is selected
            // You can implement any necessary logic here
          }}
        />

        <h2 style={{ 
          color: '#FFFFFF', 
          marginTop: '0', 
          marginBottom: '10px',
          fontWeight: 'bold',
          fontSize: '1.2em',
          maxWidth: '400px',
          lineHeight: '1.4em',
        }}>
          {buildingExamples[currentBuildingType].location.address}, 
          {buildingExamples[currentBuildingType].location.neighborhood} 
          {buildingExamples[currentBuildingType].location.city}, 
          {buildingExamples[currentBuildingType].location.state}
        </h2>
        <p style={{ 
          color: '#AAAAAA', 
          fontSize: '0.9em', 
          marginTop: '0', 
          marginBottom: '20px' 
        }}>
          Completion Date: {buildingExamples[currentBuildingType].completion_date || 'Unknown'}
        </p>
        
        <div 
          style={{ 
            display: 'flex', 
            gap: '10px', 
            width: '90%', 
            marginLeft: '5%',
            height: '40px',
            transition: 'width 0.3s',
            justifyContent: activeView ? 'center' : 'space-between',
            margin: '20px auto'
          }}
        >
          <button
            onClick={() => {
              handleViewChange('physical');
              handleAnalysis();
            }}
            style={{
              backgroundColor: activeView === 'physical' ? BUILDING_COLORS.OUTER : BUILDING_COLORS.BUTTON_INACTIVE,
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              flex: activeView === 'physical' ? 1.2 : 1,
              transition: 'background-color 0.3s, flex 0.3s'
            }}
          >
            PLAN
          </button>
          <button
            onClick={() => handleViewChange('finance')}
            style={{
              backgroundColor: activeView === 'finance' ? '#FF0000' : '#333',
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              flex: activeView === 'finance' ? 1.2 : 1,
              transition: 'background-color 0.3s, flex 0.3s'
            }}
          >
            FINANCE
          </button>
          <button
            onClick={() => handleViewChange('zoning')}
            style={{
              backgroundColor: activeView === 'zoning' ? '#FF0000' : '#333',
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              flex: activeView === 'zoning' ? 1.2 : 1,
              transition: 'background-color 0.3s, flex 0.3s'
            }}
          >
            ZONING
          </button>
        </div>

        <div>
          {activeView === 'dashboard' && (
            <MasterMetrics 
              onCogentClick={onCogentClick}
              cogentActive={cogentActive}
              buildingData={buildingExamples[currentBuildingType]}
              buildingType={currentBuildingType}
            />
          )}
          {activeView === 'physical' && (
            <PhysicalView 
              buildingOffset={buildingOffset}
              colors={BUILDING_COLORS}
            />
          )}
          {activeView === 'finance' && <FinanceView />}
          {activeView === 'zoning' && <ZoningView />}
        </div>

        <ValidationPanel
          handleValidate={handleValidate}
          handleMatchResults={handleMatchResults}
          showComparison={showComparison}
          validationError={validationError}
          isValidating={isValidating}
          retryCount={retryCount}
          MAX_RETRIES={MAX_RETRIES}
          lastValidationTime={lastValidationTime}
          showTypewriter={showTypewriter}
          matchedResults={matchedResults}
          validatedData={validatedData}
          validationScore={validationScore}
        />

        {aiNavigator && renderAIPanel()}
      </div>
      {showScalePopup && (
        <div style={scalePopupStyle}>
          <ScalePopup buildingData={buildingExamples['Office Class A']} />
        </div>
      )}
    </div>
  );
}

export default BuildingPopup;
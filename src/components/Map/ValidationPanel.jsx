import React, { useRef } from 'react';
import Typewriter from 'typewriter-effect';
import { FaCheck } from 'react-icons/fa';

function ValidationPanel({
  handleValidate, handleMatchResults, showComparison, validationError, isValidating,
  retryCount, MAX_RETRIES, lastValidationTime, showTypewriter, matchedResults,
  validatedData, validationScore
}) {
  const existingDataRef = useRef(null);
  const updatedDataRef = useRef(null);

  const onValidateClick = () => {
    console.log('Validate button clicked');
    handleValidate();
  };

  const handleScroll = (scrolledPane) => {
    const sourcePane = scrolledPane === 'existing' ? existingDataRef.current : updatedDataRef.current;
    const targetPane = scrolledPane === 'existing' ? updatedDataRef.current : existingDataRef.current;

    if (sourcePane && targetPane) {
      targetPane.scrollTop = sourcePane.scrollTop;
    }
  };

  const renderJsonDiff = (original, updated) => {
    const allKeys = new Set([...Object.keys(original), ...Object.keys(updated)]);
    return Array.from(allKeys).map(key => {
      const originalValue = original[key];
      const updatedValue = updated[key];
      const isDifferent = JSON.stringify(originalValue) !== JSON.stringify(updatedValue);

      return (
        <div key={key} style={{ marginBottom: '5px' }}>
          <strong>{key}:</strong>{' '}
          {isDifferent ? (
            <>
              <span style={{ color: '#888' }}>{JSON.stringify(originalValue)}</span>
              {' → '}
              <span style={{ color: '#FF4136', fontWeight: 'bold' }}>{JSON.stringify(updatedValue)}</span>
            </>
          ) : (
            <span style={{ color: '#888' }}>{JSON.stringify(originalValue)}</span>
          )}
        </div>
      );
    });
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <button
        onClick={onValidateClick}
        style={{
          backgroundColor: '#333',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 'bold',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <span style={{ color: '#FF4136' }}>
          {isValidating ? `Validating... (Attempt ${retryCount + 1}/${MAX_RETRIES})` : 'Validate'}
        </span>
        {lastValidationTime && (
          <span style={{ 
            color: '#888', 
            fontSize: '12px', 
            marginTop: '5px' 
          }}>
            Last: {lastValidationTime}
          </span>
        )}
      </button>

      {validationError && (
        <div style={{
          backgroundColor: '#FF4136',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          marginTop: '10px',
          fontSize: '14px'
        }}>
          {validationError}
        </div>
      )}

      {showTypewriter && !validationError && (
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          backgroundColor: '#222', 
          borderRadius: '5px',
          fontSize: '14px',
          color: '#4CAF50'
        }}>
          <Typewriter
            options={{
              strings: [
                "Initiating AI-powered web search...",
                "Scanning real estate databases...",
                "Analyzing recent market trends...",
                "Compiling updated building information...",
                "Validating data against multiple sources..."
              ],
              autoStart: true,
              loop: true,
              delay: 15,
              deleteSpeed: 5,
            }}
          />
        </div>
      )}

      {showComparison && (
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#FF4136' }}>Validation Results</h3>
          <p style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            color: '#fff', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center'
          }}>
            Validation Score: 
            <span style={{ color: '#4CAF50', marginLeft: '5px' }}>
              {(validationScore || 100).toFixed(2)}%
            </span>
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ width: '48%' }}>
              <h4 style={{ color: '#FF4136' }}>Existing Data</h4>
              <div 
                ref={existingDataRef}
                onScroll={() => handleScroll('existing')}
                style={{ 
                  backgroundColor: '#222',
                  color: '#fff',
                  padding: '10px',
                  borderRadius: '5px',
                  height: '300px',
                  overflowY: 'auto',
                  fontSize: '12px',
                  fontWeight: 'normal'
                }}
              >
                {renderJsonDiff(validatedData?.original, validatedData?.updated)}
              </div>
            </div>
            <div style={{ width: '48%' }}>
              <h4 style={{ color: '#FF4136' }}>Updated Data</h4>
              <div 
                ref={updatedDataRef}
                onScroll={() => handleScroll('updated')}
                style={{ 
                  backgroundColor: '#222',
                  color: '#fff',
                  padding: '10px',
                  borderRadius: '5px',
                  height: '300px',
                  overflowY: 'auto',
                  fontSize: '12px',
                  fontWeight: 'normal'
                }}
              >
                {renderJsonDiff(validatedData?.original, validatedData?.updated)}
              </div>
            </div>
          </div>
          <button
            onClick={handleMatchResults}
            style={{
              backgroundColor: '#000',
              color: 'white',
              border: '0.2px solid white',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Match Results
            {matchedResults && (
              <FaCheck style={{ color: '#4CAF50', marginLeft: '10px' }} />
            )}
          </button>
          <p style={{
            color: '#888',
            fontSize: '12px',
            marginTop: '5px',
            textAlign: 'center'
          }}>
            {matchedResults ? 'Data matched successfully' : 'Review the changes before applying'}
          </p>
        </div>
      )}
    </div>
  );
}

export default ValidationPanel;
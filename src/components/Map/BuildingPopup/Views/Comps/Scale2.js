import React from 'react';
import { Book } from 'lucide-react';
import { motion } from 'framer-motion';

function ScalePopup({ buildingData }) {
  console.log('ScalePopup rendering with data:', buildingData);

  const renderContent = () => (
    <>
      <h2 style={{ 
        color: '#FFFFFF', 
        marginTop: '0', 
        marginBottom: '10px',
        fontWeight: 'bold',
        fontSize: '1.2em'
      }}>
        {buildingData.address}, {buildingData.neighborhood} {buildingData.city}, {buildingData.state}
      </h2>
      <p style={{ 
        color: '#AAAAAA', 
        fontSize: '0.9em', 
        marginTop: '0', 
        marginBottom: '20px' 
      }}>
        Completion Date: {buildingData.completion_date}
      </p>
      {buildingData.image_url && (
        <div style={{ position: 'relative' }}>
          <img
            src={buildingData.image_url}
            alt={buildingData.title}
            style={{ maxWidth: '100%', height: 'auto', marginBottom: '30px' }}
          />
          <button
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              backgroundColor: '#333',
              border: 'none',
              padding: '5px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '30px',
              height: '30px'
            }}
          >
            <Book style={{ color: '#fff', width: '20px', height: '20px' }} />
          </button>
        </div>
      )}
    </>
  );

  return (
    <motion.div 
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: '0%', opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        left: '100%',
        top: '0',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: '#fff',
        padding: '20px',
        borderRadius: '5px',
        width: '400px',
        maxHeight: '85vh',
        overflowY: 'auto',
        zIndex: 1000,
        border: '1px solid #FF0000',
      }}
    >
      <div style={{ marginBottom: '10px', color: '#FF0000', fontWeight: 'bold' }}>
        Scale Comparison View
      </div>
      {renderContent()}
      <div style={{
        marginTop: '20px',
        padding: '10px',
        border: '1px solid #0000FF',
        borderRadius: '5px',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
      }}>
        <h3 style={{ 
          color: '#FFFFFF', 
          marginTop: '0', 
          marginBottom: '10px',
          fontWeight: 'bold',
          fontSize: '1.1em'
        }}>
          Additional Information
        </h3>
        <p style={{ 
          color: '#AAAAAA', 
          fontSize: '0.9em', 
          marginTop: '0', 
          marginBottom: '10px' 
        }}>
          This is an additional card with a blue border.
        </p>
      </div>
    </motion.div>
  );
}

export default ScalePopup;

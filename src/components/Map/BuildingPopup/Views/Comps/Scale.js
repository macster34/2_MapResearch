import React from 'react';
import { Book, Home, Building, DollarSign, Layers, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import dcData from '../../../DC.json'; // Ensure the correct path to DC.json

function ScalePopup() {
  console.log('ScalePopup rendering');

  // Mock match scores for demonstration
  const propertiesWithScores = dcData.map((data, index) => ({
    ...data,
    matchScore: Math.floor(Math.random() * 21) + 80 // Random score between 80 and 100
  }));

  // Sort properties by match score in descending order
  propertiesWithScores.sort((a, b) => b.matchScore - a.matchScore);

  const renderContent = (data) => (
    <>
      <h2 style={{ 
        color: '#FFFFFF', 
        marginTop: '0', 
        marginBottom: '10px',
        fontWeight: 'bold',
        fontSize: '1.2em'
      }}>
        {data?.location?.address || 'Address not available'}, {data?.location?.neighborhood || 'Neighborhood not available'} {data?.location?.city || 'City not available'}, {data?.location?.state || 'State not available'}
      </h2>
      <p style={{ 
        color: '#AAAAAA', 
        fontSize: '0.9em', 
        marginTop: '0', 
        marginBottom: '20px' 
      }}>
        Completion Date: {data?.completion_date || 'Unknown'}
      </p>
      <p style={{ 
        color: '#AAAAAA', 
        fontSize: '0.9em', 
        marginTop: '0', 
        marginBottom: '20px' 
      }}>
        Developer: {data?.developer || 'Developer not available'}
      </p>
      <p style={{ 
        color: '#AAAAAA', 
        fontSize: '0.9em', 
        marginTop: '0', 
        marginBottom: '20px' 
      }}>
        {data?.summary || 'Summary not available'}
      </p>
      {data?.image_url && (
        <img
          src={data.image_url}
          alt={data?.location?.address || 'Image'}
          style={{ maxWidth: '100%', height: 'auto', marginBottom: '20px' }}
        />
      )}
    </>
  );

  const renderIndicators = (data) => (
    <div className="flex flex-col gap-4 mb-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Home className="w-5 h-5 text-blue-500" />
          <span className="text-sm text-gray-400">{data?.proposed_units || 'N/A'} Units</span>
        </div>
        <div className="flex items-center gap-2">
          <Building className="w-5 h-5 text-green-500" />
          <span className="text-sm text-gray-400">{data?.stories || 'N/A'} Floors</span>
        </div>
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-yellow-500" />
          <span className="text-sm text-gray-400">{data?.size || 'N/A'} Size</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-red-500" />
        <span className="text-sm text-gray-400">{data?.incentives?.description || 'No Tax Credits'}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-green-500" style={{ border: '1px solid white', padding: '2px 5px', borderRadius: '4px' }}>
          Match Score: {data.matchScore}%
        </span>
      </div>
    </div>
  );

  return (
    <motion.div 
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: '0%', opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        left: '52%',
        top: '100px',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: '#fff',
        padding: '20px',
        borderRadius: '5px',
        width: '450px',
        maxHeight: '245vh',
        overflowY: 'auto',
        zIndex: 1000,
      }}
    >
      <div style={{
        marginBottom: '20px',
        border: '1px solid #FF0000', // Red border for the first card
        padding: '10px',
        borderRadius: '5px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
      }}>
        {/* <Eye className="w-8 h-8 text-red-500 mb-2" /> */}
        <p style={{ 
          color: '#FFFFFF', 
          fontSize: '1.1em', 
          textAlign: 'center',
          margin: '0'
        }}
        >
          Discover properties with similar characteristics.
        </p>
      </div>
      {/* New card with a blue border */}
      {propertiesWithScores.map((data, index) => (
        <div key={index} style={{
          marginTop: '20px',
          padding: '10px',
          border: '1px solid #0000FF', // Blue border for the second card
          borderRadius: '5px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
        }}>
          {renderIndicators(data)}
          {renderContent(data)}
        </div>
      ))}
    </motion.div>
  );
}

export default ScalePopup;

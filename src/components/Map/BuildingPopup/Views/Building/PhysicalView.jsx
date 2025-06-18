import React from 'react';

function PhysicalView({ buildingOffset, colors, cogentActive, onCogentClick }) {
  return (
    <div style={{ padding: '20px' }}>
      <h3 style={{ 
        color: '#FFFFFF', 
        marginTop: '0',
        marginBottom: '20px',
        fontSize: '1.1em' 
      }}>
        Connectivity Overview
      </h3>

      {/* CLECs Section */}
      <div style={{
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        padding: '15px',
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px'
        }}>
          <h3 style={{ 
            color: '#4CAF50', 
            margin: 0,
            fontSize: '1.1em'
          }}>CLECs On-Net</h3>
          <span style={{ color: '#666', fontSize: '0.9em' }}>ⓘ</span>
        </div>

        <div 
          onClick={onCogentClick}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px',
            backgroundColor: cogentActive ? 'rgba(76, 175, 80, 0.2)' : 'rgba(40, 44, 52, 0.6)',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '8px',
            transition: 'background-color 0.3s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#4CAF50',
              borderRadius: '50%'
            }}></div>
            <span style={{ color: '#fff' }}>Cogent</span>
          </div>
          <span style={{
            backgroundColor: '#2E7D32',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '0.8em',
            color: '#fff'
          }}>Tier 1</span>
        </div>

        <div 
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px',
            backgroundColor: 'rgba(40, 44, 52, 0.6)',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#4CAF50',
              borderRadius: '50%'
            }}></div>
            <span style={{ color: '#fff' }}>Zayo</span>
          </div>
          <span style={{
            backgroundColor: '#9C27B0',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '0.8em',
            color: '#fff'
          }}>Dark Fiber</span>
        </div>

        <div 
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px',
            backgroundColor: 'rgba(40, 44, 52, 0.6)',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#4CAF50',
              borderRadius: '50%'
            }}></div>
            <span style={{ color: '#fff' }}>Crown Castle</span>
          </div>
          <span style={{
            backgroundColor: '#1976D2',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '0.8em',
            color: '#fff'
          }}>Metro Fiber</span>
        </div>

        <div style={{ color: '#666', fontSize: '0.9em', marginTop: '15px' }}>
          Carrier Diversity: 3 unique providers
        </div>
      </div>

      {/* Rest of your PhysicalView content */}
    </div>
  );
}

export default PhysicalView;

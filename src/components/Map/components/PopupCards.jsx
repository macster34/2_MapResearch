import React from 'react';

export const formatWaterData = (props) => {
  const groups = {
    main: {
      title: 'Location Information',
      fields: ['SYS NAME', 'WATERBODY'],
      description: 'Primary details about the water intake point'
    },
    ids: {
      title: 'Reference IDs',
      fields: ['OBJECTID', 'PWS ID', 'WTRSRC'],
      description: 'System identification numbers'
    },
    coordinates: {
      title: 'Geographic Coordinates',
      fields: ['LAT DD', 'LONG DD'],
      description: 'Precise location in decimal degrees'
    },
    technical: {
      title: 'Technical Details',
      fields: ['HORZ METH', 'HORZ ACC', 'HORZ REF', 'HORZ DATUM', 'HORZ ORG', 'HORZ DATE'],
      description: 'Horizontal measurement specifications and metadata'
    }
  };

  let html = '';
  
  Object.entries(groups).forEach(([key, group]) => {
    const hasData = group.fields.some(field => props[field]);
    if (hasData) {
      html += `
        <div style="margin-bottom: 16px;">
          <div style="color: #4dd4ac; font-size: 14px; font-weight: 500; margin-bottom: 8px; border-bottom: 1px solid rgba(77, 212, 172, 0.3); padding-bottom: 4px;">
            ${group.title}
          </div>
          <div style="color: #888; font-size: 12px; margin-bottom: 8px; font-style: italic;">
            ${group.description}
          </div>
          ${group.fields.map(field => {
            const value = props[field];
            if (!value) return '';
            const formattedKey = field.replace(/_/g, ' ');
            let displayValue = value;
            
            // Format specific fields
            if (field === 'HORZ DATE') {
              displayValue = new Date(value).toLocaleDateString();
            } else if (field === 'LAT DD' || field === 'LONG DD') {
              displayValue = Number(value).toFixed(5) + '°';
            }

            return `
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; padding-left: 8px;">
                <span style="color: #bbb;">${formattedKey}:</span>
                <span style="color: white; text-align: right;">${displayValue}</span>
              </div>`;
          }).join('')}
        </div>`;
    }
  });
  return html;
};

export const formatAIConsensusData = (zipCode, modelData) => {
  if (!modelData || !modelData.models) {
    return `
      <div>
        <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">
          ZIP Code: ${zipCode}
        </div>
        <div style="font-size: 14px; opacity: 0.7;">
          No model predictions available
        </div>
      </div>
    `;
  }

  const modelPredictions = Object.entries(modelData.models)
    .map(([model, value]) => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #888;">${model}:</span>
        <span>${value} ft</span>
      </div>
    `).join('');

  const disagreementColor = modelData.disagreement > 0.7 ? '#ff6b6b' : 
                         modelData.disagreement > 0.4 ? '#ffd93d' : 
                         '#4dd4ac';

  return `
    <div style="
      background: rgba(0, 0, 0, 0.9);
      border-radius: 8px;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.1);
    ">
      <div style="margin-bottom: 12px;">
        <div style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">
          ZIP Code: ${zipCode}
        </div>
        <div style="
          font-size: 14px;
          color: ${disagreementColor};
          margin-bottom: 8px;
        ">
          Disagreement Level: ${(modelData.disagreement * 100).toFixed(1)}%
        </div>
      </div>
      
      <div style="
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        padding: 12px;
        margin-bottom: 12px;
        font-size: 13px;
      ">
        <div style="margin-bottom: 8px; color: #888;">Model Predictions:</div>
        ${modelPredictions}
      </div>

      <div style="font-size: 13px; margin-bottom: 8px;">
        <span style="color: #888;">Confidence Range:</span>
        <span style="color: #4dd4ac;">${modelData.confidence_range}</span>
      </div>

      <div style="font-size: 13px;">
        <span style="color: #888;">Primary Concern:</span>
        <span style="color: #ff9966;">${modelData.primary_concern}</span>
      </div>
    </div>
  `;
}; 
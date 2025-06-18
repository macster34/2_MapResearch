// Mock data for AI disagreement - spread across different areas
export const mockDisagreementData = {
  '77002': { // Downtown
    disagreement: 0.9,
    models: {
      'Model A': 12.5,
      'Model B': 8.2,
      'Model C': 15.1,
      'Model D': 9.8
    },
    confidence_range: '8.2-15.1 ft',
    primary_concern: 'Urban drainage capacity'
  },
  '77026': { // North
    disagreement: 0.85,
    models: {
      'Model A': 14.2,
      'Model B': 9.5,
      'Model C': 16.8,
      'Model D': 11.3
    },
    confidence_range: '9.5-16.8 ft',
    primary_concern: 'Bayou overflow risk'
  },
  '77087': { // Southeast
    disagreement: 0.95,
    models: {
      'Model A': 16.7,
      'Model B': 10.8,
      'Model C': 19.2,
      'Model D': 13.5
    },
    confidence_range: '10.8-19.2 ft',
    primary_concern: 'Multiple flood sources'
  },
  '77045': { // Southwest
    disagreement: 0.8,
    models: {
      'Model A': 11.3,
      'Model B': 7.8,
      'Model C': 13.9,
      'Model D': 9.2
    },
    confidence_range: '7.8-13.9 ft',
    primary_concern: 'Infrastructure limitations'
  },
  '77091': { // Northwest
    disagreement: 0.88,
    models: {
      'Model A': 13.6,
      'Model B': 9.1,
      'Model C': 15.8,
      'Model D': 10.7
    },
    confidence_range: '9.1-15.8 ft',
    primary_concern: 'Drainage system capacity'
  },
  '77015': { // East
    disagreement: 0.92,
    models: {
      'Model A': 15.4,
      'Model B': 10.2,
      'Model C': 17.9,
      'Model D': 12.6
    },
    confidence_range: '10.2-17.9 ft',
    primary_concern: 'Industrial area flooding'
  },
  '77062': { // Southeast/Clear Lake
    disagreement: 0.87,
    models: {
      'Model A': 12.8,
      'Model B': 8.5,
      'Model C': 14.7,
      'Model D': 10.1
    },
    confidence_range: '8.5-14.7 ft',
    primary_concern: 'Coastal surge impact'
  },
  '77040': { // Northwest
    disagreement: 0.83,
    models: {
      'Model A': 11.9,
      'Model B': 8.1,
      'Model C': 13.8,
      'Model D': 9.4
    },
    confidence_range: '8.1-13.8 ft',
    primary_concern: 'Creek overflow risk'
  }
}; 
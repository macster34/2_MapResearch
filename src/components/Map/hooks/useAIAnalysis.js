import { useState, useCallback, useEffect } from 'react';

export const useAIAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [dcData, setDcData] = useState(null);

  // Load DC.json data
  useEffect(() => {
    const loadDcData = async () => {
      try {
        const response = await fetch('/DC.json');
        const data = await response.json();
        setDcData(data);
      } catch (error) {
        console.error('Error loading DC data:', error);
      }
    };
    loadDcData();
  }, []);

  const analyzeBuilding = useCallback(async (building, prompt) => {
    setIsAnalyzing(true);
    try {
      // Find matching building in DC.json data
      const buildingData = dcData?.find(b => 
        b.location.latitude === building.properties.latitude && 
        b.location.longitude === building.properties.longitude
      );

      const analysis = {
        buildingData: {
          type: buildingData?.property_type || building.properties.type,
          height: buildingData?.stories || building.properties.height,
          area: buildingData?.size || building.properties.area,
          financials: buildingData?.financial_metrics || {},
          regulatory: buildingData?.regulatory_info || {}
        },
        censusData: {
          population: building.properties.population,
          medianIncome: building.properties.medianIncome,
          medianHomeValue: building.properties.medianHomeValue,
        },
        prompt
      };

      // Generate dynamic suggestions based on building data
      const suggestions = [
        {
          text: `Analyze ${buildingData?.property_type || 'building'} conversion potential`,
          prompt: `What's the potential for converting this ${buildingData?.property_type || 'building'}?`
        },
        {
          text: "Compare financial metrics",
          prompt: "Show me financial comparisons with similar conversions"
        },
        {
          text: "Review zoning implications",
          prompt: `What are the zoning considerations for ${buildingData?.location?.neighborhood || 'this area'}?`
        }
      ];

      if (buildingData?.financial_metrics) {
        suggestions.push({
          text: "ROI Analysis",
          prompt: `What's the projected ROI based on the ${buildingData.financial_metrics.projected_irr}% IRR?`
        });
      }

      setAnalysisResults({ analysis, suggestions });
      return { analysis, suggestions };

    } catch (error) {
      console.error('Error in AI analysis:', error);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [dcData]);

  return {
    analyzeBuilding,
    isAnalyzing,
    analysisResults,
    dcData
  };
}; 
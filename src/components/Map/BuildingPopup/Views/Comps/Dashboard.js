import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Zap, Trophy } from 'lucide-react';
import DCFAnalysis from './CashFlow'; // Import the CashFlow component
import FinancialAnalysis from './DCF'; // Import the DCF component

const MasterMetrics = ({ 
  onCogentClick, 
  cogentActive, 
  buildingData,
  buildingType
}) => {
  const criticalFactors = {
    redFlags: [
      { factor: "Market Absorption", score: 65, threshold: 80, impact: -2.5 },
      { factor: "Construction Timeline", score: 72, threshold: 75, impact: -1.8 },
      { factor: "Parking Ratio", score: 70, threshold: 85, impact: -2.1 }
    ],
    pivotPoints: [
      { factor: "Affordable Mix", current: 20, target: 30, unlocks: "3.0 FAR Bonus" },
      { factor: "Unit Count", current: 150, target: 200, unlocks: "Tax Abatement" },
      { factor: "Retail Space", current: 8000, target: 12000, unlocks: "Fast Track" }
    ],
    advantages: [
      { factor: "Window Line", value: 95, market: 75, premium: 15 },
      { factor: "Floor Depth", value: 42, market: 45, premium: 12 },
      { factor: "Tax Benefits", value: 24.2, market: 18.5, premium: 18 }
    ]
  };

  return (
    <div className="bg-black text-white mt-2 p-2 rounded-lg">
      <DCFAnalysis 
        onCogentClick={onCogentClick}
        cogentActive={cogentActive}
        buildingData={buildingData}
        buildingType={buildingType}
      />

      <FinancialAnalysis />

      <div className="grid grid-cols-1 gap-2 mt-4 mb-1">
        <div className="bg-red-900/30 p-4 rounded border border-red-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold mb-2 bt-4">Red Flags</span>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="space-y-2">
            {criticalFactors.redFlags.map(flag => (
              <div key={flag.factor} className="flex justify-between items-center">
                <span className="text-xs">{flag.factor}</span>
                <span className="text-red-500 text-xs text-right">{flag.score}/{flag.threshold}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-yellow-900/30 p-3 mt-rounded border border-yellow-500">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold mb-2 mt-1">Pivot Points</span>
            <Zap className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="space-y-2">
            {criticalFactors.pivotPoints.map(point => (
              <div key={point.factor} className="flex justify-between items-center">
                <span className="text-xs">{point.factor}</span>
                <span className="text-yellow-500 text-xs text-right" >+{point.unlocks}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-green-900/30 p-4 rounded border border-green-500">
          <div className="flex items-center justify-between mb-4 ">
            <span className="text-sm   font-bold">Unique Advantages</span>
            <Trophy className="w-5 h-5 text-green-500" />
          </div>
          <div className="space-y-2">
            {criticalFactors.advantages.map(adv => (
              <div key={adv.factor} className="flex justify-between items-center">
                <span className="text-xs">{adv.factor}</span>
                <span className="text-green-500 text-xs text-right">+{adv.premium}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 bg-gray-800 p-4 rounded">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-sm text-gray-400">Project Score</span>
            <div className="text-2xl font-bold mt-1">72/100</div>
          </div>
          <div>
            <span className="text-sm text-gray-400">Risk Level</span>
            <div className="text-2xl font-bold text-yellow-500 mt-1">Medium</div>
          </div>
          <div>
            <span className="text-sm text-gray-400">IRR Premium</span>
            <div className="text-2xl font-bold text-green-500 mt-1">+2.3%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterMetrics;

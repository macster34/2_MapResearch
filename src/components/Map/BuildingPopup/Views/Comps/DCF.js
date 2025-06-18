import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Building, Clock, Activity, ChevronUp, ChevronDown } from 'lucide-react';

const FinancialAnalysis = () => {
  const [activeTab, setActiveTab] = useState('development');

  const costs = {
    development: {
      constructionCosts: [
        { type: 'Core & Shell', value: 145, detail: 'per SF', trend: 2.5 },
        { type: 'MEP Systems', value: 65, detail: 'per SF', trend: 3.8 },
        { type: 'Interior Build', value: 48, detail: 'per SF', trend: -1.2 },
        { type: 'Site & Demo', value: 25, detail: 'per SF', trend: 0.8 },
        { type: 'Gen Conditions', value: 28, detail: 'per SF', trend: 1.5 },
        { type: 'Contingency', value: 15, detail: 'per SF', trend: 0 }
      ],
      softCosts: [
        { type: 'Architecture', value: 12, percentHC: 4.5 },
        { type: 'Engineering', value: 8, percentHC: 3.0 },
        { type: 'Legal/Finance', value: 15, percentHC: 5.5 },
        { type: 'Testing/Inspect', value: 6, percentHC: 2.2 },
        { type: 'Insurance', value: 8, percentHC: 3.0 },
        { type: 'Permits/Fees', value: 18, percentHC: 6.5 }
      ],
      timeline: [
        { phase: 'Schematic Design', months: 2, status: 'complete', critical: false },
        { phase: 'Design Development', months: 3, status: 'complete', critical: true },
        { phase: 'Construction Docs', months: 4, status: 'inProgress', critical: true },
        { phase: 'Permits/Bidding', months: 3, status: 'inProgress', critical: false },
        { phase: 'Core & Shell', months: 10, status: 'pending', critical: true },
        { phase: 'Interior Build', months: 6, status: 'pending', critical: false },
        { phase: 'Site/Landscape', months: 4, status: 'pending', critical: false }
      ],
      utilities: [
        { type: 'Electric', current: 1.85, projected: 2.05, marketAvg: 1.95, unit: 'kWh' },
        { type: 'Water', current: 0.95, projected: 1.15, marketAvg: 1.05, unit: 'CCF' },
        { type: 'Gas', current: 0.45, projected: 0.55, marketAvg: 0.50, unit: 'therm' },
        { type: 'Trash', current: 0.35, projected: 0.40, marketAvg: 0.38, unit: 'SF' }
      ]
    }
  };

  const DevelopmentMetric = ({ label, value, subtext, trend }) => (
    <div className="bg-gray-900 p-2 mt-2 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        {trend && (
          <div className={`flex items-center ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trend > 0 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span className="text-xs ml-1">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className="text-xl font-bold">{value}</div>
      {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
    </div>
  );

  const renderDevelopment = () => (
    <div className="space-y-2">
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 gap-2">
        <DevelopmentMetric 
          label="Total Hard Costs" 
          value="$326/SF" 
          subtext="vs. $315 market avg"
          trend={2.5}
        />
        <DevelopmentMetric 
          label="Total Soft Costs" 
          value="$67/SF" 
          subtext="20.5% of hard costs"
          trend={-1.2}
        />
        <DevelopmentMetric 
          label="Timeline" 
          value="32 months" 
          subtext="4 months contingency"
        />
        <DevelopmentMetric 
          label="Total Budget" 
          value="$393/SF" 
          subtext="Including contingency"
          trend={1.8}
        />
      </div>

      <div className="grid grid-cols-1 mt-2 gap-2">
        {/* Hard Costs Chart */}
        <div className="bg-gray-900 p-2 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-medium">Hard Costs Breakdown</h4>
            <div className="text-xs text-gray-400">Total: $326/SF</div>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={costs.development.constructionCosts} 
                barSize={32}
                layout="vertical"
                margin={{ top: 10, right: 5, left: 22, bottom: 5 }}
              >
                <XAxis type="number" axisLine={false} tickLine={false} />
                <YAxis 
                  type="category" 
                  dataKey="type" 
                  axisLine={false} 
                  tickLine={false}
                  width={50}
                  tick={{fontSize: 10}}
                />
                <Tooltip
                  content={({ payload, label }) => {
                    if (!payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-gray-800 p-2 rounded border border-gray-700">
                        <div className="text-sm font-medium">{data.type}</div>
                        <div className="text-sm text-gray-400">${data.value}/SF</div>
                        <div className="text-xs text-gray-500">Trend: {data.trend}%</div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-gray-900 p-2 rounded-lg">
          <h4 className="text-sm font-medium mb-4">Development Timeline</h4>
          <div className="space-y-4">
            {costs.development.timeline.map((phase, index) => (
              <div key={phase.phase} className="relative">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center
                    ${phase.status === 'complete' ? 'bg-green-500/20' : 
                      phase.status === 'inProgress' ? 'bg-blue-500/20' : 
                      'bg-gray-700/20'}`}>
                    <div className={`w-3 h-3 rounded-full
                      ${phase.status === 'complete' ? 'bg-green-500' : 
                        phase.status === 'inProgress' ? 'bg-blue-500' : 
                        'bg-gray-700'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className={`text-sm font-medium ${phase.critical ? 'text-red-400' : ''}`}>
                        {phase.phase}
                      </span>
                      {phase.critical && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
                          Critical
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{phase.months} months</div>
                  </div>
                  <div className="w-16 text-right">
                    <div className="text-sm font-medium">
                      {phase.status === 'complete' ? '100%' : 
                       phase.status === 'inProgress' ? '50%' : 
                       '0%'}
                    </div>
                  </div>
                </div>
                {index < costs.development.timeline.length - 1 && (
                  <div className="absolute left-4 top-8 bottom-0 w-px bg-gray-700"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Utilities */}
      <div className="bg-gray-900 p-2 rounded-lg">
        <h4 className="text-sm font-medium mb-4">Utility Costs Analysis</h4>
        <div className="grid grid-cols-2 gap-2">
          {costs.development.utilities.map((util) => (
            <div key={util.type} className="p-3 bg-gray-800 rounded">
              <div className="text-sm text-gray-400 mb-2">{util.type}</div>
              <div className="text-md font-bold">${util.current}/{util.unit}</div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Projected:</span>
                  <span className="text-red-400">${util.projected}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Market Avg:</span>
                  <span className="text-gray-400">${util.marketAvg}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Render tabs and main content...
  return (
    <div className="bg-black text-white p-1  mt-4 rounded-lg">
      <div className="mb-2">
        <div className="flex space-x-1">
          {/* ... tab buttons ... */}
        </div>
        <div className="bg-gray-800 p-2 rounded-b">
          {activeTab === 'development' && renderDevelopment()}
          {/* ... other tab content ... */}
        </div>
      </div>
    </div>
  );
};

export default FinancialAnalysis;
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { DollarSign, Scale, TrendingUp, Home, Hammer, FileText } from 'lucide-react';

const Costs = () => {
  const yieldMetrics = {
    totalCost: 104000000,
    stabilizedNOI: 12450000,
    marketYield: 5.8,
    projectedYield: 6.9,
    comparableYields: [
      { property: "One City Center", yield: 6.2 },
      { property: "180 Water St", yield: 6.5 },
      { property: "DC Average", yield: 5.8 }
    ],
    costBreakdown: [
      { category: 'Acquisition', cost: 84500000, icon: Home },
      { category: 'Hard Costs', cost: 15500000, icon: Hammer },
      { category: 'Soft Costs', cost: 4000000, icon: FileText }
    ],
    stabilizedMetrics: [
      { year: 2024, noi: 2915000, yield: 2.8 },
      { year: 2025, noi: 8750000, yield: 4.9 },
      { year: 2026, noi: 11250000, yield: 6.2 },
      { year: 2027, noi: 12100000, yield: 6.7 },
      { year: 2028, noi: 12450000, yield: 6.9 }
    ]
  };

  return (
    <div className="bg-black text-white p-4 mt-1 rounded-lg">
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-gray-800 p-4 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Total Cost</span>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold">${(yieldMetrics.totalCost / 1000000).toFixed(1)}M</div>
          <div className="text-sm text-gray-400">${(yieldMetrics.totalCost / 320000).toFixed(0)}/SF</div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Stabilized NOI</span>
            <Scale className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold">${(yieldMetrics.stabilizedNOI / 1000000).toFixed(1)}M</div>
          <div className="text-sm text-gray-400">${(yieldMetrics.stabilizedNOI / 320000).toFixed(0)}/SF</div>
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Yield on Cost</span>
            <TrendingUp className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold">{yieldMetrics.projectedYield}%</div>
          <div className="text-sm text-green-500">+{(yieldMetrics.projectedYield - yieldMetrics.marketYield).toFixed(1)}% vs Market</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-800 p-4 rounded">
          <h4 className="text-sm text-gray-400 mb-4">Yield Stabilization</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yieldMetrics.stabilizedMetrics} margin={{ left: -30, right: 30 }}>
                <XAxis dataKey="year" />
                <YAxis domain={[0, 8]} />
                <Tooltip 
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-gray-900 p-3 rounded border border-gray-700">
                        <div className="text-sm">
                          <div>Year: {data.year}</div>
                          <div>NOI: ${(data.noi / 1000000).toFixed(1)}M</div>
                          <div>Yield: {data.yield}%</div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Line type="monotone" dataKey="yield" stroke="#ef4444" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <h4 className="text-sm text-gray-400 mb-4">Market Comparison</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yieldMetrics.comparableYields} margin={{ left: -35, right: 20 }}>
                <XAxis dataKey="property" />
                <YAxis domain={[5, 7]} />
                <Tooltip 
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    return (
                      <div className="bg-gray-900 p-3 rounded border border-gray-700">
                        <div className="text-sm">
                          <div>{payload[0].payload.property}</div>
                          <div>Yield: {payload[0].value}%</div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="yield" fill="#3b82f6" /> {/* Changed color to blue */}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-gray-800 p-4 rounded">
        <div className="grid grid-cols-3 gap-4 text-center">
          {yieldMetrics.costBreakdown.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.category}>
                <div className="flex items-center justify-center mb-2">
                  <Icon className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-400 ml-2">{item.category}</span>
                </div>
                <div className="text-xl font-bold">${(item.cost / 1000000).toFixed(1)}M</div>
                <div className="text-sm text-gray-400">
                  {((item.cost / yieldMetrics.totalCost) * 100).toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Costs;

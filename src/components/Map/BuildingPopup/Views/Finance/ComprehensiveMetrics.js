import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Ruler, DollarSign, Scale } from 'lucide-react';

const ComprehensiveMetrics = () => {
  const financialProjections = [
    { year: '2024', irr: 15.5, cashMultiple: 1.2 },
    { year: '2025', irr: 16.8, cashMultiple: 1.5 },
    { year: '2026', irr: 17.2, cashMultiple: 1.8 },
    { year: '2027', irr: 17.5, cashMultiple: 2.1 },
    { year: '2028', irr: 17.8, cashMultiple: 2.3 }
  ];

  const taxIncentives = [
    {
      program: 'Historic Tax Credit',
      value: 12500000,
      impact: 2.1,
      status: 'Secured'
    },
    {
      program: 'Opportunity Zone',
      value: 8500000,
      impact: 1.8,
      status: 'Eligible'
    },
    {
      program: 'Energy Efficiency',
      value: 3200000,
      impact: 0.7,
      status: 'In Process'
    }
  ];

  return (
    <div className="bg-black text-white p-4 mt-6 rounded-lg">
            <div className="flex justify-between items-center mb-0">
        <h3 className="text-xl mt-4 font-bold">Financial Conversion Analysis</h3>

      </div>
      <div className="text-xs text-gray-400 mt-0 mb-6">
          Building Value: $9,000,000 | 150 Units
        </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gray-800 p-4 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Target IRR</span>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold">17.8%</div>
          <div className="text-sm text-green-500">+2.3% above market</div>
        </div>
        

        
        <div className="bg-gray-800 p-4 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Cash Multiple</span>
            <Scale className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold">2.3x</div>
          <div className="text-sm text-blue-500">Year 5 Exit</div>
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Tax Benefits</span>
            <DollarSign className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold">$24.2M</div>
          <div className="text-sm text-red-500">Total Available</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h4 className="text-sm text-gray-400 mb-4">Financial Performance</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={financialProjections} margin={{ left: -20, right: -20 }}>
                <XAxis dataKey="year" />
                <YAxis yAxisId="left" orientation="left" domain={[0, 20]} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 3]} />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    return (
                      <div className="bg-gray-900 p-3 rounded border border-gray-700">
                        <div className="text-sm">
                          <div>Year: {payload[0].payload.year}</div>
                          <div>IRR: {payload[0].value}%</div>
                          <div>Multiple: {payload[1].value}x</div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Line yAxisId="left" type="monotone" dataKey="irr" stroke="#ef4444" />
                <Line yAxisId="right" type="monotone" dataKey="cashMultiple" stroke="#3b82f6" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <h4 className="text-sm text-gray-400 mb-4">Tax Incentive Impact</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taxIncentives } margin={{ left: -20, right: 20 }}>

                <XAxis dataKey="program" />
                <YAxis domain={[0, 3]} />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-gray-900 p-3 rounded border border-gray-700">
                        <div className="text-sm">
                          <div className="font-bold">{data.program}</div>
                          <div>Value: ${(data.value / 1000000).toFixed(1)}M</div>
                          <div>IRR Impact: +{data.impact}%</div>
                          <div>Status: {data.status}</div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="impact" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded">
        <h4 className="text-sm text-gray-400 mb-4">Combined Impact Analysis</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-400">Base IRR</div>
            <div className="text-xl font-bold">15.5%</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Tax Enhanced</div>
            <div className="text-xl font-bold text-green-500">+2.3%</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Final IRR</div>
            <div className="text-xl font-bold text-red-500">17.8%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveMetrics;
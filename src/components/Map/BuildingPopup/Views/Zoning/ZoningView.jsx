import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Building, ArrowUpRight, Clock, Car, DollarSign } from 'lucide-react';

function ZoningView() {
  const zoningData = {
    far: { current: 15, base: 12, bonus: 3 },
    height: { current: 150, limit: 160, utilized: 93.75 },
    housing: {
      total: 150,
      affordable: 30,
      minSize: 450,
      avgSize: 725
    },
    timeline: [
      { phase: "Fast Track Review", duration: 2 },
      { phase: "Zoning Approval", duration: 3 },
      { phase: "Building Permit", duration: 4 },
      { phase: "Construction", duration: 14 }
    ]
  };

  const densityMetrics = [
    { category: "Base FAR", value: 12 },
    { category: "Affordable Housing Bonus", value: 2 },
    { category: "TDR Bonus", value: 1 },
    { category: "Total FAR", value: 15 }
  ];

  const parkingData = {
    required: 150,
    provided: 120,
    potential: 30,
    revenue: 2160000,
    comparables: [
      { property: "1625 Mass Ave", ratio: 0.8 },
      { property: "One City Center", ratio: 0.9 },
      { property: "DC Average", ratio: 1.0 }
    ]
  };

  const taxData = {
    incentives: [
      {
        program: "Historic Tax Credit",
        value: 12500000,
        status: "Secured",
        timeline: "2024-2025"
      },
      {
        program: "Opportunity Zone",
        value: 8500000,
        status: "Eligible",
        timeline: "2024-2029"
      },
      {
        program: "Energy Efficiency",
        value: 3200000,
        status: "In Process",
        timeline: "2024-2026"
      }
    ],
    abatements: [
      { year: 2024, amount: 850000 },
      { year: 2025, amount: 875000 },
      { year: 2026, amount: 900000 },
      { year: 2027, amount: 925000 },
      { year: 2028, amount: 950000 }
    ]
  };

  return (
    <div className="bg-black text-white p-4 mt-6 mr-2 rounded-lg">
      
      <div className="flex justify-between items-center mb-0">
        <h3 className="text-xl mt-4 font-bold">Zoning Conversion Analysis</h3>

      </div>
      <div className="text-xs text-gray-400 mt-0 mb-6">
          Zoned Area: 150,000 SF | 150 Units
        </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gray-800 p-4 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Likely FAR Achieved</span>
            <Building className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold">15.0</div>
          <div className="text-sm text-green-500">+3.0 Bonus</div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Affordable Units</span>
            <ArrowUpRight className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold">20%</div>
          <div className="text-sm text-blue-500">30 Units</div>
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Fast Track Timeline</span>
            <Clock className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold">12-18</div>
          <div className="text-sm text-gray-400">Months</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 p-4 rounded">
          <h4 className="text-sm text-gray-400 mb-4">Density Bonus Breakdown</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={densityMetrics}>
                <XAxis dataKey="category" />
                <YAxis domain={[0, 16]} />
                <Tooltip />
                <Bar dataKey="value" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <h4 className="text-sm text-gray-400 mb-4">Unit Mix Analysis</h4>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between">
                <span>Minimum Size</span>
                <span>{zoningData.housing.minSize} SF</span>
              </div>
              <div className="h-2 bg-gray-700 rounded mt-1">
                <div className="h-2 bg-red-500 rounded" style={{width: '100%'}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between">
                <span>Average Size</span>
                <span>{zoningData.housing.avgSize} SF</span>
              </div>
              <div className="h-2 bg-gray-700 rounded mt-1">
                <div className="h-2 bg-red-500 rounded" style={{width: '85%'}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between">
                <span>Height Used</span>
                <span>{zoningData.height.utilized}%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded mt-1">
                <div className="h-2 bg-red-500 rounded" style={{width: `${zoningData.height.utilized}%`}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-gray-800 p-4 rounded">
        <h4 className="text-sm text-gray-400 mb-4">Approval Timeline</h4>
        <div className="flex justify-between">
          {zoningData.timeline.map((phase, index) => (
            <div key={phase.phase} className="flex flex-col items-center">
              <div className="text-sm text-gray-400">{phase.phase}</div>
              <div className="text-xl font-bold">{phase.duration}mo</div>
              {index < zoningData.timeline.length - 1 && (
                <div className="h-0.5 w-full bg-red-500 mt-2"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Policy Metrics Section */}
      <div className="bg-black text-white p-0 mt-4 rounded-lg">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 p-4 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Parking Ratio</span>
              <Car className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">0.8:1</div>
            <div className="text-sm text-gray-400">120 spaces / 150 units</div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Tax Benefits</span>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold">$24.2M</div>
            <div className="text-sm text-green-500">$75.6/SF Savings</div>
          </div>

          <div className="bg-gray-800 p-4 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Abatement Value</span>
              <Building className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-2xl font-bold">$4.5M</div>
            <div className="text-sm text-gray-400">5-Year Total</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800 p-4 rounded">
            <h4 className="text-sm text-gray-400 mb-4">Parking Comparison</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={parkingData.comparables}>
                  <XAxis dataKey="property" />
                  <YAxis domain={[0, 1.2]} />
                  <Tooltip />
                  <Bar dataKey="ratio" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded">
            <h4 className="text-sm text-gray-400 mb-4">Tax Incentive Stack</h4>
            <div className="space-y-3">
              {taxData.incentives.map(incentive => (
                <div key={incentive.program} className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{incentive.program}</div>
                    <div className="text-sm text-gray-400">{incentive.timeline}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${(incentive.value/1000000).toFixed(1)}M</div>
                    <div className="text-sm text-gray-400">{incentive.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 bg-gray-800 p-4 rounded">
          <h4 className="text-sm text-gray-400 mb-4">Tax Abatement Schedule</h4>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taxData.abatements}>
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip 
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    return (
                      <div className="bg-gray-900 p-3 rounded border border-gray-700">
                        <div className="text-sm">
                          <div>Year: {payload[0].payload.year}</div>
                          <div>Amount: ${(payload[0].payload.amount/1000).toFixed(0)}k</div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="amount" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ZoningView;

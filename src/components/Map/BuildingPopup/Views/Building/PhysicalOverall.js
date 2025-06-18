import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Ruler, Maximize2, Square, AlertTriangle } from 'lucide-react';

const PhysicalOverall = () => {
  const physicalData = [
    {
      metric: 'Floor Depth',
      actual: 42,
      target: 45,
      score: 93,
      impact: 'Optimal for unit layouts',
      icon: Square
    },
    {
      metric: 'Window Line',
      actual: 95,
      target: 85,
      score: 112,
      impact: '168 windows, excellent light',
      icon: Maximize2
    },
    {
      metric: 'Ceiling Height',
      actual: 12.2,
      target: 11.5,
      score: 106,
      impact: 'Above minimum requirement',
      icon: Ruler
    }
  ];

  const unitMixData = [
    { 
      name: 'Studio', 
      units: 12, 
      size: 500, 
      revenuePerSF: 3.6, 
      spaceEfficiency: 85, 
      layoutScore: 90 
    },
    { 
      name: '1 Bed', 
      units: 24, 
      size: 750, 
      revenuePerSF: 3.8, 
      spaceEfficiency: 80, 
      layoutScore: 88 
    },
    { 
      name: '2 Bed', 
      units: 12, 
      size: 1050, 
      revenuePerSF: 4.0, 
      spaceEfficiency: 82, 
      layoutScore: 92 
    }
  ];

  const physicalRisks = [
    { category: "Window Pattern", status: "Low Risk", score: 90, detail: "Regular grid pattern ideal for residential" },
    { category: "Floor Plate", status: "Medium Risk", score: 75, detail: "Some structural modifications needed" },
    { category: "Building Systems", status: "High Risk", score: 60, detail: "Unknown condition, needs assessment" }
  ];

  return (
    <div className="bg-black text-white p-2 mr-1 mt-2 rounded-lg">
      <div className="flex justify-between items-center mt-1">
        <h3 className="text-xl mt-1 font-bold">Physical Conversion Analysis</h3>

      </div>
      <div className="text-xs text-gray-400 mt-0 mb-6">
          Building Size: 30,000 sq ft | Stories: 7
        </div>


      <div className="grid grid-cols-3 gap-2 mb-6">
        {physicalData.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.metric} className="bg-gray-800 p-4 rounded">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Icon className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-gray-400">{item.metric}</span>
                </div>
                <span className={`text-sm px-2 py-1 rounded ${
                  item.score > 100 ? 'bg-green-500/20 text-green-500' : 
                  item.score > 80 ? 'bg-blue-500/20 text-blue-500' : 
                  'bg-red-500/20 text-red-500'
                }`}>
                  {item.score}%
                </span>
              </div>
              <div className="text-2xl font-bold mb-1">
                {item.actual}{item.metric === 'Window Line' ? '%' : 'ft'}
              </div>
              <div className="text-sm text-gray-400">
                Target: {item.target}{item.metric === 'Window Line' ? '%' : 'ft'}
              </div>
              <div className="mt-2 text-sm text-gray-300">{item.impact}</div>
            </div>
          );
        })}
      </div>

      {/* Unit Mix Optimization Section */}
      <div className="bg-gray-800 p-4 rounded mb-6">
        <h4 className="text-sm text-gray-400 mb-4">Unit Mix Optimization</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={unitMixData}>
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" domain={[0, 30]} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
              <Tooltip 
                content={({ payload, label }) => {
                  if (!payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-gray-900 p-3 rounded border border-gray-700">
                      <div className="font-bold mb-2">{label}</div>
                      <div className="text-sm">
                        Size: {data.size} SF<br />
                        Revenue/SF: ${data.revenuePerSF}<br />
                        Space Efficiency: {data.spaceEfficiency}%<br />
                        Layout Score: {data.layoutScore}%
                      </div>
                    </div>
                  );
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="units" fill="#3b82f6" name="Number of Units" />
              <Bar yAxisId="right" dataKey="layoutScore" fill="red" name="Layout Feasibility Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-sm text-gray-300">
          <p>Unit layout scores are crucial for understanding how well each unit type fits within the building's physical constraints. Higher scores indicate better compatibility and potential revenue implications.</p>
        </div>
      </div>

      {/* Physical Risk Assessment Section */}
      <div className="bg-gray-800 p-4 rounded mb-8">
        <h4 className="text-sm text-gray-400 mb-4">Physical Risk Assessment</h4>
        <div className="space-y-4">
          {physicalRisks.map((risk) => (
            <div key={risk.category} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className={`w-4 h-4 ${
                    risk.score >= 80 ? 'text-green-500' :
                    risk.score >= 70 ? 'text-yellow-500' :
                    'text-red-500'
                  }`} />
                  <span className="font-medium">{risk.category}</span>
                </div>
                <div className="text-sm text-gray-400 mt-1">{risk.detail}</div>
              </div>
              <div className="w-24 h-2 bg-gray-700 rounded ml-4">
                <div 
                  className={`h-full rounded ${
                    risk.score >= 80 ? 'bg-green-500' :
                    risk.score >= 70 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${risk.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded">
        <h4 className="text-sm text-gray-400 mb-4">Notable Features</h4>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="bg-gray-900 p-3 rounded">
            <div className="font-medium">Ground-level Entry</div>
            <div className="text-gray-400 mt-1">Arched entryway design</div>
          </div>
          <div className="bg-gray-900 p-3 rounded">
            <div className="font-medium">Facade</div>
            <div className="text-gray-400 mt-1">Glass curtain walls + brick</div>
          </div>
          <div className="bg-gray-900 p-3 rounded">
            <div className="font-medium">Balconies</div>
            <div className="text-gray-400 mt-1">Concrete, structurally sound</div>
          </div>
          <div className="bg-gray-900 p-3 rounded">
            <div className="font-medium">Rooftop</div>
            <div className="text-gray-400 mt-1">Amenity potential, trees</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhysicalOverall;

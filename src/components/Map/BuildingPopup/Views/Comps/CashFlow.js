import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, ChevronUp, ChevronDown, Wifi, Zap, Thermometer, Building, ChevronRight } from 'lucide-react';

// Add InfoTooltip component at the top level
const InfoTooltip = ({ content }) => (
  <div className="group relative inline-block ml-1">
    <div className="cursor-help text-gray-400 hover:text-gray-300">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-sm text-gray-100 rounded-md absolute z-50 px-4 py-2 w-64 bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 pointer-events-none">
      {content}
      <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
        <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
      </svg>
    </div>
  </div>
);

const BenchmarkCard = ({ data }) => {
  const benchmarks = {
    power: {
      utilityRate: {
        value: data.power.utilityRate,
        benchmark: 0.13,
        label: "Utility Rate",
        unit: "$/kWh",
        context: "vs DC Commercial Avg",
        status: data.power.utilityRate < 0.13 ? "positive" : "negative"
      },
      reliability: {
        value: data.power.reliabilityScore,
        benchmark: 7.5,
        label: "Grid Reliability",
        unit: "/10",
        context: "Top Quartile for DC Metro",
        status: data.power.reliabilityScore > 7.5 ? "positive" : "negative"
      }
    },
    connectivity: {
      carriers: {
        value: data.connectivity.clecsOnNet.length,
        benchmark: 2,
        label: "Carrier Count",
        context: "vs Market Average",
        status: data.connectivity.clecsOnNet.length > 2 ? "positive" : "negative"
      },
      ixpDistance: {
        value: data.connectivity.peeringDb.ixpDistance,
        benchmark: 2.0,
        label: "IXP Distance",
        unit: "mi",
        context: "vs Regional Average",
        status: data.connectivity.peeringDb.ixpDistance < 2.0 ? "positive" : "negative"
      }
    }
  };

  const getStatusColor = (status) => {
    return status === "positive" ? "text-green-400" : "text-red-400";
  };

  const getStatusIcon = (status) => {
    return status === "positive" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  const renderBenchmarkItem = (item) => (
    <div className="bg-gray-800 p-3 rounded-lg">
      <div className="text-sm text-gray-400 mb-1">{item.label}</div>
      <div className="flex items-center justify-between">
        <div className="text-lg font-medium">
          {item.value}{item.unit || ''}
        </div>
        <div className={`flex items-center gap-1 ${getStatusColor(item.status)}`}>
          {getStatusIcon(item.status)}
          <span className="text-sm">{item.benchmark}{item.unit || ''}</span>
        </div>
      </div>
      <div className="text-xs text-gray-500 mt-1">{item.context}</div>
    </div>
  );

  return (
    <div className="bg-gray-900 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-blue-400" />
        Market Benchmarks
        <InfoTooltip content="Comparison against market averages and standards" />
      </h3>
      
      <div className="space-y-4">
        {/* Power Metrics */}
        <div>
          <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Power Metrics
          </div>
          <div className="grid grid-cols-2 gap-3">
            {renderBenchmarkItem(benchmarks.power.utilityRate)}
            {renderBenchmarkItem(benchmarks.power.reliability)}
          </div>
        </div>

        {/* Connectivity Metrics */}
        <div>
          <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
            <Wifi className="w-4 h-4" /> Connectivity Metrics
          </div>
          <div className="grid grid-cols-2 gap-3">
            {renderBenchmarkItem(benchmarks.connectivity.carriers)}
            {renderBenchmarkItem(benchmarks.connectivity.ixpDistance)}
          </div>
        </div>
      </div>
    </div>
  );
};

const DCFAnalysis = ({ onCogentClick, cogentActive, buildingData }) => {
  console.log('DCFAnalysis props:', { 
    onCogentClick: !!onCogentClick, 
    cogentActive,
    buildingType: buildingData?.snapshot?.propertyType 
  });

  // Add error handling for missing data
  if (!buildingData || !buildingData.snapshot) {
    console.error('Missing building data:', buildingData);
    return <div>Loading...</div>;
  }

  const cashflows = {
    development: {
      Q1_2024: { costs: -28500000, revenue: 0, milestones: 'Demo/Abatement' },
      Q2_2024: { costs: -32000000, revenue: 0, milestones: 'Core/Shell Start' },
      Q3_2024: { costs: -35000000, revenue: 0, milestones: 'MEP Rough' },
      Q4_2024: { costs: -38000000, revenue: 0, milestones: 'Window Wall' }
    },
    conversion: {
      Q1_2025: { costs: -22000000, revenue: 0, milestones: 'Interior Build' },
      Q2_2025: { costs: -18000000, revenue: 0, milestones: 'Unit Finishes' },
      Q3_2025: { costs: -12000000, revenue: 450000, milestones: 'TCO Floor 2-6' },
      Q4_2025: { costs: -8000000, revenue: 850000, milestones: 'TCO Floor 7-12' }
    },
    stabilization: {
      Q1_2026: { costs: -2000000, revenue: 1850000, occupancy: 45, absorption: 35 },
      Q2_2026: { costs: -1200000, revenue: 2750000, occupancy: 65, absorption: 25 },
      Q3_2026: { costs: -800000, revenue: 3450000, occupancy: 82, absorption: 18 },
      Q4_2026: { costs: -500000, revenue: 3950000, occupancy: 92, absorption: 12 }
    },
    stabilized: {
      Q1_2027: { revenue: 4250000, opex: -1200000, noi: 3050000 },
      Q2_2027: { revenue: 4300000, opex: -1225000, noi: 3075000 },
      Q3_2027: { revenue: 4350000, opex: -1250000, noi: 3100000 },
      Q4_2027: { revenue: 4400000, opex: -1275000, noi: 3125000 }
    }
  };

  const quarterlyMetrics = [
    ...Object.entries(cashflows.development).map(([quarter, data]) => ({
      quarter,
      costs: data.costs,
      revenue: data.revenue,
      netCashflow: data.revenue + data.costs,
      milestone: data.milestones,
      phase: 'Development'
    })),
    ...Object.entries(cashflows.conversion).map(([quarter, data]) => ({
      quarter,
      costs: data.costs,
      revenue: data.revenue,
      netCashflow: data.revenue + data.costs,
      milestone: data.milestones,
      phase: 'Conversion'
    })),
    ...Object.entries(cashflows.stabilization).map(([quarter, data]) => ({
      quarter,
      costs: data.costs,
      revenue: data.revenue,
      netCashflow: data.revenue + data.costs,
      occupancy: data.occupancy,
      absorption: data.absorption,
      phase: 'Stabilization'
    })),
    ...Object.entries(cashflows.stabilized).map(([quarter, data]) => ({
      quarter,
      costs: -data.opex,
      revenue: data.revenue,
      netCashflow: data.noi,
      phase: 'Stabilized'
    }))
  ];
  const MetricCard = ({ title, value, subValue, trend }) => (
    <div className="bg-gray-900 p-3 rounded-lg">
      <div className="text-sm text-gray-400 mb-3">{title}</div>
      
      <div className="text-lg font-bold mb-2">{value}</div>
      
      <div className="flex flex-col">
        {subValue && (
          <div className="text-sm text-gray-500 mb-1">{subValue}</div>
        )}
        {trend && (
          <div className={`flex items-center ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trend > 0 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span className="text-sm ml-1">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    </div>
  );

  // Enhanced BuildingSnapshot component with better information hierarchy
  const BuildingSnapshot = ({ data }) => (
    <div className="bg-gray-900 p-4 rounded-lg mb-4">
      <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
        <Building className="w-5 h-5 text-blue-400" />
        Building Snapshot
        <InfoTooltip content="Key building characteristics and specifications" />
      </h3>

      <div className="space-y-4">
        {/* Property Details */}
        <div>
          <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Property Details
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800 p-3 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Property Type</div>
              <div className="flex items-baseline gap-3">
                <div className="text-xl font-medium text-white">Office</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white">(Class</span>
                  <span className="text-blue-400 font-medium">B</span>
                  <span className="text-sm text-white">)</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 p-3 rounded-lg">
              <div className="text-sm text-gray-400">Total Area</div>
              <div className="text-lg font-medium mt-1 flex items-center gap-2">
                {data.totalArea}
                <InfoTooltip content="Rentable square footage" />
              </div>
            </div>
          </div>
        </div>

        {/* Building Specs */}
        <div>
          <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
            <Building className="w-4 h-4" /> Building Specs
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800 p-3 rounded-lg">
              <div className="text-sm text-gray-400">Floors</div>
              <div className="text-lg font-medium mt-1">
                {data.floors} Stories
              </div>
            </div>
            <div className="bg-gray-800 p-3 rounded-lg">
              <div className="text-sm text-gray-400">Zoning</div>
              <div className="text-lg font-medium mt-1 flex items-center gap-2">
                {data.zoning}
                <InfoTooltip content="Commercial zoning classification" />
              </div>
            </div>
          </div>
        </div>

        {/* Ownership */}
        <div>
          <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Ownership
          </div>
          <div className="bg-gray-800 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400">Current Owner</div>
                <div className="text-lg font-medium mt-1">{data.owner}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 px-2 py-1 bg-gray-700 rounded">
                  Since 2021
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Location Details */}
        <div>
          <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
            <Building className="w-4 h-4" /> Location
          </div>
          <div className="bg-gray-800 p-3 rounded-lg">
            <div className="text-sm text-gray-400">Address</div>
            <div className="text-lg font-medium mt-1">{data.address}</div>
            <div className="text-xs text-gray-500 mt-1">Washington, DC Metro Area</div>
          </div>
        </div>
      </div>
    </div>
  );

  // Enhanced ConnectivityIndicators with tooltips and context
  const ConnectivityIndicators = ({ data, onCogentClick, cogentActive }) => {
    const tooltips = {
      clecs: "Multiple carriers provide redundancy and competitive pricing options",
      peering: "Proximity to Internet Exchange Points reduces latency and transit costs",
      ixp: "DC-IX is a major regional exchange point with 100+ participants",
      fiber: "Gigabit fiber enables high-bandwidth, low-latency connectivity",
      dsl: "DSL provides backup connectivity option",
      cable: "Cable offers additional redundancy path",
      litStatus: "Direct fiber connection to carrier backbone network"
    };

    const handleCLECClick = (clec) => {
      console.log('CLEC clicked:', clec);
      if (clec === 'Cogent') {
        console.log('Cogent clicked, calling onCogentClick');
        onCogentClick && onCogentClick();
      }
    };

    return (
      <div className="space-y-4">
        {/* Header Card */}
        <div className="bg-gray-900 p-4 rounded-lg">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Wifi className="w-5 h-5 text-green-400" />
            Connectivity Overview
            <InfoTooltip content="Overview of building's network infrastructure" />
          </h3>
        </div>

        {/* CLECs Card */}
        <div className="bg-gray-900 p-4 rounded-lg">
          <div className="text-green-400 font-medium mb-3 flex items-center">
            CLECs On-Net
            <InfoTooltip content={tooltips.clecs} />
          </div>
          <div className="space-y-2">
            {data.clecsOnNet.map(clec => (
              <div 
                key={clec.name} 
                className="flex items-center justify-between p-2 bg-gray-800 rounded"
                onClick={() => handleCLECClick(clec.name)}
                style={{
                  cursor: clec.name === 'Cogent' ? 'pointer' : 'default',
                  backgroundColor: clec.name === 'Cogent' && cogentActive 
                    ? 'rgba(76, 175, 80, 0.2)' 
                    : 'rgba(40, 44, 52, 0.6)',
                  transition: 'background-color 0.3s'
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-white">{clec.name}</span>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  clec.type === 'Tier 1' ? 'bg-green-900 text-green-400' :
                  clec.type === 'Dark Fiber' ? 'bg-purple-900 text-purple-400' :
                  'bg-blue-900 text-blue-400'
                }`}>
                  {clec.type}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm text-gray-400">
            Carrier Diversity: {data.clecsOnNet.length} unique providers
          </div>
        </div>

        {/* PeeringDB Card */}
        <div className="bg-gray-900 p-4 rounded-lg">
          <div className="text-blue-400 font-medium mb-3 flex items-center">
            PeeringDB Facility
            <InfoTooltip content={tooltips.peering} />
          </div>
          <div className="space-y-3">
            <div className="p-2 bg-gray-800 rounded flex items-center justify-between">
              <span className="text-white">{data.peeringDb.facility}</span>
              <span className="text-blue-400">DcNet-1</span>
            </div>
            <div className="p-2 bg-gray-800 rounded flex items-center justify-between">
              <span className="text-gray-400">IXP Proximity</span>
              <div className="flex items-center gap-2">
                <span className="text-white">{data.peeringDb.ixpDistance} mi</span>
                <span className="text-green-400 text-xs">(Excellent)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Broadband Coverage Card */}
        <div className="bg-gray-900 p-4 rounded-lg">
          <div className="text-yellow-400 font-medium mb-3 flex items-center">
            FCC Broadband Coverage
            <InfoTooltip content="Available service types from registered providers" />
          </div>
          <div className="space-y-2">
            <div className="p-2 bg-gray-800 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-white">Fiber (Gigabit)</span>
                <InfoTooltip content={tooltips.fiber} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-medium">{data.broadbandProviders.fiber}</span>
                <span className="text-green-400 text-xs">(Primary)</span>
              </div>
            </div>
            <div className="p-2 bg-gray-800 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-white">DSL</span>
                <InfoTooltip content={tooltips.dsl} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-medium">{data.broadbandProviders.dsl}</span>
                <span className="text-blue-400 text-xs">(Backup)</span>
              </div>
            </div>
            <div className="p-2 bg-gray-800 rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-white">Cable</span>
                <InfoTooltip content={tooltips.cable} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-medium">{data.broadbandProviders.cable}</span>
                <span className="text-blue-400 text-xs">(Backup)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lit Building Status Card */}
        <div className="bg-gray-900 p-4 rounded-lg">
          <div className="text-purple-400 font-medium mb-3 flex items-center">
            Lit Building Status
            <InfoTooltip content={tooltips.litStatus} />
          </div>
          <div className="p-3 bg-gray-800 rounded flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${data.litBuilding ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-white">
              {data.litBuilding ? 'Confirmed fiber lateral' : 'No fiber lateral'}
            </span>
            <span className={`text-xs ${data.litBuilding ? 'text-green-400' : 'text-yellow-400'}`}>
              {data.litBuilding ? '(Ready)' : '(Construction required)'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Enhanced PowerInfrastructure component with context
  const PowerInfrastructure = ({ data }) => (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="bg-gray-900 p-4 rounded-lg">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Power & Infrastructure
        </h3>
      </div>

      {/* Substation & Grid Reliability Card */}
      <div className="bg-gray-900 p-4 rounded-lg grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-400">
            Nearest Substation
            <InfoTooltip content="Distance to nearest power substation" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-medium">{data.substationDistance} mi</span>
            <span className="text-green-400">(Optimal)</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-400">
            Grid Reliability
            <InfoTooltip content="Power grid reliability score" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-medium">{data.reliabilityScore}/10</span>
            <span className="text-green-400">(Top 25%)</span>
          </div>
        </div>
      </div>

      {/* Utility Rate & Backup Power Card */}
      <div className="bg-gray-900 p-4 rounded-lg grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-400">
            Utility Rate
            <InfoTooltip content="Current commercial electricity rate" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-medium">${data.utilityRate}/kWh</span>
            <span className="text-green-400">(Below Avg)</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-400">
            Backup Power
            <InfoTooltip content="Backup power generation status" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-medium text-yellow-400">Not</span>
            <div className="flex flex-col">
              <span className="text-2xl font-medium text-yellow-400">installed</span>
              <span className="text-sm text-gray-400">(Site suitable)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-black text-white p-3 rounded-lg">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Building Analysis</h2>
          <p className="text-gray-400">{buildingData.snapshot.address}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Total Area</div>
          <div className="text-xl font-bold text-blue-400">{buildingData.snapshot.totalArea}</div>
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. Building Snapshot */}
        <BuildingSnapshot data={buildingData.snapshot} />
        
        {/* Benchmarks (New Section) */}
        <BenchmarkCard data={buildingData} />
        
        {/* 2. Connectivity Indicators */}
        <ConnectivityIndicators 
          data={buildingData.connectivity}
          onCogentClick={onCogentClick}
          cogentActive={cogentActive}
        />
        
        {/* 3. Power Infrastructure */}
        <PowerInfrastructure data={buildingData.power} />
        
        {/* 4. Environmental Performance */}
        <div className="bg-gray-900 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-green-400" />
            Environmental & Cooling
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-3">
              <div>
                <div className="text-gray-400 text-sm">Average Temperature</div>
                <div className="text-lg font-medium">{buildingData.environmental.avgTemp}°F</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Humidity</div>
                <div className="text-lg font-medium">{buildingData.environmental.humidity}</div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-gray-400 text-sm">Cooling Potential</div>
                <div className="text-lg font-medium">
                  {buildingData.environmental.coolingPotential ? "Available" : "Limited"}
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Restrictions</div>
                <div className="text-lg font-medium">{buildingData.environmental.restrictions}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Scorecard */}
        <div className="bg-gray-900 p-4 rounded-lg">
          <h3 className="text-lg font-medium mb-4">Overall Suitability Score</h3>
          <div className="space-y-4">
            {Object.entries(buildingData.scores).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 capitalize">{key}</span>
                  <span className="font-medium">{value}/10</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      key === 'overall' ? 'bg-blue-500' : 
                      key === 'connectivity' ? 'bg-green-500' :
                      key === 'power' ? 'bg-yellow-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${value * 10}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6. Financial Analysis Section */}
        <div className="border-t border-gray-800 pt-6 mt-6">
          <h2 className="text-2xl font-bold mb-6">Financial Analysis</h2>
          {/* ... rest of the financial analysis content ... */}
        </div>
      </div>
    </div>
  );
};

export default DCFAnalysis;

import React, { useState } from 'react';
import { Square, Maximize2, Users, Home, Ruler, DollarSign, Layout, Grid } from 'lucide-react';

const FloorPlanAnalysis = () => {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showDimensions, setShowDimensions] = useState(true);

  // Building dimensions
  const dims = {
    width: 220,
    depth: 120,
    coreWidth: 50,
    coreDepth: 35,
    corridorWidth: 5.5,
    padding: 10
  };

  // Unit types with corrected dimensions
  const units = {
    microStudio: {
      width: 18,
      depth: 30,
      area: 400,
      type: "Micro",
      color: "#818cf8",
      exposure: "Single",
      windows: 2,
      rent: 1800,
      efficiency: 92
    },
    studioA: {
      width: 20,
      depth: 30,
      area: 480,
      type: "Studio",
      color: "#3b82f6",
      exposure: "Single",
      windows: 2,
      rent: 2000,
      efficiency: 90
    },
    studioB: {
      width: 22,
      depth: 30,
      area: 520,
      type: "Studio+",
      color: "#2563eb",
      exposure: "Single",
      windows: 3,
      rent: 2200,
      efficiency: 88
    },
    oneBedA: {
      width: 28,
      depth: 30,
      area: 650,
      type: "1 Bed",
      color: "#22c55e",
      exposure: "Single",
      windows: 3,
      rent: 2500,
      efficiency: 85
    },
    oneBedB: {
      width: 30,
      depth: 35,
      area: 750,
      type: "1 Bed+",
      color: "#16a34a",
      exposure: "Corner",
      windows: 4,
      rent: 2800,
      efficiency: 84
    },
    twoBed: {
      width: 36,
      depth: 35,
      area: 950,
      type: "2 Bed",
      color: "#ef4444",
      exposure: "Corner",
      windows: 5,
      rent: 3500,
      efficiency: 82
    }
  };

  // Detail panel data based on selection
  const getDetailsContent = () => {
    if (!selectedUnit) {
      return {
        title: "Floor Summary",
        icon: Layout,
        color: "text-blue-500",
        stats: [
          { label: "Total Units", value: "17" },
          { label: "Gross Area", value: `${dims.width * dims.depth} SF` },
          { label: "Net Area", value: `${Math.round((dims.width * dims.depth) * 0.82)} SF` },
          { label: "Efficiency", value: "82%" }
        ]
      };
    }

    const unit = units[selectedUnit];
    return {
      title: `${unit.type} Details`,
      icon: Home,
      color: unit.color,
      stats: [
        { label: "Area", value: `${unit.area} SF` },
        { label: "Windows", value: unit.windows },
        { label: "Rent", value: `$${unit.rent}` },
        { label: "$/SF", value: `$${Math.round(unit.rent / unit.area * 100) / 100}` }
      ]
    };
  };

  const renderUnit = (unit, x, y, index) => (
    <g 
      key={`${unit}-${index}`}
      transform={`translate(${x}, ${y})`}
      onClick={() => setSelectedUnit(unit)}
      className="cursor-pointer transition-all duration-200 hover:opacity-80"
    >
      <rect
        width={units[unit].width}
        height={units[unit].depth}
        fill={units[unit].color}
        fillOpacity={selectedUnit === unit ? 0.4 : 0.2}
        stroke={units[unit].color}
        strokeWidth={selectedUnit === unit ? 2 : 1}
      />
      {showDimensions && (
        <>
          <text
            x={units[unit].width / 2}
            y={units[unit].depth / 2}
            textAnchor="middle"
            fill="white"
            fontSize="2.5"
            className="select-none pointer-events-none"
          >
            {units[unit].type}
          </text>
          <text
            x={units[unit].width / 2}
            y={units[unit].depth / 2 + 3.5}
            textAnchor="middle"
            fill="white"
            fontSize="2"
            className="select-none pointer-events-none"
          >
            {units[unit].area} SF
          </text>
        </>
      )}
      {[...Array(units[unit].windows)].map((_, i) => (
        <rect
          key={`window-${unit}-${index}-${i}`}
          x={i * (units[unit].width / units[unit].windows)}
          y={0}
          width={1.5}
          height={1}
          fill="#60a5fa"
          className="pointer-events-none"
        />
      ))}
    </g>
  );

  // Corrected unit positions
  const northWing = [
    { type: 'twoBed', x: 5 },
    { type: 'oneBedA', x: 41 },
    { type: 'studioA', x: 69 },
    { type: 'microStudio', x: 89 },
    { type: 'studioB', x: 107 },
    { type: 'oneBedA', x: 129 },
    { type: 'studioA', x: 157 },
    { type: 'oneBedB', x: 179 }
  ];

  const southWing = [
    { type: 'oneBedB', x: 5 },
    { type: 'studioB', x: 35 },
    { type: 'microStudio', x: 57 },
    { type: 'studioA', x: 75 },
    { type: 'oneBedA', x: 95 },
    { type: 'microStudio', x: 123 },
    { type: 'studioA', x: 141 },
    { type: 'studioB', x: 161 },
    { type: 'twoBed', x: 183 }
  ];

  const details = getDetailsContent();

  return (
    <div className="bg-black text-white p-6 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-bold">Typical Floor Plan</h3>
          <p className="text-sm text-gray-400">17 Units Per Floor</p>
        </div>
        <button
          onClick={() => setShowDimensions(!showDimensions)}
          className="text-sm bg-gray-800 px-3 py-1 rounded"
        >
          {showDimensions ? "Hide" : "Show"} Dimensions
        </button>
      </div>

      <div className="bg-gray-800 p-4 rounded mb-4">
        <svg 
          viewBox={`0 0 ${dims.width + dims.padding * 2} ${dims.depth + dims.padding * 2}`}
          className="w-full h-auto"
        >
          {/* Building outline */}
          <rect
            x={dims.padding}
            y={dims.padding}
            width={dims.width}
            height={dims.depth}
            fill="#1f2937"
            stroke="#374151"
            strokeWidth="1"
          />

          {/* Building core */}
          <g transform={`translate(${dims.padding + (dims.width - dims.coreWidth) / 2}, ${dims.padding + (dims.depth - dims.coreDepth) / 2})`}>
            <rect
              width={dims.coreWidth}
              height={dims.coreDepth}
              fill="#4b5563"
              stroke="#374151"
              strokeWidth="1"
            />
            {/* Elevators */}
            {[...Array(4)].map((_, i) => (
              <rect
                key={`elevator-${i}`}
                x={5 + (i * 10)}
                y={5}
                width={8}
                height={10}
                fill="#374151"
              />
            ))}
            {/* Stairs */}
            <rect x={3} y={20} width={12} height={12} fill="#374151" />
            <rect x={dims.coreWidth - 15} y={20} width={12} height={12} fill="#374151" />
            {/* MEP */}
            <rect x={dims.coreWidth/2 - 8} y={3} width={16} height={8} fill="#374151" />
          </g>

          {/* Corridor */}
          <rect
            x={dims.padding}
            y={dims.padding + (dims.depth - dims.corridorWidth) / 2}
            width={dims.width}
            height={dims.corridorWidth}
            fill="#374151"
          />

          {/* Units */}
          <g transform={`translate(${dims.padding}, 0)`}>
            {/* North wing */}
            {northWing.map((unit, i) => (
              renderUnit(unit.type, unit.x, dims.padding + 5, i)
            ))}
            {/* South wing */}
            {southWing.map((unit, i) => (
              renderUnit(unit.type, unit.x, dims.padding + dims.depth - units[unit.type].depth - 5, i)
            ))}
          </g>

          {/* Dimensions */}
          {showDimensions && (
            <>
              <text
                x={dims.padding + dims.width / 2}
                y={dims.padding - 5}
                textAnchor="middle"
                fill="white"
                fontSize="4"
              >
                {dims.width}'
              </text>
              <text
                x={dims.padding - 5}
                y={dims.padding + dims.depth / 2}
                textAnchor="middle"
                fill="white"
                fontSize="4"
                transform={`rotate(-90 ${dims.padding - 5} ${dims.padding + dims.depth / 2})`}
              >
                {dims.depth}'
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Details Panel */}
      <div className="bg-gray-800 p-4 rounded">
        <div className="flex items-center gap-3 mb-4">
          <details.icon className={`w-5 h-5 ${details.color}`} />
          <h4 className="text-sm font-bold">{details.title}</h4>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {details.stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-gray-400 text-xs mb-1">{stat.label}</div>
              <div className="text-lg font-bold">{stat.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FloorPlanAnalysis;
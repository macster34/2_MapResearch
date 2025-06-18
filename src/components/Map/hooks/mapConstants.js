// Power grid locations for DC area
export const POWER_GRID_LOCATIONS = [
  // Main power stations and substations
  {
    coordinates: [-77.0214, 38.8921],
    strength: 1.0,
    name: "Department of Energy",
    type: "main_station"
  },
  {
    coordinates: [-77.0366, 38.8977],
    strength: 0.9,
    name: "White House Complex",
    type: "substation"
  },
  {
    coordinates: [-77.0425, 38.9079],
    strength: 0.9,
    name: "Dupont Circle Substation",
    type: "substation"
  },
  {
    coordinates: [-77.0319, 38.9145],
    strength: 0.8,
    name: "U Street Distribution",
    type: "distribution"
  },
  {
    coordinates: [-77.0317, 38.9026],
    strength: 0.85,
    name: "K Street Hub",
    type: "distribution"
  },
  {
    coordinates: [-77.0091, 38.8899],
    strength: 0.9,
    name: "Capitol Complex",
    type: "substation"
  },
  {
    coordinates: [-77.0471, 38.9048],
    strength: 0.8,
    name: "Georgetown Station",
    type: "distribution"
  },
  {
    coordinates: [-77.0233, 38.9048],
    strength: 0.75,
    name: "Shaw Distribution",
    type: "distribution"
  }
];

// Major corridors and road network for DC
export const MAIN_CORRIDORS = [
    // Major Circles/Roundabouts
    // Dupont Circle
    {
        start: [-77.0434, 38.9097],
        end: [-77.0434, 38.9086],
        density: 40
    },
    {
        start: [-77.0434, 38.9086],
        end: [-77.0425, 38.9090],
        density: 40
    },
    {
        start: [-77.0425, 38.9090],
        end: [-77.0434, 38.9097],
        density: 40
    },

    // Logan Circle
    {
        start: [-77.0319, 38.9097],
        end: [-77.0319, 38.9086],
        density: 35
    },
    {
        start: [-77.0319, 38.9086],
        end: [-77.0309, 38.9090],
        density: 35
    },
    {
        start: [-77.0309, 38.9090],
        end: [-77.0319, 38.9097],
        density: 35
    },

    // Major East-West Arteries
    {
        start: [-77.0501, 38.9026],
        end: [-77.0366, 38.9026],
        density: 80
    },
    {
        start: [-77.0366, 38.9026],
        end: [-77.0209, 38.9026],
        density: 80
    },
    {
        start: [-77.0209, 38.9026],
        end: [-77.0120, 38.9026],
        density: 80
    },

    // Pennsylvania Avenue
    {
        start: [-77.0501, 38.8977],
        end: [-77.0366, 38.8977],
        density: 85
    },
    {
        start: [-77.0366, 38.8977],
        end: [-77.0209, 38.8977],
        density: 85
    },
    {
        start: [-77.0209, 38.8977],
        end: [-77.0120, 38.8977],
        density: 85
    },

    // Massachusetts Avenue
    {
        start: [-77.0501, 38.9091],
        end: [-77.0425, 38.9075],
        density: 75
    },
    {
        start: [-77.0425, 38.9075],
        end: [-77.0317, 38.9048],
        density: 75
    },
    {
        start: [-77.0317, 38.9048],
        end: [-77.0209, 38.9026],
        density: 75
    },

    // Connecticut Avenue
    {
        start: [-77.0425, 38.9145],
        end: [-77.0434, 38.9097],
        density: 70
    },
    {
        start: [-77.0434, 38.9097],
        end: [-77.0366, 38.8977],
        density: 70
    },

    // 16th Street
    {
        start: [-77.0317, 38.9145],
        end: [-77.0317, 38.9097],
        density: 65
    },
    {
        start: [-77.0317, 38.9097],
        end: [-77.0317, 38.8977],
        density: 65
    },

    // 14th Street
    {
        start: [-77.0366, 38.9145],
        end: [-77.0366, 38.9026],
        density: 60
    },
    {
        start: [-77.0366, 38.9026],
        end: [-77.0366, 38.8977],
        density: 60
    },

    // Thomas Circle
    {
        start: [-77.0366, 38.9048],
        end: [-77.0366, 38.9038],
        density: 30
    },
    {
        start: [-77.0366, 38.9038],
        end: [-77.0356, 38.9043],
        density: 30
    },
    {
        start: [-77.0356, 38.9043],
        end: [-77.0366, 38.9048],
        density: 30
    }
];

// Add these new constants for building colors
export const BUILDING_COLORS = {
    DARK_GRAY: '#1a1a1a',    // Default buildings
    DARK_RED: '#380614',     // Negative performance
    BRIGHT_GREEN: '#51ff00', // High-performing buildings
    YELLOW_FAR: '#8B7355',   // Power grid buildings (far from green)
    YELLOW_MID: '#DAA520',   // Power grid buildings (medium distance)
    YELLOW_CLOSE: '#f7db05'  // Power grid buildings (close to green)
};

// Map configuration constants
export const MAP_CONFIG = {
    MIN_ZOOM: 13,
    FRAME_SKIP: 2,
    THROTTLE_TIME: 50,
    TOTAL_SCALE: 0.006,
    BUILDING_POWER_GRID_RADIUS: 0.002  // Distance threshold for power grid influence
};

// Add logging for power grid initialization
export const initializePowerGridConstants = () => {
    console.log('⚡ Initializing power grid constants...');
    return {
        MIN_ZOOM: 13,
        FRAME_SKIP: 2,
        THROTTLE_TIME: 50,
        TOTAL_SCALE: 0.006,
        BUILDING_POWER_GRID_RADIUS: 0.002
    };
};

// Add state tracking
export const ANIMATION_STATES = {
    GEOID: 'geoid',
    POWER_GRID: 'power_grid',
    NONE: 'none'
};

console.log('🔌 Map constants loaded');

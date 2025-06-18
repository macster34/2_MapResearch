// Define a more comprehensive DC grid network that follows actual roads
export const DC_GRID_NETWORK = {
  primaryLines: [
    // Major East-West power corridors
    {
      name: 'K Street Main',
      coordinates: [
        [-77.0501, 38.9026], // K St & 23rd
        [-77.0431, 38.9026], // K St & 21st
        [-77.0317, 38.9026], // K St & 16th
        [-77.0209, 38.9026], // K St & 11th
        [-77.0120, 38.9026]  // K St & North Capitol
      ],
      strength: 1.0
    },
    {
      name: 'M Street',
      coordinates: [
        [-77.0501, 38.9048], // M St & 23rd
        [-77.0425, 38.9048], // M St & Connecticut
        [-77.0317, 38.9048], // M St & 16th
        [-77.0209, 38.9048], // M St & 11th
        [-77.0120, 38.9048]  // M St & North Capitol
      ],
      strength: 0.9
    }
  ],
  secondaryLines: [
    // North-South Corridors
    {
      name: '16th Street',
      coordinates: [
        [-77.0317, 38.9145], // 16th & U
        [-77.0317, 38.9079], // 16th & Mass
        [-77.0317, 38.9048], // 16th & M
        [-77.0317, 38.9026], // 16th & K
        [-77.0317, 38.8977]  // 16th & Penn
      ],
      strength: 0.8
    },
    {
      name: '11th Street',
      coordinates: [
        [-77.0209, 38.9145], // 11th & U
        [-77.0209, 38.9048], // 11th & M
        [-77.0209, 38.9026], // 11th & K
        [-77.0209, 38.8977]  // 11th & Penn
      ],
      strength: 0.8
    }
  ],
  tertiaryLines: [
    // Diagonal Avenues
    {
      name: 'Connecticut Ave',
      coordinates: [
        [-77.0425, 38.9145], // Conn & Florida
        [-77.0425, 38.9079], // Dupont Circle
        [-77.0390, 38.9026], // Conn & K
        [-77.0366, 38.8977]  // White House
      ],
      strength: 0.7
    },
    {
      name: 'Vermont Ave',
      coordinates: [
        [-77.0319, 38.9145], // Vermont & U
        [-77.0317, 38.9079], // Vermont & Mass
        [-77.0315, 38.8977]  // McPherson Square
      ],
      strength: 0.6
    }
  ]
};

export const MAIN_CORRIDORS = [
    // Major Circles/Roundabouts (using multiple short segments to create circular paths)
    // Dupont Circle
    {
        start: [-77.0434, 38.9097], // Dupont Circle North
        end: [-77.0434, 38.9086],   // Dupont Circle South
        density: 40
    },
    {
        start: [-77.0434, 38.9086], // Dupont Circle South
        end: [-77.0425, 38.9090],   // Dupont Circle Southeast
        density: 40
    },
    {
        start: [-77.0425, 38.9090], // Dupont Circle Southeast
        end: [-77.0434, 38.9097],   // Dupont Circle North
        density: 40
    },

    // Logan Circle
    {
        start: [-77.0319, 38.9097], // Logan Circle North
        end: [-77.0319, 38.9086],   // Logan Circle South
        density: 35
    },
    {
        start: [-77.0319, 38.9086], // Logan Circle South
        end: [-77.0309, 38.9090],   // Logan Circle Southeast
        density: 35
    },
    {
        start: [-77.0309, 38.9090], // Logan Circle Southeast
        end: [-77.0319, 38.9097],   // Logan Circle North
        density: 35
    },

    // Major East-West Arteries (more precisely aligned)
    {
        start: [-77.0501, 38.9026], // K Street from Georgetown
        end: [-77.0366, 38.9026],   // K Street to 14th
        density: 80
    },
    {
        start: [-77.0366, 38.9026], // K Street from 14th
        end: [-77.0209, 38.9026],   // K Street to 7th
        density: 80
    },
    {
        start: [-77.0209, 38.9026], // K Street from 7th
        end: [-77.0120, 38.9026],   // K Street to Union Station
        density: 80
    },

    // Pennsylvania Avenue (precise segments)
    {
        start: [-77.0501, 38.8977], // Penn Ave from Georgetown
        end: [-77.0366, 38.8977],   // to White House
        density: 85
    },
    {
        start: [-77.0366, 38.8977], // Penn Ave from White House
        end: [-77.0209, 38.8977],   // to Federal Triangle
        density: 85
    },
    {
        start: [-77.0209, 38.8977], // Penn Ave from Federal Triangle
        end: [-77.0120, 38.8977],   // to Capitol
        density: 85
    },

    // Massachusetts Avenue (precise diagonal)
    {
        start: [-77.0501, 38.9091], // Mass Ave from Embassy Row
        end: [-77.0425, 38.9075],   // to Dupont
        density: 75
    },
    {
        start: [-77.0425, 38.9075], // Mass Ave from Dupont
        end: [-77.0317, 38.9048],   // to Mt Vernon Square
        density: 75
    },
    {
        start: [-77.0317, 38.9048], // Mass Ave from Mt Vernon
        end: [-77.0209, 38.9026],   // to Union Station
        density: 75
    },

    // Connecticut Avenue (precise diagonal)
    {
        start: [-77.0425, 38.9145], // Conn Ave from Woodley
        end: [-77.0434, 38.9097],   // to Dupont Circle
        density: 70
    },
    {
        start: [-77.0434, 38.9097], // Conn Ave from Dupont
        end: [-77.0366, 38.8977],   // to White House
        density: 70
    },

    // 16th Street (precise north-south)
    {
        start: [-77.0317, 38.9145], // 16th from Columbia Heights
        end: [-77.0317, 38.9097],   // to Logan Circle
        density: 65
    },
    {
        start: [-77.0317, 38.9097], // 16th from Logan Circle
        end: [-77.0317, 38.8977],   // to White House
        density: 65
    },

    // 14th Street (precise north-south)
    {
        start: [-77.0366, 38.9145], // 14th from Columbia Heights
        end: [-77.0366, 38.9026],   // to Franklin Square
        density: 60
    },
    {
        start: [-77.0366, 38.9026], // 14th from Franklin Square
        end: [-77.0366, 38.8977],   // to Federal Triangle
        density: 60
    },

    // Thomas Circle
    {
        start: [-77.0366, 38.9048], // Thomas Circle North
        end: [-77.0366, 38.9038],   // Thomas Circle South
        density: 30
    },
    {
        start: [-77.0366, 38.9038], // Thomas Circle South
        end: [-77.0356, 38.9043],   // Thomas Circle Southeast
        density: 30
    },
    {
        start: [-77.0356, 38.9043], // Thomas Circle Southeast
        end: [-77.0366, 38.9048],   // Thomas Circle North
        density: 30
    }
]; 
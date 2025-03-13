import React from 'react';
import { Box } from '@mui/material';

const MoleculeViewer = ({ smiles, width = '100%', height = '400px' }) => {
  // Basic SVG representation of a molecule
  // This is a placeholder - in a real application, you would parse the SMILES string
  // and generate the appropriate SVG elements
  return (
    <Box sx={{ width, height, border: '1px solid #ccc', borderRadius: 1, p: 2 }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 400 400"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background */}
        <rect width="100%" height="100%" fill="#1a1a1a" />
        
        {/* Example molecule representation */}
        <circle cx="200" cy="200" r="30" fill="#90caf9" />
        <circle cx="300" cy="200" r="30" fill="#90caf9" />
        <line
          x1="230"
          y1="200"
          x2="270"
          y2="200"
          stroke="#f48fb1"
          strokeWidth="4"
        />
        
        {/* Add text to show SMILES string */}
        <text
          x="200"
          y="350"
          fill="#90caf9"
          textAnchor="middle"
          fontSize="12"
        >
          {smiles}
        </text>
      </svg>
    </Box>
  );
};

export default MoleculeViewer; 
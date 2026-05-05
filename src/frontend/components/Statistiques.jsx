import React from 'react';
import { Box, Frame } from '@forge/react';
import { xcss } from '@forge/react';

const frameBox = xcss({
  height: '800px',
  width: '100%'
});

const Statistiques = ({ missions = [], analyses = [] }) => {
  return (
    <Box xcss={frameBox}>
      <Frame
        resource="stats-frame"
        context={{
          missions: missions || [],
          analyses: analyses || []
        }}
      />
    </Box>
  );
};

export default Statistiques;
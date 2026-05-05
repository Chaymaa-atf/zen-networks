import React, { useEffect } from 'react';
import { Box, Frame } from '@forge/react';
import { xcss } from '@forge/react';
import { events } from '@forge/bridge';

const frameBox = xcss({
  height: '900px',
  width: '100%'
});

const Statistiques = ({ missions = [], analyses = [] }) => {
  useEffect(() => {
    const sendData = async () => {
      await events.emit('STATS_DATA', {
        missions: missions || [],
        analyses: analyses || []
      });
    };

    sendData();

    const timer = setTimeout(sendData, 1000);
    return () => clearTimeout(timer);
  }, [missions, analyses]);

  return (
    <Box xcss={frameBox}>
      <Frame resource="stats-frame" />
    </Box>
  );
};

export default Statistiques;
import React from 'react';
import { Box, Heading, Inline, Stack, Text } from '@forge/react';
import MissionItem from './MissionItem';

const MissionList = ({ missions, loading, onViewDetails }) => {
  if (loading) {
    return <Text>Chargement des missions...</Text>;
  }

  if (missions.length === 0) {
    return <Text>Aucune mission enregistrée.</Text>;
  }

  return (
    <Box>
      <Stack space="space.200">
        <Heading size="medium">Liste des missions</Heading>

        <Inline space="space.200" shouldWrap>
          {missions.map((mission) => (
            <Box key={mission.id} xcss={{ width: '320px' }}>
              <MissionItem
                mission={mission}
                onViewDetails={onViewDetails}
              />
            </Box>
          ))}
        </Inline>
      </Stack>
    </Box>
  );
};

export default MissionList;
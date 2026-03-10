import React from 'react';
import { Box, Heading, Stack, Text } from '@forge/react';
import MissionItem from './MissionItem';

const MissionList = ({ missions, loading }) => {
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

        {missions.map((mission) => (
          <MissionItem key={mission.id} mission={mission} />
        ))}
      </Stack>
    </Box>
  );
};

export default MissionList;
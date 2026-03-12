import React from 'react';
import { Box, Button, Stack, Text } from '@forge/react';

const MissionItem = ({ mission, onViewDetails }) => {
  return (
    <Box
      xcss={{
        border: '1px solid',
        borderColor: 'color.border',
        borderRadius: 'border.radius.200',
        padding: 'space.200',
        backgroundColor: 'elevation.surface',
      }}
    >
      <Stack space="space.100">
        <Button
          appearance="subtle"
          onClick={() => onViewDetails(mission.id)}
        >
          {mission.titre}
        </Button>

        <Text>
          {mission.ville}, {mission.pays}
        </Text>

        <Text>
          {mission.dateDepart} → {mission.dateRetour}
        </Text>

        <Text>Statut : {mission.statut}</Text>
      </Stack>
    </Box>
  );
};

export default MissionItem;
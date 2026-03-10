import React from 'react';
import { Box, Stack, Text } from '@forge/react';

const MissionItem = ({ mission }) => {
  return (
    <Box>
      <Stack space="space.050">
        <Text>Titre : {mission.titre}</Text>
        <Text>Destination : {mission.destination}</Text>
        <Text>Pays : {mission.pays}</Text>
        <Text>Ville : {mission.ville}</Text>
        <Text>Date départ : {mission.dateDepart}</Text>
        <Text>Date retour : {mission.dateRetour}</Text>
        <Text>Motif : {mission.motif}</Text>
        <Text>Statut : {mission.statut}</Text>
        <Text>--------------------------</Text>
      </Stack>
    </Box>
  );
};

export default MissionItem;
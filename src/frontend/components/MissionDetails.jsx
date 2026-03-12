import React from 'react';
import { Box, Button, Heading, Stack, Text } from '@forge/react';

const MissionDetails = ({ mission, onBack }) => {
  if (!mission) {
    return <Text>Aucune mission sélectionnée.</Text>;
  }

  return (
    <Box>
      <Stack space="space.200">
        <Heading size="medium">Détail de la mission</Heading>

        <Text>Titre : {mission.titre}</Text>
        <Text>Destination : {mission.destination}</Text>
        <Text>Pays : {mission.pays}</Text>
        <Text>Ville : {mission.ville}</Text>
        <Text>Date départ : {mission.dateDepart}</Text>
        <Text>Date retour : {mission.dateRetour}</Text>
        <Text>Motif : {mission.motif}</Text>
        <Text>Statut : {mission.statut}</Text>

        <Button appearance="subtle" onClick={onBack}>
          Retour à la liste
        </Button>
      </Stack>
    </Box>
  );
};

export default MissionDetails;
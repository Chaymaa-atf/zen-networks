import React from 'react';
import { Box, Button, Heading, Stack, Text } from '@forge/react';
import { router } from '@forge/bridge';

const MissionDetails = ({ mission, onBack }) => {
  if (!mission) {
    return <Text>Aucune mission sélectionnée.</Text>;
  }

  const openJiraIssue = async () => {
    if (mission.issueKey) {
      await router.open(`/browse/${mission.issueKey}`);
    }
  };

  return (
    <Box>
      <Stack space="space.300">
        <Heading size="medium">Fiche mission</Heading>

        <Box>
          <Stack space="space.100">
            <Text>Titre : {mission.titre}</Text>
            <Text>Destination :{mission.destination}</Text>
            <Text>Pays :{mission.pays}</Text>
            <Text>Ville : {mission.ville}</Text>
            <Text>Date départ : {mission.dateDepart}</Text>
            <Text>Date retour : {mission.dateRetour}</Text>
            <Text>Motif : {mission.motif}</Text>
            <Text>Statut : {mission.statut}</Text>
          </Stack>
        </Box>

        {mission.issueKey && (
          <Box>
            <Stack space="space.100">
              <Text>Ticket Jira :{mission.issueKey}</Text>
              <Button appearance="subtle" onClick={openJiraIssue}>
                Ouvrir le ticket Jira
              </Button>
            </Stack>
          </Box>
        )}

        <Box>
          <Heading size="small">Documents de mission</Heading>
          <Stack space="space.050">
            <Text>Billet avion : Non ajouté</Text>
            <Text>Hôtel : Non ajouté</Text>
            <Text>Scan document : Non ajouté</Text>
          </Stack>

          <Button appearance="primary">
            Ajouter document
          </Button>
        </Box>

        <Button appearance="primary" onClick={onBack}>
          Retour à la liste
        </Button>
      </Stack>
    </Box>
  );
};

export default MissionDetails;
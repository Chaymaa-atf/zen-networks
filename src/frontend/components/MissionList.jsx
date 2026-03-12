import React from 'react';
import { Box, Button, Heading, Inline, Stack, Text } from '@forge/react';

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

        <Box>
          <Stack space="space.150">
            <Inline spread="space-between" alignBlock="center">
              <Text>Titre de mission</Text>
              <Text>Action</Text>
            </Inline>

            <Text>────────────────────────────────────</Text>

            {missions.map((mission) => (
              <Box key={mission.id}>
                <Stack space="space.100">
                  <Inline spread="space-between" alignBlock="center">
                    <Text>{mission.titre}</Text>

                    <Button
                      appearance="subtle"
                      onClick={() => onViewDetails(mission.id)}
                    >
                      Détails
                    </Button>
                  </Inline>

                  <Text>────────────────────────────────────</Text>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};

export default MissionList;
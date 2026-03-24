import React from 'react';
import { Box, Button, Heading, Inline, Stack, Text, Badge, Lozenge } from '@forge/react';
import { xcss } from '@forge/react';

const tableWrapperStyles = xcss({
  borderRadius: 'border.radius.200',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
  overflow: 'hidden',
});

const headerRowStyles = xcss({
  backgroundColor: 'color.background.neutral',
  paddingBlock: 'space.100',
  paddingInline: 'space.200',
  borderBottomWidth: 'border.width',
  borderBottomStyle: 'solid',
  borderBottomColor: 'color.border',
});

const rowStyles = xcss({
  paddingBlock: 'space.150',
  paddingInline: 'space.200',
  borderBottomWidth: 'border.width',
  borderBottomStyle: 'solid',
  borderBottomColor: 'color.border',
  ':hover': {
    backgroundColor: 'color.background.neutral.subtle.hovered',
  },
});

const lastRowStyles = xcss({
  paddingBlock: 'space.150',
  paddingInline: 'space.200',
});

const titleStyles = xcss({
  fontWeight: 'font.weight.semibold',
  color: 'color.text',
});

const subtitleStyles = xcss({
  color: 'color.text.subtlest',
  fontSize: '12px',
});

const getStatusAppearance = (statut) => {
  switch (statut?.toLowerCase()) {
    case 'validée':
    case 'approuvée': return 'success';
    case 'refusée': return 'removed';
    case 'en attente': return 'inprogress';
    default: return 'default';
  }
};

const MissionList = ({ missions = [], loading, onViewDetails, onCreateMission, onDeleteMission }) => {
  if (loading) {
    return (
      <Box xcss={xcss({ padding: 'space.400', textAlign: 'center' })}>
        <Text color="color.text.subtlest">Chargement des missions...</Text>
      </Box>
    );
  }

  return (
    <Stack space="space.300">
      <Inline spread="space-between" alignBlock="center">
        <Stack space="space.050">
          <Heading size="large">Liste Missions</Heading>
          <Text color="color.text.subtlest">
            {missions.length} mission{missions.length !== 1 ? 's' : ''} enregistrée{missions.length !== 1 ? 's' : ''}
          </Text>
        </Stack>
        <Button appearance="primary" onClick={onCreateMission}>
          + Créer une mission
        </Button>
      </Inline>

      {missions.length === 0 ? (
        <Box xcss={xcss({
          padding: 'space.400',
          textAlign: 'center',
          backgroundColor: 'color.background.neutral.subtle',
          borderRadius: 'border.radius.200',
          borderWidth: 'border.width',
          borderStyle: 'solid',
          borderColor: 'color.border',
        })}>
          <Text color="color.text.subtlest">Aucune mission enregistrée.</Text>
        </Box>
      ) : (
        <Box xcss={tableWrapperStyles}>
          {/* Header */}
          <Box xcss={headerRowStyles}>
            <Inline spread="space-between" alignBlock="center">
              <Box xcss={xcss({ flex: '1' })}>
                <Text xcss={subtitleStyles}>TITRE DE MISSION</Text>
              </Box>
              <Box xcss={xcss({ width: '140px' })}>
                <Text xcss={subtitleStyles}>DESTINATION</Text>
              </Box>
              <Box xcss={xcss({ width: '180px' })}>
                <Text xcss={subtitleStyles}>DATES</Text>
              </Box>
              <Box xcss={xcss({ width: '100px' })}>
                <Text xcss={subtitleStyles}>STATUT</Text>
              </Box>
              <Box xcss={xcss({ width: '160px', textAlign: 'right' })}>
                <Text xcss={subtitleStyles}>ACTION</Text>
              </Box>
            </Inline>
          </Box>

          {/* Rows */}
          {missions.map((mission, index) => (
            <Box
              key={mission.id}
              xcss={index === missions.length - 1 ? lastRowStyles : rowStyles}
            >
              <Inline spread="space-between" alignBlock="center">
                <Box xcss={xcss({ flex: '1' })}>
                  <Text xcss={titleStyles}>{mission.titre}</Text>
                </Box>
                <Box xcss={xcss({ width: '140px' })}>
                  <Text color="color.text.subtle">{mission.ville}, {mission.pays}</Text>
                </Box>
                <Box xcss={xcss({ width: '180px' })}>
                  <Text xcss={subtitleStyles}>
                    {mission.dateDepart} → {mission.dateRetour}
                  </Text>
                </Box>
                <Box xcss={xcss({ width: '100px' })}>
                  <Lozenge appearance={getStatusAppearance(mission.statut)}>
                    {mission.statut}
                  </Lozenge>
                </Box>
                <Box xcss={xcss({ width: '160px', textAlign: 'right' })}>
                  <Inline space="space.075" alignBlock="center">
                    <Button appearance="subtle" spacing="compact" onClick={() => onViewDetails(mission.id)}>
                      Détails
                    </Button>
                    <Button appearance="danger" spacing="compact" onClick={() => onDeleteMission && onDeleteMission(mission.id)}>
                      Supprimer
                    </Button>
                  </Inline>
                </Box>
              </Inline>
            </Box>
          ))}
        </Box>
      )}
    </Stack>
  );
};

export default MissionList;
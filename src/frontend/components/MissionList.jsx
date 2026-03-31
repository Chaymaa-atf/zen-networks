import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Heading,
  Inline,
  Stack,
  Text,
  Lozenge,
  Select,
  Textfield
} from '@forge/react';
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

const descriptionStyles = xcss({
  color: 'color.text.subtle',
  fontSize: '12px',
});

const filterBarStyles = xcss({
  padding: 'space.200',
  backgroundColor: 'color.background.neutral.subtle',
  borderRadius: 'border.radius.200',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
});

const filterSelectBoxStyles = xcss({
  width: '180px',
});

const filterInputBoxStyles = xcss({
  width: '260px',
});

const getStatusAppearance = (statut) => {
  switch (statut?.toLowerCase()) {
    case 'validée':
    case 'approuvée':
      return 'success';
    case 'refusée':
      return 'removed';
    case 'en attente':
      return 'inprogress';
    default:
      return 'default';
  }
};

const truncateText = (text, maxLength = 45) => {
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const normalizeText = (value) => {
  return (value || '').toString().toLowerCase().trim();
};

const MissionList = ({
  missions = [],
  loading,
  onViewDetails,
  onCreateMission,
  onDeleteMission,
  onEditMission
}) => {
  const filterOptions = [
    { label: 'Nom', value: 'nom' },
    { label: 'Date', value: 'date' },
    { label: 'Objet', value: 'objet' },
  ];

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState(null);

  const filteredMissions = useMemo(() => {
    const keyword = normalizeText(searchTerm);

    if (!keyword) return missions;

    return missions.filter((mission) => {
      const fullName = normalizeText(
        `${mission.prenomEmploye || ''} ${mission.nomEmploye || ''}`
      );
      const titre = normalizeText(mission.titre || '');
      const dateValue = normalizeText(
        `${mission.dateDepart || ''} ${mission.dateRetour || ''}`
      );

      if (filterType?.value === 'nom') return fullName.includes(keyword);
      if (filterType?.value === 'date') return dateValue.includes(keyword);
      if (filterType?.value === 'objet') return titre.includes(keyword);

      return true;
    });
  }, [missions, searchTerm, filterType]);

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
            {filteredMissions.length} mission{filteredMissions.length !== 1 ? 's' : ''} affichée{filteredMissions.length !== 1 ? 's' : ''}
          </Text>
        </Stack>

        <Button appearance="primary" onClick={onCreateMission}>
          + Créer une mission
        </Button>
      </Inline>

      <Box xcss={filterBarStyles}>
        <Inline space="space.150" alignBlock="end">
          <Box xcss={filterSelectBoxStyles}>
            <Text xcss={subtitleStyles}>Filtrer par</Text>
            <Select
              options={filterOptions}
              value={filterType}
              onChange={(value) => setFilterType(value)}
            />
          </Box>

          <Box xcss={filterInputBoxStyles}>
            <Text xcss={subtitleStyles}>Recherche</Text>
            <Textfield
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                filterType?.value === 'nom'
                  ? 'Rechercher par nom...'
                  : filterType?.value === 'date'
                  ? 'Rechercher par date...'
                  : 'Rechercher par objet...'
              }
            />
          </Box>

          <Button
            appearance="subtle"
            onClick={() => {
              setSearchTerm('');
              setFilterType(null);
            }}
          >
            Réinitialiser
          </Button>
        </Inline>
      </Box>

      {filteredMissions.length === 0 ? (
        <Box
          xcss={xcss({
            padding: 'space.400',
            textAlign: 'center',
            backgroundColor: 'color.background.neutral.subtle',
            borderRadius: 'border.radius.200',
            borderWidth: 'border.width',
            borderStyle: 'solid',
            borderColor: 'color.border',
          })}
        >
          <Text color="color.text.subtlest">
            Aucune mission trouvée pour ce filtre.
          </Text>
        </Box>
      ) : (
        <Box xcss={tableWrapperStyles}>
          <Box xcss={headerRowStyles}>
            <Inline spread="space-between" alignBlock="center">
              <Box xcss={xcss({ width: '110px' })}>
                <Text xcss={subtitleStyles}>IDENTIFIANT</Text>
              </Box>

              <Box xcss={xcss({ width: '170px' })}>
                <Text xcss={subtitleStyles}>NOM & PRÉNOM</Text>
              </Box>

              <Box xcss={xcss({ width: '160px' })}>
                <Text xcss={subtitleStyles}>OBJET</Text>
              </Box>

              <Box xcss={xcss({ width: '200px' })}>
                <Text xcss={subtitleStyles}>DESCRIPTION</Text>
              </Box>

              <Box xcss={xcss({ width: '170px' })}>
                <Text xcss={subtitleStyles}>DESTINATION</Text>
              </Box>

              <Box xcss={xcss({ width: '190px' })}>
                <Text xcss={subtitleStyles}>DATES</Text>
              </Box>

              <Box xcss={xcss({ width: '110px' })}>
                <Text xcss={subtitleStyles}>STATUT</Text>
              </Box>

              <Box xcss={xcss({ width: '220px', textAlign: 'right' })}>
                <Text xcss={subtitleStyles}>ACTION</Text>
              </Box>
            </Inline>
          </Box>

          {filteredMissions.map((mission, index) => (
            <Box
              key={mission.id}
              xcss={index === filteredMissions.length - 1 ? lastRowStyles : rowStyles}
            >
              <Inline spread="space-between" alignBlock="center">
                <Box xcss={xcss({ width: '110px' })}>
                  <Text xcss={titleStyles}>Mission {index + 1}</Text>
                </Box>

                <Box xcss={xcss({ width: '170px' })}>
                  <Text xcss={titleStyles}>
                    {`${mission.prenomEmploye || ''} ${mission.nomEmploye || ''}`.trim() || '—'}
                  </Text>
                </Box>

                <Box xcss={xcss({ width: '160px' })}>
                  <Text xcss={titleStyles}>{mission.titre || '—'}</Text>
                </Box>

                <Box xcss={xcss({ width: '200px' })}>
                  <Text xcss={descriptionStyles}>
                    {truncateText(mission.motif || '—')}
                  </Text>
                </Box>

                <Box xcss={xcss({ width: '170px' })}>
                  <Text color="color.text.subtle">
                    {`${mission.ville || ''}${mission.ville && mission.pays ? ', ' : ''}${mission.pays || ''}` || '—'}
                  </Text>
                </Box>

                <Box xcss={xcss({ width: '190px' })}>
                  <Text xcss={subtitleStyles}>
                    {mission.dateDepart || '—'} → {mission.dateRetour || '—'}
                  </Text>
                </Box>

                <Box xcss={xcss({ width: '110px' })}>
                  <Lozenge appearance={getStatusAppearance(mission.statut)}>
                    {mission.statut || '—'}
                  </Lozenge>
                </Box>

                <Box xcss={xcss({ width: '220px', textAlign: 'right' })}>
                  <Inline space="space.075" alignBlock="center">
                    <Button
                      appearance="subtle"
                      spacing="compact"
                      onClick={() => onViewDetails(mission.id)}
                    >
                      Détails
                    </Button>

                    <Button
                      appearance="primary"
                      spacing="compact"
                      onClick={() => onEditMission && onEditMission(mission.id)}
                    >
                      Modifier
                    </Button>

                    <Button
                      appearance="danger"
                      spacing="compact"
                      onClick={() => onDeleteMission && onDeleteMission(mission.id)}
                    >
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
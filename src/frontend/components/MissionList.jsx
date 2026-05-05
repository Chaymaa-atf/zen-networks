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
});

const totalRowStyles = xcss({
  marginTop: 'space.100',
  paddingBlock: 'space.150',
  paddingInline: 'space.200',
  backgroundColor: 'color.background.discovery',
  borderRadius: 'border.radius.200',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border.discovery',
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

const filterSelectBoxStyles = xcss({ width: '180px' });
const filterInputBoxStyles = xcss({ width: '260px' });

const normalizeText = (value) =>
  (value || '')
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const normalizeCategory = (value) => {
  const category = normalizeText(value);

  if (category.includes('transport') || category.includes('taxi') || category.includes('avion') || category.includes('train')) {
    return 'transport';
  }

  if (category.includes('hebergement') || category.includes('hotel') || category.includes('airbnb')) {
    return 'hebergement';
  }

  if (category.includes('restaurant') || category.includes('restauration') || category.includes('repas') || category.includes('mcdo')) {
    return 'restaurant';
  }

  return category || 'autre';
};

const parseAmount = (value) => {
  if (!value) return 0;

  const cleaned = String(value)
    .replace(',', '.')
    .replace(/[^\d.]/g, '');

  return Number(cleaned) || 0;
};

const convertToDH = (amount, currency) => {
  const devise = normalizeText(currency);

  if (devise.includes('eur') || devise.includes('euro')) return amount * 11;
  if (devise.includes('usd') || devise.includes('dollar')) return amount * 10;
  if (devise.includes('aed') || devise.includes('emirate') || devise.includes('uae') || devise.includes('د.إ')) return amount * 2.7;

  return amount;
};

const formatAmount = (amount) => `${Number(amount || 0).toFixed(2)} DH`;

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

const getAnalysisUniqueKey = (charge) => {
  return (
    charge.analysisKey ||
    charge.attachmentId ||
    `${charge.fileName || ''}-${charge.date || ''}-${charge.amount || ''}-${charge.category || ''}-${charge.sourceIssueKey || ''}`
  );
};

const MissionList = ({
  missions = [],
  charges = [],
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

  const expenseFilterOptions = [
    { label: 'Tous', value: 'all' },
    { label: 'Transport', value: 'transport' },
    { label: 'Hébergement', value: 'hebergement' },
    { label: 'Restaurant', value: 'restaurant' },
  ];

  const sortOptions = [
    { label: 'Aucun', value: 'none' },
    { label: 'Plus cher', value: 'desc' },
    { label: 'Moins cher', value: 'asc' },
  ];

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState(null);
  const [expenseFilter, setExpenseFilter] = useState(expenseFilterOptions[0]);
  const [sortType, setSortType] = useState(sortOptions[0]);

  const selectedExpenseFilter = expenseFilter?.value || 'all';

  const amountColumnLabel =
    selectedExpenseFilter === 'transport'
      ? 'TRANSPORT'
      : selectedExpenseFilter === 'hebergement'
      ? 'HÉBERGEMENT'
      : selectedExpenseFilter === 'restaurant'
      ? 'RESTAURANT'
      : 'TOTAL';

  const getMissionAmount = (mission) => {
    const missionCharges = charges.filter((charge) => {
      return charge.missionIssueKey === mission.issueKey;
    });

    const uniqueCharges = Array.from(
      new Map(missionCharges.map((charge) => [getAnalysisUniqueKey(charge), charge])).values()
    );

    return uniqueCharges.reduce((sum, charge) => {
      const category = normalizeCategory(charge.category || charge.type || charge.typeCharge);
      const rawAmount = charge.amount || charge.montant || '';
      const amountValue = parseAmount(rawAmount);

      const amountDH = convertToDH(
        amountValue,
        charge.currency || charge.devise || charge.monnaie || rawAmount
      );

      if (selectedExpenseFilter === 'all') return sum + amountDH;
      if (category === selectedExpenseFilter) return sum + amountDH;

      return sum;
    }, 0);
  };

  const filteredMissions = useMemo(() => {
    const keyword = normalizeText(searchTerm);

    let result = !keyword
      ? [...missions]
      : missions.filter((mission) => {
          const fullName = normalizeText(`${mission.prenomEmploye || ''} ${mission.nomEmploye || ''}`);
          const titre = normalizeText(mission.titre || '');
          const dateValue = normalizeText(`${mission.dateDepart || ''} ${mission.dateRetour || ''}`);

          if (filterType?.value === 'nom') return fullName.includes(keyword);
          if (filterType?.value === 'date') return dateValue.includes(keyword);
          if (filterType?.value === 'objet') return titre.includes(keyword);

          return fullName.includes(keyword) || titre.includes(keyword) || dateValue.includes(keyword);
        });

    if (sortType?.value === 'desc') {
      result.sort((a, b) => getMissionAmount(b) - getMissionAmount(a));
    }

    if (sortType?.value === 'asc') {
      result.sort((a, b) => getMissionAmount(a) - getMissionAmount(b));
    }

    return result;
  }, [missions, searchTerm, filterType, sortType, charges, selectedExpenseFilter]);

  const totalAllMissions = useMemo(() => {
    return filteredMissions.reduce((sum, mission) => sum + getMissionAmount(mission), 0);
  }, [filteredMissions, charges, selectedExpenseFilter]);

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
            <Select options={filterOptions} value={filterType} onChange={(value) => setFilterType(value)} />
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

          <Box xcss={filterSelectBoxStyles}>
            <Text xcss={subtitleStyles}>Type dépense</Text>
            <Select options={expenseFilterOptions} value={expenseFilter} onChange={(value) => setExpenseFilter(value)} />
          </Box>

          <Box xcss={filterSelectBoxStyles}>
            <Text xcss={subtitleStyles}>Trier par montant</Text>
            <Select options={sortOptions} value={sortType} onChange={(value) => setSortType(value)} />
          </Box>

          <Button
            appearance="subtle"
            onClick={() => {
              setSearchTerm('');
              setFilterType(null);
              setExpenseFilter(expenseFilterOptions[0]);
              setSortType(sortOptions[0]);
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
          <Text color="color.text.subtlest">Aucune mission trouvée pour ce filtre.</Text>
        </Box>
      ) : (
        <Stack space="space.100">
          <Box xcss={tableWrapperStyles}>
            <Box xcss={headerRowStyles}>
              <Inline spread="space-between" alignBlock="center">
                <Box xcss={xcss({ width: '95px' })}><Text xcss={subtitleStyles}>IDENTIFIANT</Text></Box>
                <Box xcss={xcss({ width: '150px' })}><Text xcss={subtitleStyles}>NOM & PRÉNOM</Text></Box>
                <Box xcss={xcss({ width: '140px' })}><Text xcss={subtitleStyles}>OBJET</Text></Box>
                <Box xcss={xcss({ width: '180px' })}><Text xcss={subtitleStyles}>DESCRIPTION</Text></Box>
                <Box xcss={xcss({ width: '145px' })}><Text xcss={subtitleStyles}>DESTINATION</Text></Box>
                <Box xcss={xcss({ width: '170px' })}><Text xcss={subtitleStyles}>DATES</Text></Box>
                <Box xcss={xcss({ width: '105px' })}><Text xcss={subtitleStyles}>STATUT</Text></Box>
                <Box xcss={xcss({ width: '110px', textAlign: 'right' })}><Text xcss={subtitleStyles}>{amountColumnLabel}</Text></Box>
                <Box xcss={xcss({ width: '210px', textAlign: 'right' })}><Text xcss={subtitleStyles}>ACTION</Text></Box>
              </Inline>
            </Box>

            {filteredMissions.map((mission, index) => (
              <Box key={mission.id} xcss={rowStyles}>
                <Inline spread="space-between" alignBlock="center">
                  <Box xcss={xcss({ width: '95px' })}><Text xcss={titleStyles}>Mission {index + 1}</Text></Box>
                  <Box xcss={xcss({ width: '150px' })}><Text xcss={titleStyles}>{`${mission.prenomEmploye || ''} ${mission.nomEmploye || ''}`.trim() || '—'}</Text></Box>
                  <Box xcss={xcss({ width: '140px' })}><Text xcss={titleStyles}>{mission.titre || '—'}</Text></Box>
                  <Box xcss={xcss({ width: '180px' })}><Text xcss={descriptionStyles}>{truncateText(mission.motif || '—')}</Text></Box>
                  <Box xcss={xcss({ width: '145px' })}><Text color="color.text.subtle">{`${mission.ville || ''}${mission.ville && mission.pays ? ', ' : ''}${mission.pays || ''}` || '—'}</Text></Box>
                  <Box xcss={xcss({ width: '170px' })}><Text xcss={subtitleStyles}>{mission.dateDepart || '—'} → {mission.dateRetour || '—'}</Text></Box>
                  <Box xcss={xcss({ width: '105px' })}><Lozenge appearance={getStatusAppearance(mission.statut)}>{mission.statut || '—'}</Lozenge></Box>
                  <Box xcss={xcss({ width: '110px', textAlign: 'right' })}><Text xcss={titleStyles}>{formatAmount(getMissionAmount(mission))}</Text></Box>

                  <Box xcss={xcss({ width: '210px', textAlign: 'right' })}>
                    <Inline space="space.075" alignBlock="center">
                      <Button appearance="subtle" spacing="compact" onClick={() => onViewDetails(mission.id)}>Détails</Button>
                      <Button appearance="primary" spacing="compact" onClick={() => onEditMission && onEditMission(mission.id)}>Modifier</Button>
                      <Button appearance="danger" spacing="compact" onClick={() => onDeleteMission && onDeleteMission(mission.id)}>Supprimer</Button>
                    </Inline>
                  </Box>
                </Inline>
              </Box>
            ))}
          </Box>

          <Box xcss={totalRowStyles}>
            <Inline spread="space-between" alignBlock="center">
              <Text xcss={titleStyles}>TOTAL GLOBAL</Text>
              <Text xcss={titleStyles}>{formatAmount(totalAllMissions)}</Text>
            </Inline>
          </Box>
        </Stack>
      )}
    </Stack>
  );
};

export default MissionList;
import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Heading,
  Inline,
  Stack,
  Text,
  Select,
  Textfield,
  Lozenge,
} from '@forge/react';
import { xcss } from '@forge/react';

/* =========================
   DESIGN PRO FORGE
========================= */

const pageStyles = xcss({
  padding: 'space.400',
  backgroundColor: 'color.background.neutral.subtle',
});

const cardStyles = xcss({
  backgroundColor: 'elevation.surface',
  borderRadius: 'border.radius.300',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
  padding: 'space.400',
});

const filterBarStyles = xcss({
  padding: 'space.300',
  backgroundColor: 'elevation.surface',
  borderRadius: 'border.radius.300',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
});

const tableWrapperStyles = xcss({
  backgroundColor: 'elevation.surface',
  borderRadius: 'border.radius.300',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
  overflow: 'hidden',
});

const headerRowStyles = xcss({
  backgroundColor: 'color.background.discovery',
  paddingBlock: 'space.200',
  paddingInline: 'space.250',
});

const rowStyles = xcss({
  paddingBlock: 'space.200',
  paddingInline: 'space.250',
  borderBottomWidth: 'border.width',
  borderBottomStyle: 'solid',
  borderBottomColor: 'color.border',
  backgroundColor: 'elevation.surface',
});

const totalRowStyles = xcss({
  marginTop: 'space.200',
  paddingBlock: 'space.300',
  paddingInline: 'space.400',
  backgroundColor: 'color.background.discovery',
  borderRadius: 'border.radius.300',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border.discovery',
});

const titleStyles = xcss({
  fontWeight: 'font.weight.semibold',
  color: 'color.text',
});

const headerTextStyles = xcss({
  color: 'color.text.inverse',
  fontSize: '12px',
  fontWeight: 'font.weight.semibold',
});

const subtitleStyles = xcss({
  color: 'color.text.subtle',
  fontSize: '12px',
  fontWeight: 'font.weight.semibold',
});

const textSmallStyles = xcss({
  color: 'color.text.subtle',
  fontSize: '12px',
});

const amountStyles = xcss({
  fontWeight: 'font.weight.bold',
  color: 'color.text.discovery',
});

const filterSelectBoxStyles = xcss({ width: '185px' });
const filterInputBoxStyles = xcss({ width: '280px' });

const emptyStateStyles = xcss({
  padding: 'space.500',
  textAlign: 'center',
  backgroundColor: 'elevation.surface',
  borderRadius: 'border.radius.300',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
});

/* =========================
   LOGIQUE EXISTANTE
========================= */

const normalizeText = (value) =>
  (value || '')
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const normalizeCategory = (value) => {
  const category = normalizeText(value);

  if (
    category.includes('transport') ||
    category.includes('taxi') ||
    category.includes('avion') ||
    category.includes('train')
  ) return 'transport';

  if (
    category.includes('hebergement') ||
    category.includes('hotel') ||
    category.includes('airbnb')
  ) return 'hebergement';

  if (
    category.includes('restaurant') ||
    category.includes('restauration') ||
    category.includes('repas') ||
    category.includes('mcdo')
  ) return 'restaurant';

  return category || 'autre';
};

const parseAmount = (value) => {
  if (!value) return 0;
  const cleaned = String(value).replace(',', '.').replace(/[^\d.]/g, '');
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

const getAnalysisUniqueKey = (charge) => {
  return (
    charge.analysisKey ||
    charge.attachmentId ||
    `${charge.fileName || ''}-${charge.date || ''}-${charge.amount || ''}-${charge.category || ''}-${charge.sourceIssueKey || ''}`
  );
};

const getStatusAppearance = (status) => {
  
  if (status === 'Validée') return 'success';
  if (status === 'Refusée') return 'removed';
  return 'inprogress';
};

const SortHeader = ({ label, column, sortConfig, onSort, inverse = false }) => {
  const isActive = sortConfig.column === column;

  return (
    <Inline space="space.050" alignBlock="center">
      <Text xcss={inverse ? headerTextStyles : subtitleStyles}>{label}</Text>
      <Button appearance="subtle" spacing="compact" onClick={() => onSort(column)}>
        {isActive ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
      </Button>
    </Inline>
  );
};

const MissionList = ({
  missions = [],
  charges = [],
  loading,
  userRole = 'employe',
  onViewDetails,
  onCreateMission,
  onDeleteMission,
  onEditMission,
  onUpdateStatus,
  onPrepareOrdre
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

  const statusOptions = [
    { label: 'En attente', value: 'En attente' },
    { label: 'Validée', value: 'Validée' },
    { label: 'Refusée', value: 'Refusée' },
  ];

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState(null);
  const [expenseFilter, setExpenseFilter] = useState(expenseFilterOptions[0]);
  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });
  const [localStatuses, setLocalStatuses] = useState({});

  const selectedExpenseFilter = expenseFilter?.value || 'all';

  const amountColumnLabel =
    selectedExpenseFilter === 'transport'
      ? 'TRANSPORT'
      : selectedExpenseFilter === 'hebergement'
      ? 'HÉBERGEMENT'
      : selectedExpenseFilter === 'restaurant'
      ? 'RESTAURANT'
      : 'TOTAL';

  const getMissionStatus = (mission) => {
    return localStatuses[mission.id] || mission.statut || 'En attente';
  };

  const handleStatusChange = async (mission, value) => {
    const newStatus = value.value;

    setLocalStatuses((prev) => ({
      ...prev,
      [mission.id]: newStatus,
    }));

    if (onUpdateStatus) {
      await onUpdateStatus(mission.id, newStatus);
    }
  };

  const handleGenerateOrdreMission = async (missionId) => {
    if (onPrepareOrdre) {
      onPrepareOrdre(missionId);
    }
  };

  const handleSort = (column) => {
    setSortConfig((prev) => {
      if (prev.column !== column) return { column, direction: 'asc' };
      if (prev.direction === 'asc') return { column, direction: 'desc' };
      return { column: null, direction: null };
    });
  };

  const getMissionAmount = (mission) => {
    const missionCharges = charges.filter((charge) => charge.missionIssueKey === mission.issueKey);

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

    if (sortConfig.column && sortConfig.direction) {
      result.sort((a, b) => {
        let valueA = '';
        let valueB = '';

        if (sortConfig.column === 'nom') {
          valueA = normalizeText(`${a.prenomEmploye || ''} ${a.nomEmploye || ''}`);
          valueB = normalizeText(`${b.prenomEmploye || ''} ${b.nomEmploye || ''}`);
        }

        if (sortConfig.column === 'objet') {
          valueA = normalizeText(a.titre || '');
          valueB = normalizeText(b.titre || '');
        }

        if (sortConfig.column === 'date') {
          valueA = a.dateDepart || '';
          valueB = b.dateDepart || '';
        }

        if (sortConfig.column === 'montant') {
          valueA = getMissionAmount(a);
          valueB = getMissionAmount(b);
        }

        if (sortConfig.column === 'montant') {
          return sortConfig.direction === 'asc' ? valueA - valueB : valueB - valueA;
        }

        return sortConfig.direction === 'asc'
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      });
    }

    return result;
  }, [missions, searchTerm, filterType, charges, selectedExpenseFilter, sortConfig]);

  const totalAllMissions = useMemo(() => {
    return filteredMissions.reduce((sum, mission) => sum + getMissionAmount(mission), 0);
  }, [filteredMissions, charges, selectedExpenseFilter]);

  if (loading) {
    return (
      <Box xcss={pageStyles}>
        <Box xcss={cardStyles}>
          <Text color="color.text.subtlest">Chargement des missions...</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box xcss={pageStyles}>
      <Stack space="space.300">

        <Box xcss={cardStyles}>
          <Inline spread="space-between" alignBlock="center">
            <Stack space="space.050">
              <Heading size="large">Liste des missions</Heading>
              <Text color="color.text.subtlest">
                {filteredMissions.length} mission{filteredMissions.length !== 1 ? 's' : ''} affichée{filteredMissions.length !== 1 ? 's' : ''}
              </Text>
            </Stack>

            <Button appearance="primary" onClick={onCreateMission}>
              + Créer une mission
            </Button>
          </Inline>
        </Box>

        <Box xcss={filterBarStyles}>
          <Inline space="space.200" alignBlock="end" wrap="wrap">
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

            <Button
              appearance="subtle"
              onClick={() => {
                setSearchTerm('');
                setFilterType(null);
                setExpenseFilter(expenseFilterOptions[0]);
                setSortConfig({ column: null, direction: null });
              }}
            >
              Réinitialiser
            </Button>
          </Inline>
        </Box>

        {filteredMissions.length === 0 ? (
          <Box xcss={emptyStateStyles}>
            <Heading size="small">Aucune mission trouvée</Heading>
          </Box>
        ) : (
          <Stack space="space.200">

            <Box xcss={tableWrapperStyles}>
              <Box xcss={headerRowStyles}>
                <Inline spread="space-between" alignBlock="center">
                  <Box xcss={xcss({ width: '55px' })}>
                    <Text xcss={headerTextStyles}>N°</Text>
                  </Box>

                  <Box xcss={xcss({ width: '165px' })}>
                    <SortHeader label="Employé" column="nom" sortConfig={sortConfig} onSort={handleSort} inverse />
                  </Box>

                  <Box xcss={xcss({ width: '160px' })}>
                    <SortHeader label="Objet" column="objet" sortConfig={sortConfig} onSort={handleSort} inverse />
                  </Box>

                  <Box xcss={xcss({ width: '165px' })}>
                    <Text xcss={headerTextStyles}>Destination</Text>
                  </Box>

                  <Box xcss={xcss({ width: '175px' })}>
                    <SortHeader label="Dates" column="date" sortConfig={sortConfig} onSort={handleSort} inverse />
                  </Box>

                  <Box xcss={xcss({ width: '150px' })}>
                    <Text xcss={headerTextStyles}>Statut</Text>
                  </Box>

                  <Box xcss={xcss({ width: '125px', textAlign: 'right' })}>
                    <SortHeader label={amountColumnLabel} column="montant" sortConfig={sortConfig} onSort={handleSort} inverse />
                  </Box>

                  <Box xcss={xcss({ width: '235px', textAlign: 'right' })}>
                    <Text xcss={headerTextStyles}>Actions</Text>
                  </Box>
                </Inline>
              </Box>

              {filteredMissions.map((mission, index) => {
                const status = getMissionStatus(mission);

                return (
                  <Box key={mission.id} xcss={rowStyles}>
                    <Inline spread="space-between" alignBlock="center">

                      <Box xcss={xcss({ width: '55px' })}>
                        <Text xcss={textSmallStyles}>#{index + 1}</Text>
                      </Box>

                      <Box xcss={xcss({ width: '165px' })}>
                        <Text xcss={titleStyles}>
                          {`${mission.prenomEmploye || ''} ${mission.nomEmploye || ''}`.trim() || '—'}
                        </Text>
                      </Box>

                      <Box xcss={xcss({ width: '160px' })}>
                        <Text xcss={titleStyles}>{mission.titre || '—'}</Text>
                      </Box>

                      <Box xcss={xcss({ width: '165px' })}>
                        <Text xcss={textSmallStyles}>
                          {`${mission.ville || ''}${mission.ville && mission.pays ? ', ' : ''}${mission.pays || ''}` || '—'}
                        </Text>
                      </Box>

                      <Box xcss={xcss({ width: '175px' })}>
                        <Text xcss={textSmallStyles}>
                          {mission.dateDepart || '—'} → {mission.dateRetour || '—'}
                        </Text>
                      </Box>

                      <Box xcss={xcss({ width: '150px' })}>
                        {userRole === 'admin' ? (
                          <Select
                            options={statusOptions}
                            value={
                              statusOptions.find((option) => option.value === status) ||
                              statusOptions[0]
                            }
                            onChange={(value) => handleStatusChange(mission, value)}
                          />
                        ) : (
                          <Lozenge appearance={getStatusAppearance(status)}>
                            {status}
                          </Lozenge>
                        )}
                      </Box>

                      <Box xcss={xcss({ width: '125px', textAlign: 'right' })}>
                        <Text xcss={amountStyles}>{formatAmount(getMissionAmount(mission))}</Text>
                      </Box>

                      <Box xcss={xcss({ width: '235px', textAlign: 'right' })}>
                        <Inline space="space.050" alignBlock="center">
                          <Button
                            appearance="subtle"
                            spacing="compact"
                            onClick={() => onViewDetails(mission.id)}
                          >
                            Détails
                          </Button>

                          {userRole === 'admin' && (
                            <Button
                              appearance="primary"
                              spacing="compact"
                              onClick={() => handleGenerateOrdreMission(mission.id)}
                            >
                              Ordre
                            </Button>
                          )}

                          <Button
                            appearance="subtle"
                            spacing="compact"
                            onClick={() => onEditMission && onEditMission(mission.id)}
                          >
                            ✏️
                          </Button>

                          {userRole === 'admin' && (
                            <Button
                              appearance="subtle"
                              spacing="compact"
                              onClick={() => onDeleteMission && onDeleteMission(mission.id)}
                            >
                              🗑️
                            </Button>
                          )}
                        </Inline>
                      </Box>

                    </Inline>
                  </Box>
                );
              })}
            </Box>

            <Box xcss={totalRowStyles}>
              <Inline spread="space-between" alignBlock="center">
                <Stack space="space.025">
                  <Text xcss={subtitleStyles}>Total global</Text>
                  <Text color="color.text.subtle">
                    {filteredMissions.length} mission{filteredMissions.length !== 1 ? 's' : ''} affichée{filteredMissions.length !== 1 ? 's' : ''}
                  </Text>
                </Stack>

                <Heading size="large">{formatAmount(totalAllMissions)}</Heading>
              </Inline>
            </Box>

          </Stack>
        )}
      </Stack>
    </Box>
  );
};

export default MissionList;
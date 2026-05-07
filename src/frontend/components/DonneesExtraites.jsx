import React, { useMemo, useState } from 'react';
import {
  Box,
  Heading,
  Stack,
  Text,
  Inline,
  Button,
  Select,
  Textfield
} from '@forge/react';

import { xcss } from '@forge/react';

const sectionStyles = xcss({
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
  borderRadius: 'border.radius.200',
  padding: 'space.200',
  backgroundColor: 'color.background.neutral.subtle'
});

const tableStyles = xcss({
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
  borderRadius: 'border.radius.200'
});

const rowStyles = xcss({
  padding: 'space.150',
  borderBottomWidth: 'border.width',
  borderBottomStyle: 'solid',
  borderBottomColor: 'color.border'
});

const headerStyles = xcss({
  padding: 'space.150',
  backgroundColor: 'color.background.neutral'
});

const groupRowStyles = xcss({
  padding: 'space.150',
  backgroundColor: 'color.background.neutral.subtle',
  borderBottomWidth: 'border.width',
  borderBottomStyle: 'solid',
  borderBottomColor: 'color.border'
});

const normalizeText = (v) =>
  (v || '').toString().toLowerCase().trim();

const getMonthFromDate = (date) => {
  if (!date) return '';
  if (date.includes('/')) return date.split('/')[1];
  if (date.includes('-')) return date.split('-')[1];
  return '';
};

const getDateForFilter = (date) => {
  if (!date) return '';
  if (date.includes('/')) return date.split('/').reverse().join('-');
  return date;
};

const parseAmountToDH = (item) => {
  let amount = parseFloat(
    (item.amount || '0')
      .toString()
      .replace(',', '.')
      .replace(/[^\d.]/g, '')
  );

  if (isNaN(amount)) amount = 0;

  const currency = (item.currency || '').toUpperCase();

  if (currency.includes('EUR') || currency.includes('€')) {
    amount = amount * 11;
  } else if (currency.includes('USD') || currency.includes('$')) {
    amount = amount * 10;
  }

  return amount;
};

const DonneesExtraites = ({ missions = [], analyses = [] }) => {
  const [missionFilter, setMissionFilter] = useState(null);
  const [employeeFilter, setEmployeeFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);
  const [monthFilter, setMonthFilter] = useState(null);

  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  const [groupements, setGroupements] = useState([
    { label: 'Mission', value: 'mission' },
    { label: 'Employé', value: 'employe' },
    { label: 'Type', value: 'type' }
  ]);

  const [selectedGroupement, setSelectedGroupement] = useState(null);
  const [openedGroups, setOpenedGroups] = useState({});

  const groupementOptions = [
    { label: 'Mission', value: 'mission' },
    { label: 'Employé', value: 'employe' },
    { label: 'Type', value: 'type' }
  ];

  const missionOptions = useMemo(() => {
    return [
      { label: 'Toutes les missions', value: 'all' },
      ...missions.map(m => ({
        label: m.titre || m.issueKey || 'Mission',
        value: m.issueKey || m.id || m.titre
      }))
    ];
  }, [missions]);

  const employeeOptions = useMemo(() => {
    const employees = [
      ...new Set(
        missions
          .map(m =>
            `${m.prenomEmploye || ''} ${m.nomEmploye || ''}`.trim()
          )
          .filter(e => e)
      )
    ];

    return [
      { label: 'Tous les employés', value: 'all' },
      ...employees.map(e => ({
        label: e,
        value: e
      }))
    ];
  }, [missions]);

  const typeOptions = [
    { label: 'Tous les types', value: 'all' },
    { label: 'Transport', value: 'transport' },
    { label: 'Hébergement', value: 'hebergement' },
    { label: 'Restaurant', value: 'restaurant' }
  ];

  const monthOptions = [
    { label: 'Tous les mois', value: 'all' },
    { label: 'Janvier', value: '01' },
    { label: 'Février', value: '02' },
    { label: 'Mars', value: '03' },
    { label: 'Avril', value: '04' },
    { label: 'Mai', value: '05' },
    { label: 'Juin', value: '06' },
    { label: 'Juillet', value: '07' },
    { label: 'Août', value: '08' },
    { label: 'Septembre', value: '09' },
    { label: 'Octobre', value: '10' },
    { label: 'Novembre', value: '11' },
    { label: 'Décembre', value: '12' }
  ];

  const enriched = useMemo(() => {
    return analyses.map(a => {
      const mission = missions.find(m =>
        m.issueKey === a.missionIssueKey ||
        m.issueKey === a.issueKey ||
        m.issueKey === a.sourceIssueKey ||
        m.id === a.missionId
      );

      return {
        ...a,
        missionKey: mission?.issueKey || mission?.id || '',
        missionName: mission?.titre || '—',
        employee:
          `${mission?.prenomEmploye || ''} ${mission?.nomEmploye || ''}`.trim() || '—'
      };
    });
  }, [analyses, missions]);

  const filtered = useMemo(() => {
    return enriched.filter(item => {
      const matchMission =
        !missionFilter ||
        missionFilter.value === 'all' ||
        item.missionKey === missionFilter.value ||
        item.missionName === missionFilter.value;

      const matchEmployee =
        !employeeFilter ||
        employeeFilter.value === 'all' ||
        normalizeText(item.employee) === normalizeText(employeeFilter.value);

      const matchType =
        !typeFilter ||
        typeFilter.value === 'all' ||
        normalizeText(item.category).includes(typeFilter.value);

      const itemMonth = getMonthFromDate(item.date);

      const matchMonth =
        !monthFilter ||
        monthFilter.value === 'all' ||
        itemMonth === monthFilter.value;

      const itemDate = getDateForFilter(item.date);

      const matchDateDebut =
        !dateDebut || itemDate >= dateDebut;

      const matchDateFin =
        !dateFin || itemDate <= dateFin;

      return (
        matchMission &&
        matchEmployee &&
        matchType &&
        matchMonth &&
        matchDateDebut &&
        matchDateFin
      );
    });
  }, [
    enriched,
    missionFilter,
    employeeFilter,
    typeFilter,
    monthFilter,
    dateDebut,
    dateFin
  ]);

  const getGroupValue = (item, type) => {
    if (type === 'mission') return item.missionName || '—';
    if (type === 'employe') return item.employee || '—';
    if (type === 'type') return item.category || '—';
    return '—';
  };

  const buildTree = (items, levels, level = 0) => {
    if (level >= levels.length) return items;

    const group = levels[level];
    const result = {};

    items.forEach(item => {
      const value = getGroupValue(item, group.value);

      if (!result[value]) {
        result[value] = [];
      }

      result[value].push(item);
    });

    return Object.entries(result).map(([name, children]) => {
      const total = children.reduce((sum, item) => {
        return sum + parseAmountToDH(item);
      }, 0);

      return {
        name,
        label: group.label,
        value: group.value,
        count: children.length,
        total,
        children: buildTree(children, levels, level + 1)
      };
    });
  };

  const groupedTree = useMemo(() => {
    if (groupements.length === 0) return null;
    return buildTree(filtered, groupements);
  }, [filtered, groupements]);

  const toggleGroup = (key) => {
    setOpenedGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const renderRow = (item, i) => (
    <Box key={i} xcss={rowStyles}>
      <Inline spread="space-between">
        <Text>{item.missionName}</Text>
        <Text> </Text>
        <Text>{item.employee}</Text>
        <Text>{item.category || '—'}</Text>
        <Text>{item.date || '—'}</Text>
        <Text>{item.amount || '—'}</Text>
        <Text>{item.details || '—'}</Text>

        <Inline space="space.050">
          <Button appearance="primary">Modifier</Button>
          <Button appearance="danger">Supprimer</Button>
        </Inline>
      </Inline>
    </Box>
  );

  const renderTree = (nodes, level = 0, parentKey = '') => {
    return nodes.map((node, index) => {
      const key = `${parentKey}-${node.value}-${node.name}-${index}`;
      const isOpen = openedGroups[key];

      const isLastLevel =
        groupements[level + 1] === undefined;

      return (
        <Box key={key}>
          <Box xcss={groupRowStyles}>
  <Inline spread="space-between" alignBlock="center">

    {/* MISSION */}
    <Inline space="space.100" alignBlock="center">
      <Button
        appearance="subtle"
        spacing="compact"
        onClick={() => toggleGroup(key)}
      >
        {isOpen ? '▼' : '▶'}
      </Button>

      <Text>
        {node.label} : {node.name}
      </Text>
    </Inline>

    {/* TOTAL */}
    <Text>
      {node.total.toFixed(2)} DH
    </Text>

    {/* EMPLOYÉ */}
    <Text> </Text>

    {/* TYPE */}
    <Text> </Text>

    {/* DATE */}
    <Text> </Text>

    {/* MONTANT */}
    <Text> </Text>

    {/* DÉTAILS */}
    <Text> </Text>

    {/* ACTIONS */}
    <Text> </Text>

  </Inline>
</Box>
          {isOpen && (
            <>
              {isLastLevel
                ? node.children.map((item, i) => renderRow(item, i))
                : renderTree(node.children, level + 1, key)}
            </>
          )}
        </Box>
      );
    });
  };

  return (
    <Stack space="space.400">
      <Heading size="large">
        Données extraites des justificatifs
      </Heading>

      <Box xcss={sectionStyles}>
        <Inline space="space.100" alignBlock="center">
          <Select
            options={missionOptions}
            value={missionFilter}
            onChange={(v) => setMissionFilter(v)}
            placeholder="Mission"
          />

          <Select
            options={employeeOptions}
            value={employeeFilter}
            onChange={(v) => setEmployeeFilter(v)}
            placeholder="Employé"
          />

          <Select
            options={typeOptions}
            value={typeFilter}
            onChange={(v) => setTypeFilter(v)}
            placeholder="Type"
          />

          <Select
            options={monthOptions}
            value={monthFilter}
            onChange={(v) => setMonthFilter(v)}
            placeholder="Mois"
          />

          <Button appearance="primary">Filtrer</Button>

          <Button
            appearance="subtle"
            onClick={() => {
              setMissionFilter(null);
              setEmployeeFilter(null);
              setTypeFilter(null);
              setMonthFilter(null);
              setDateDebut('');
              setDateFin('');
              setOpenedGroups({});
            }}
          >
            Réinitialiser
          </Button>
        </Inline>
      </Box>

      <Box xcss={sectionStyles}>
        <Inline space="space.300" alignBlock="center">
          <Text>Période:</Text>

          <Textfield
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            placeholder="From"
          />

          <Text>à</Text>

          <Textfield
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            placeholder="To"
          />
        </Inline>
      </Box>

      <Box xcss={sectionStyles}>
        <Stack space="space.200">
          <Heading size="medium">
            Regroupement
          </Heading>

          <Box xcss={tableStyles}>
            <Box xcss={rowStyles}>
              <Inline space="space.150" alignBlock="center">
                <Select
                  options={groupementOptions}
                  value={selectedGroupement}
                  onChange={(v) => setSelectedGroupement(v)}
                  placeholder="Ajouter un regroupement"
                />

                <Button
                  appearance="subtle"
                  onClick={() => {
                    if (!selectedGroupement) return;

                    const existe = groupements.some(
                      g => g.value === selectedGroupement.value
                    );

                    if (existe) {
                      setSelectedGroupement(null);
                      return;
                    }

                    setGroupements([
                      ...groupements,
                      selectedGroupement
                    ]);

                    setSelectedGroupement(null);
                    setOpenedGroups({});
                  }}
                >
                  +
                </Button>

                {groupements.map((g) => (
                  <Inline
                    key={g.value}
                    space="space.050"
                    alignBlock="center"
                  >
                    <Button appearance="subtle">
                      {g.label}
                    </Button>

                    <Button
                      appearance="danger"
                      spacing="compact"
                      onClick={() => {
                        setGroupements(
                          groupements.filter(item => item.value !== g.value)
                        );
                        setOpenedGroups({});
                      }}
                    >
                      🗑
                    </Button>
                  </Inline>
                ))}
              </Inline>
            </Box>
          </Box>
        </Stack>
      </Box>

      {filtered.length === 0 ? (
        <Text>Aucune donnée disponible</Text>
      ) : (
        <Box xcss={tableStyles}>
          <Box xcss={headerStyles}>
            <Inline spread="space-between">
              <Text>MISSION</Text>
              <Text>TOTAL</Text>
              <Text>EMPLOYÉ</Text>
              <Text>TYPE</Text>
              <Text>DATE</Text>
              <Text>MONTANT</Text>
              <Text>DÉTAILS</Text>
              <Text>ACTIONS</Text>
            </Inline>
          </Box>

          {groupedTree
            ? renderTree(groupedTree)
            : filtered.map((item, i) => renderRow(item, i))}
        </Box>
      )}
    </Stack>
  );
};

export default DonneesExtraites;
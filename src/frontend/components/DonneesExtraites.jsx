import React, { useMemo, useState } from 'react';
import {
  Box,
  Heading,
  Stack,
  Text,
  Inline,
  Button,
  Textfield,
  Select
} from '@forge/react';
import { xcss } from '@forge/react';

/* ---------- styles ---------- */

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

/* ---------- utils ---------- */

const normalizeText = (v) =>
  (v || '').toString().toLowerCase().trim();

/* ---------- component ---------- */

const DonneesExtraites = ({ missions = [], analyses = [] }) => {

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(null);

  const typeOptions = [
    { label: 'Tous', value: 'all' },
    { label: 'Transport', value: 'transport' },
    { label: 'Hébergement', value: 'hebergement' },
    { label: 'Restaurant', value: 'restaurant' }
  ];

  /* 🔍 enrich data (mission + employé) */
  const enriched = useMemo(() => {
    return analyses.map(a => {
      const mission = missions.find(m =>
        m.id === a.missionId || m.issueKey === a.issueKey
      );

      return {
        ...a,
        missionName: mission?.titre || '—',
        employee: `${mission?.prenomEmploye || ''} ${mission?.nomEmploye || ''}`.trim() || '—'
      };
    });
  }, [analyses, missions]);

  /* 🔎 filtre */
  const filtered = useMemo(() => {
    return enriched.filter(item => {

      const text = normalizeText(search);

      const matchSearch =
        !text ||
        normalizeText(item.missionName).includes(text) ||
        normalizeText(item.employee).includes(text) ||
        normalizeText(item.category).includes(text);

      const matchType =
        !typeFilter || typeFilter.value === 'all' ||
        normalizeText(item.category).includes(typeFilter.value);

      return matchSearch && matchType;
    });
  }, [enriched, search, typeFilter]);

  return (
    <Stack space="space.300">

      <Heading size="large">Données extraites</Heading>

      {/* 🔍 filtres */}
      <Inline space="space.150">
        <Textfield
          placeholder="Rechercher par employé ou objet de mission..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Select
          options={typeOptions}
          value={typeFilter}
          onChange={(v) => setTypeFilter(v)}
          placeholder="Type"
        />
      </Inline>

      {/* 📊 tableau */}
      {filtered.length === 0 ? (
        <Text>Aucune donnée disponible</Text>
      ) : (
        <Box xcss={tableStyles}>

          {/* header */}
          <Box xcss={headerStyles}>
            <Inline spread="space-between">
              <Text>MISSION</Text>
              <Text>EMPLOYÉ</Text>
              <Text>TYPE</Text>
              <Text>DATE</Text>
              <Text>MONTANT</Text>
              <Text>DÉTAILS</Text>
              <Text>ACTIONS</Text>
            </Inline>
          </Box>

          {/* lignes */}
          {filtered.map((item, i) => (
            <Box key={i} xcss={rowStyles}>
              <Inline spread="space-between">

                <Text>{item.missionName}</Text>
                <Text>{item.employee}</Text>
                <Text>{item.category || '—'}</Text>
                <Text>{item.date || '—'}</Text>
                <Text>{item.amount || '—'}</Text>
                <Text>{item.details || '—'}</Text>

                <Inline>
                  <Button appearance="primary">Modifier</Button>
                  <Button appearance="danger">Supprimer</Button>
                </Inline>

              </Inline>
            </Box>
          ))}

        </Box>
      )}
    </Stack>
  );
};

export default DonneesExtraites;
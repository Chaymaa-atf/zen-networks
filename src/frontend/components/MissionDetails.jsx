import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Heading,
  Inline,
  Lozenge,
  Stack,
  Text,
} from '@forge/react';
import { xcss } from '@forge/react';
import { router } from '@forge/bridge';
import {
  getMissionAttachments,
  getMissionCharges,
  createCharge,
} from '../services/missionService';

/* ─── Styles ─── */
const cardStyles = xcss({
  backgroundColor: 'color.background.neutral.subtle',
  borderRadius: 'border.radius.200',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
  padding: 'space.200',
});

const infoCardStyles = xcss({
  backgroundColor: 'color.background.input',
  borderRadius: 'border.radius.200',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
  padding: 'space.150',
  flex: '1',
});

const sectionHeaderStyles = xcss({
  borderBottomWidth: 'border.width',
  borderBottomStyle: 'solid',
  borderBottomColor: 'color.border',
  paddingBottom: 'space.100',
  marginBottom: 'space.150',
});

const chargeItemStyles = xcss({
  backgroundColor: 'color.background.input',
  borderRadius: 'border.radius.200',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
  padding: 'space.150',
  ':hover': {
    backgroundColor: 'color.background.neutral.subtle.hovered',
  },
});

const docItemStyles = xcss({
  borderBottomWidth: 'border.width',
  borderBottomStyle: 'solid',
  borderBottomColor: 'color.border',
  paddingBlock: 'space.100',
});

const labelStyles = xcss({
  fontSize: '11px',
  color: 'color.text.subtlest',
  fontWeight: 'font.weight.medium',
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

const CHARGE_TYPES = [
  { type: 'hotel',      label: 'Hôtel',        emoji: '🏨' },
  { type: 'restaurant', label: 'Restaurant',    emoji: '🍽️' },
  { type: 'avion',      label: 'Billet avion',  emoji: '✈️' },
  { type: 'carburant',  label: 'Carburant',     emoji: '⛽' },
];

/* ─── Component ─── */
const MissionDetails = ({ mission, onBack }) => {
  const [attachments, setAttachments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [charges, setCharges] = useState([]);
  const [loadingCharges, setLoadingCharges] = useState(false);

  if (!mission) {
    return <Text>Aucune mission sélectionnée.</Text>;
  }

  const openJiraIssue = async () => {
    if (mission.issueKey) await router.open(`/browse/${mission.issueKey}`);
  };

  const openAttachment = async (id, filename) =>
    router.open(`/secure/attachment/${id}/${filename}`);

  const downloadAttachment = async (id) => {
    try {
      await router.open(`/rest/api/2/attachment/content/${id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAttachments = async () => {
    if (!mission?.issueKey) return setAttachments([]);
    try {
      setLoadingAttachments(true);
      const res = await getMissionAttachments(mission.issueKey);
      setAttachments(res.success ? res.attachments || [] : []);
    } catch {
      setAttachments([]);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const loadCharges = async () => {
    if (!mission?.issueKey) return setCharges([]);
    try {
      setLoadingCharges(true);
      const res = await getMissionCharges(mission.issueKey);
      setCharges(res.success ? res.charges || [] : []);
    } catch {
      setCharges([]);
    } finally {
      setLoadingCharges(false);
    }
  };

  const handleAddCharge = async (type) => {
    try {
      const res = await createCharge({ issueKey: mission.issueKey, type });
      if (res.success) {
        await loadCharges();
        if (res.chargeKey) await router.open(`/browse/${res.chargeKey}`);
      } else {
        window.alert(res.message || "Erreur lors de l'ajout de la charge.");
      }
    } catch {
      window.alert("Erreur lors de l'ajout de la charge.");
    }
  };

  useEffect(() => {
    loadAttachments();
    loadCharges();
  }, [mission?.issueKey]);

  return (
    <Stack space="space.300">

      {/* Navigation */}
      <Inline space="space.100" alignBlock="center">
        <Button appearance="subtle" onClick={onBack}>
          ← Retour
        </Button>
        <Text color="color.text.subtlest">Mes missions /</Text>
        <Text color="color.text.subtle">{mission.titre}</Text>
      </Inline>

      {/* Header */}
      <Box xcss={cardStyles}>
        <Inline spread="space-between" alignBlock="start">
          <Stack space="space.100">
            <Heading size="large">{mission.titre}</Heading>
            <Inline space="space.100" alignBlock="center">
              <Lozenge appearance={getStatusAppearance(mission.statut)}>
                {mission.statut}
              </Lozenge>
              {mission.issueKey && (
                <Text color="color.text.subtlest">· {mission.issueKey}</Text>
              )}
            </Inline>
          </Stack>
          {mission.issueKey && (
            <Button appearance="subtle" onClick={openJiraIssue}>
              ↗ Ouvrir dans Jira
            </Button>
          )}
        </Inline>
      </Box>

      {/* Info cards */}
      <Inline space="space.100" alignBlock="start">
        {[
          { label: 'Destination', value: mission.destination },
          { label: 'Pays',        value: mission.pays },
          { label: 'Ville',       value: mission.ville },
          { label: 'Départ',      value: mission.dateDepart },
          { label: 'Retour',      value: mission.dateRetour },
          { label: 'Motif',       value: mission.motif },
        ].map(({ label, value }) => (
          <Box key={label} xcss={infoCardStyles}>
            <Stack space="space.050">
              <Text xcss={labelStyles}>{label.toUpperCase()}</Text>
              <Text>{value || '—'}</Text>
            </Stack>
          </Box>
        ))}
      </Inline>

      {/* Charges */}
      <Stack space="space.150">
        <Box xcss={sectionHeaderStyles}>
          <Heading size="small">Charges de mission</Heading>
        </Box>

        {/* Boutons d'ajout */}
        <Inline space="space.100">
          {CHARGE_TYPES.map(({ type, label, emoji }) => (
            <Button
              key={type}
              appearance="subtle"
              onClick={() => handleAddCharge(type)}
            >
              {emoji} {label}
            </Button>
          ))}
        </Inline>

        {/* Liste des charges */}
        {loadingCharges && <Text color="color.text.subtlest">Chargement des charges...</Text>}

        {!loadingCharges && charges.length === 0 && (
          <Box xcss={xcss({ padding: 'space.200', textAlign: 'center',
            backgroundColor: 'color.background.neutral.subtle',
            borderRadius: 'border.radius.200' })}>
            <Text color="color.text.subtlest">Aucune charge enregistrée.</Text>
          </Box>
        )}

        {!loadingCharges && charges.length > 0 && (
          <Stack space="space.100">
            {charges.map((charge) => (
              <Box key={charge.id} xcss={chargeItemStyles}>
                <Inline spread="space-between" alignBlock="center">
                  <Stack space="space.050">
                    <Text xcss={xcss({ color: 'color.link', fontWeight: 'font.weight.medium', fontSize: '12px' })}>
                      {charge.key}
                    </Text>
                    <Text>{charge.fields.summary}</Text>
                  </Stack>
                  <Inline space="space.075">
                    <Button
                      appearance="subtle"
                      onClick={() => router.open(`/browse/${charge.key}`)}
                    >
                      Ouvrir
                    </Button>
                    <Button
                      appearance="primary"
                      onClick={() => router.open(`/browse/${charge.key}`)}
                    >
                      + Pièce jointe
                    </Button>
                  </Inline>
                </Inline>
              </Box>
            ))}
          </Stack>
        )}
      </Stack>

      {/* Documents */}
      <Stack space="space.150">
        <Box xcss={sectionHeaderStyles}>
          <Inline spread="space-between" alignBlock="center">
            <Heading size="small">Documents de mission</Heading>
            <Button appearance="primary" onClick={openJiraIssue}>
              + Ajouter document
            </Button>
          </Inline>
        </Box>

        {loadingAttachments && (
          <Text color="color.text.subtlest">Chargement des documents...</Text>
        )}

        {!loadingAttachments && attachments.length === 0 && (
          <Box xcss={xcss({ padding: 'space.200', textAlign: 'center',
            backgroundColor: 'color.background.neutral.subtle',
            borderRadius: 'border.radius.200' })}>
            <Text color="color.text.subtlest">Aucun document attaché.</Text>
          </Box>
        )}

        {!loadingAttachments && attachments.length > 0 && (
          <Stack space="space.0">
            {attachments.map((file) => (
              <Box key={file.id} xcss={docItemStyles}>
                <Inline spread="space-between" alignBlock="center">
                  <Text>📎 {file.filename}</Text>
                  <Inline space="space.075">
                    <Button appearance="subtle" onClick={() => openAttachment(file.id, file.filename)}>
                      Ouvrir
                    </Button>
                    <Button appearance="subtle" onClick={() => downloadAttachment(file.id)}>
                      Télécharger
                    </Button>
                  </Inline>
                </Inline>
              </Box>
            ))}
          </Stack>
        )}
      </Stack>

      {/* Footer */}
      <Box>
        <Button appearance="primary" onClick={onBack}>
          ← Retour à la liste
        </Button>
      </Box>

    </Stack>
  );
};

export default MissionDetails;
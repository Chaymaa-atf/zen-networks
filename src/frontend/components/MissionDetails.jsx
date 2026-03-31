import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Heading,
  Inline,
  Lozenge,
  Stack,
  Text,
  Textfield,
  TextArea,
  Label,
  Select
} from '@forge/react';
import { xcss } from '@forge/react';
import { router } from '@forge/bridge';
import {
  getMissionAllDocuments,
  getMissionCharges,
  createCharge,
  generateMissionPdf
} from '../services/missionService';

/* ─────────────────────────────
   Styles
───────────────────────────── */

const cardStyles = xcss({
  backgroundColor: 'color.background.neutral.subtle',
  borderRadius: 'border.radius.200',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
  padding: 'space.200'
});

const infoCardStyles = xcss({
  backgroundColor: 'color.background.input',
  borderRadius: 'border.radius.200',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
  padding: 'space.150',
  flex: '1'
});

const sectionHeaderStyles = xcss({
  borderBottomWidth: 'border.width',
  borderBottomStyle: 'solid',
  borderBottomColor: 'color.border',
  paddingBottom: 'space.100',
  marginBottom: 'space.150'
});

const docItemStyles = xcss({
  borderBottomWidth: 'border.width',
  borderBottomStyle: 'solid',
  borderBottomColor: 'color.border',
  paddingBlock: 'space.100'
});

const labelStyles = xcss({
  fontSize: '11px',
  color: 'color.text.subtlest',
  fontWeight: 'font.weight.medium'
});

const formCardStyles = xcss({
  backgroundColor: 'color.background.input',
  borderRadius: 'border.radius.200',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
  padding: 'space.200'
});

const softBoxStyles = xcss({
  padding: 'space.200',
  textAlign: 'center',
  backgroundColor: 'color.background.neutral.subtle',
  borderRadius: 'border.radius.200'
});

/* Tableau charges */

const tableWrapperStyles = xcss({
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
  borderRadius: 'border.radius.200',
  overflow: 'hidden'
});

const tableHeaderRowStyles = xcss({
  backgroundColor: 'color.background.neutral.subtle',
  paddingBlock: 'space.100',
  paddingInline: 'space.150',
  borderBottomWidth: 'border.width',
  borderBottomStyle: 'solid',
  borderBottomColor: 'color.border'
});

const tableRowStyles = xcss({
  paddingBlock: 'space.100',
  paddingInline: 'space.150',
  borderBottomWidth: 'border.width',
  borderBottomStyle: 'solid',
  borderBottomColor: 'color.border'
});

const tableLastRowStyles = xcss({
  paddingBlock: 'space.100',
  paddingInline: 'space.150'
});

const colTypeStyles = xcss({
  width: '14%'
});

const colDetailsStyles = xcss({
  width: '26%'
});

const colDateStyles = xcss({
  width: '18%'
});

const colMontantStyles = xcss({
  width: '12%'
});

const colKeyStyles = xcss({
  width: '10%'
});

const colActionsStyles = xcss({
  width: '20%'
});

/* ─────────────────────────────
   Helpers
───────────────────────────── */

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

const CHARGE_TYPES = [
  { type: 'hebergement', label: 'Hébergement', emoji: '🏨' },
  { type: 'restaurant', label: 'Restaurant', emoji: '🍽️' },
  { type: 'transport', label: 'Transport', emoji: '🚗' }
];

const HEBERGEMENT_OPTIONS = [
  { label: 'Hôtel', value: 'hotel' },
  { label: 'Airbnb', value: 'airbnb' },
  { label: 'Autre', value: 'autre' }
];

const TRANSPORT_OPTIONS = [
  { label: 'Avion', value: 'avion' },
  { label: 'Taxi / Uber', value: 'taxi_uber' },
  { label: 'Voiture', value: 'voiture' }
];

const getChargeLabelFront = (type) => {
  switch (type) {
    case 'hebergement':
      return 'Hébergement';
    case 'restaurant':
      return 'Restaurant';
    case 'transport':
      return 'Transport';
    default:
      return 'Charge';
  }
};

const extractDescriptionLines = (charge) => {
  const content = charge?.fields?.description?.content || [];

  return content
    .map((block) => {
      const text = (block.content || [])
        .map((item) => item.text || '')
        .join('');
      return text.trim();
    })
    .filter(Boolean);
};

const normalizeText = (value) =>
  (value || '')
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const getLineValueFlexible = (lines, labels) => {
  const normalizedLines = lines.map((line) => ({
    raw: line,
    normalized: normalizeText(line)
  }));

  for (const label of labels) {
    const normalizedLabel = normalizeText(label);
    const prefix = `${normalizedLabel} :`;

    const found = normalizedLines.find((item) =>
      item.normalized.startsWith(prefix)
    );

    if (found) {
      const index = found.raw.indexOf(':');
      if (index !== -1) {
        return found.raw.slice(index + 1).trim();
      }
    }
  }

  return '';
};

const getChargeTypeFromSummary = (summary = '') => {
  const value = normalizeText(summary);

  if (value.includes('hebergement') || value.includes('hotel') || value.includes('airbnb')) {
    return 'Hébergement';
  }

  if (value.includes('restaurant')) {
    return 'Restaurant';
  }

  if (
    value.includes('transport') ||
    value.includes('avion') ||
    value.includes('taxi') ||
    value.includes('uber') ||
    value.includes('voiture')
  ) {
    return 'Transport';
  }

  return 'Charge';
};

const getChargeTableData = (charge) => {
  const summary = charge?.fields?.summary || '';
  const lines = extractDescriptionLines(charge);

  let typeHebergement = getLineValueFlexible(lines, [
    'Type hébergement',
    'Type hebergement'
  ]);

  let typeTransport = getLineValueFlexible(lines, [
    'Type transport'
  ]);

  const nomHebergement = getLineValueFlexible(lines, [
    'Nom hébergement',
    'Nom hebergement',
    'Nom hôtel',
    'Nom hotel',
    'Hotel',
    'Hôtel',
    'Hébergement'
  ]);

  const ville = getLineValueFlexible(lines, ['Ville']);

  const restaurant = getLineValueFlexible(lines, [
    'Restaurant / Fournisseur',
    'Restaurant',
    'Fournisseur',
    'Nom du restaurant / fournisseur'
  ]);

  const villeDepart = getLineValueFlexible(lines, ['Ville départ', 'Ville depart']);
  const villeArrivee = getLineValueFlexible(lines, ['Ville arrivée', 'Ville arrivee']);
  const compagnie = getLineValueFlexible(lines, ['Compagnie']);

  const typeVehicule = getLineValueFlexible(lines, ['Type véhicule', 'Type vehicule']);
  const chevaux = getLineValueFlexible(lines, ['Chevaux']);
  const kilometrage = getLineValueFlexible(lines, ['Kilométrage', 'Kilometrage']);

  const date = getLineValueFlexible(lines, ['Date']);
  const dateDebut = getLineValueFlexible(lines, ['Date début', 'Date debut']);
  const dateFin = getLineValueFlexible(lines, ['Date fin']);
  const montant = getLineValueFlexible(lines, ['Montant']);

  const normalizedSummary = normalizeText(summary);

  if (!typeHebergement) {
    if (normalizedSummary.includes('hotel')) {
      typeHebergement = 'Hôtel';
    } else if (normalizedSummary.includes('airbnb')) {
      typeHebergement = 'Airbnb';
    } else if (normalizedSummary.includes('autre')) {
      typeHebergement = 'Autre';
    }
  }

  if (!typeTransport) {
    if (normalizedSummary.includes('avion')) {
      typeTransport = 'Avion';
    } else if (normalizedSummary.includes('taxi') || normalizedSummary.includes('uber')) {
      typeTransport = 'Taxi / Uber';
    } else if (normalizedSummary.includes('voiture')) {
      typeTransport = 'Voiture';
    }
  }

  let details = '—';

  if (nomHebergement || typeHebergement || ville) {
    const parts = [];

    if (typeHebergement) parts.push(typeHebergement);
    if (nomHebergement) parts.push(nomHebergement);
    if (ville) parts.push(ville);

    details = parts.join(' - ');
  } else if (restaurant) {
    details = restaurant;
  } else if (typeTransport === 'Avion') {
    const parts = ['Avion'];
    if (villeDepart) parts.push(villeDepart);
    if (villeArrivee) parts.push(villeArrivee);
    if (compagnie) parts.push(compagnie);
    details = parts.join(' - ');
  } else if (typeTransport === 'Taxi / Uber') {
    details = 'Taxi / Uber';
  } else if (typeTransport === 'Voiture') {
    const parts = ['Voiture'];
    if (typeVehicule) parts.push(typeVehicule);
    if (chevaux) parts.push(`${chevaux} ch`);
    if (kilometrage) parts.push(`${kilometrage} km`);
    details = parts.join(' - ');
  } else if (summary) {
    details = summary;
  }

  let displayDate = '—';
  if (dateDebut && dateFin) {
    displayDate = `${dateDebut} → ${dateFin}`;
  } else if (dateDebut) {
    displayDate = dateDebut;
  } else if (date) {
    displayDate = date;
  }

  return {
    type: getChargeTypeFromSummary(summary),
    details,
    date: displayDate,
    montant: montant || '—',
    issueKey: charge?.key || '—'
  };
};

const MissionDetails = ({ mission, onBack }) => {
  const [attachments, setAttachments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  const [charges, setCharges] = useState([]);
  const [loadingCharges, setLoadingCharges] = useState(false);

  const [generatingPdf, setGeneratingPdf] = useState(false);

  const [selectedChargeType, setSelectedChargeType] = useState(null);
  const [showChargeForm, setShowChargeForm] = useState(false);

  const [chargeForm, setChargeForm] = useState({
    typeHebergement: null,
    typeTransport: null,
    nomHotel: '',
    ville: '',
    dateDebut: '',
    dateFin: '',
    montant: '',
    fournisseur: '',
    commentaire: '',
    date: '',
    villeDepart: '',
    villeArrivee: '',
    compagnie: '',
    typeVehicule: '',
    chevaux: '',
    kilometrage: ''
  });

  const [savingCharge, setSavingCharge] = useState(false);

  const getDurationDays = () => {
    if (!mission?.dateDepart || !mission?.dateRetour) return '—';

    const start = new Date(mission.dateDepart);
    const end = new Date(mission.dateRetour);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '—';

    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return diffDays > 0 ? diffDays : '—';
  };

  const resetChargeForm = () => {
    setChargeForm({
      typeHebergement: null,
      typeTransport: null,
      nomHotel: '',
      ville: '',
      dateDebut: '',
      dateFin: '',
      montant: '',
      fournisseur: '',
      commentaire: '',
      date: '',
      villeDepart: '',
      villeArrivee: '',
      compagnie: '',
      typeVehicule: '',
      chevaux: '',
      kilometrage: ''
    });
  };

  const updateChargeField = (field, value) => {
    setChargeForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const openChargeForm = (type) => {
    setSelectedChargeType(type);
    resetChargeForm();
    setShowChargeForm(true);
  };

  const closeChargeForm = () => {
    setShowChargeForm(false);
    setSelectedChargeType(null);
    resetChargeForm();
  };

  const openJiraIssue = async () => {
    if (mission?.issueKey) {
      await router.open(`/browse/${mission.issueKey}`);
    }
  };

  const openAttachment = async (id, filename) => {
    await router.open(`/secure/attachment/${id}/${filename}`);
  };

  const downloadAttachment = async (id) => {
    try {
      await router.open(`/rest/api/2/attachment/content/${id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGeneratePdf = async () => {
    try {
      if (!mission?.issueKey) {
        window.alert('Mission introuvable.');
        return;
      }

      setGeneratingPdf(true);

      const res = await generateMissionPdf(mission.issueKey);

      if (!res?.success) {
        window.alert(res?.message || 'Erreur lors de la génération du PDF.');
        return;
      }

      const byteCharacters = atob(res.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i += 1) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = res.fileName || `mission-${mission.issueKey}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      if (res.skippedFiles?.length > 0) {
        const skipped = res.skippedFiles
          .map((f) => `- ${f.filename} (${f.reason})`)
          .join('\n');

        window.alert(`PDF généré avec succès.\n\nFichiers ignorés :\n${skipped}`);
      }
    } catch (e) {
      console.error(e);
      window.alert('Erreur lors de la génération du PDF.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const loadAttachments = async () => {
    if (!mission?.issueKey) {
      setAttachments([]);
      return;
    }

    try {
      setLoadingAttachments(true);
      const res = await getMissionAllDocuments(mission.issueKey);
      setAttachments(res?.success ? res.attachments || [] : []);
    } catch (e) {
      console.error(e);
      setAttachments([]);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const loadCharges = async () => {
    if (!mission?.issueKey) {
      setCharges([]);
      return;
    }

    try {
      setLoadingCharges(true);
      const res = await getMissionCharges(mission.issueKey);
      setCharges(res?.success ? res.charges || [] : []);
    } catch (e) {
      console.error(e);
      setCharges([]);
    } finally {
      setLoadingCharges(false);
    }
  };

  const validateChargeForm = () => {
    if (!selectedChargeType) {
      return 'Type de charge introuvable.';
    }

    if (selectedChargeType === 'hebergement') {
      if (
        !chargeForm.typeHebergement ||
        !chargeForm.nomHotel ||
        !chargeForm.ville ||
        !chargeForm.dateDebut ||
        !chargeForm.dateFin
      ) {
        return 'Merci de remplir type hébergement, nom, ville, date début et date fin.';
      }
    }

    if (selectedChargeType === 'restaurant') {
      if (!chargeForm.fournisseur || !chargeForm.date || !chargeForm.montant) {
        return 'Merci de remplir restaurant, date et montant.';
      }
    }

    if (selectedChargeType === 'transport') {
      if (!chargeForm.typeTransport) {
        return 'Merci de choisir un type de transport.';
      }

      if (chargeForm.typeTransport?.value === 'avion') {
        if (
          !chargeForm.villeDepart ||
          !chargeForm.villeArrivee ||
          !chargeForm.date ||
          !chargeForm.compagnie ||
          !chargeForm.montant
        ) {
          return 'Merci de remplir les informations de l’avion.';
        }
      }

      if (chargeForm.typeTransport?.value === 'taxi_uber') {
        if (!chargeForm.date || !chargeForm.montant) {
          return 'Merci de remplir date et montant pour Taxi / Uber.';
        }
      }

      if (chargeForm.typeTransport?.value === 'voiture') {
        if (
          !chargeForm.typeVehicule ||
          !chargeForm.chevaux ||
          !chargeForm.kilometrage ||
          !chargeForm.date ||
          !chargeForm.montant
        ) {
          return 'Merci de remplir les informations de la voiture.';
        }
      }
    }

    return null;
  };

  const handleSaveCharge = async () => {
    try {
      if (!mission?.issueKey) {
        window.alert('Mission introuvable.');
        return;
      }

      const validationError = validateChargeForm();
      if (validationError) {
        window.alert(validationError);
        return;
      }

      setSavingCharge(true);

      const payload = {
        issueKey: mission.issueKey,
        type: selectedChargeType,
        ...chargeForm,
        typeHebergement: chargeForm.typeHebergement?.value || '',
        typeTransport: chargeForm.typeTransport?.value || ''
      };

      const res = await createCharge(payload);

      if (res?.success) {
        window.alert(res.message || 'Charge créée avec succès.');
        closeChargeForm();
        await loadCharges();

        if (res.chargeKey) {
          await router.open(`/browse/${res.chargeKey}`);
        }
      } else {
        window.alert(res?.message || "Erreur lors de l'ajout de la charge.");
      }
    } catch (e) {
      console.error(e);
      window.alert("Erreur lors de l'ajout de la charge.");
    } finally {
      setSavingCharge(false);
    }
  };

  const handleUploadForCharge = async (chargeKey) => {
    try {
      await router.open(`/browse/${chargeKey}`);
    } catch (e) {
      console.error(e);
      window.alert("Impossible d'ouvrir le ticket Jira.");
    }
  };

  const renderChargeForm = () => {
    if (!showChargeForm || !selectedChargeType) {
      return null;
    }

    return (
      <Box xcss={formCardStyles}>
        <Stack space="space.150">
          <Heading size="small">
            Formulaire : {getChargeLabelFront(selectedChargeType)}
          </Heading>

          {selectedChargeType === 'hebergement' && (
            <Stack space="space.100">
              <Label>Type hébergement</Label>
              <Select
                options={HEBERGEMENT_OPTIONS}
                value={chargeForm.typeHebergement}
                onChange={(value) => updateChargeField('typeHebergement', value)}
                placeholder="Choisir un type"
              />

              <Label>
                {chargeForm.typeHebergement?.value === 'hotel'
                  ? 'Nom hôtel'
                  : chargeForm.typeHebergement?.value === 'airbnb'
                  ? 'Nom Airbnb'
                  : 'Nom hébergement'}
              </Label>
              <Textfield
                value={chargeForm.nomHotel}
                onChange={(e) => updateChargeField('nomHotel', e.target.value)}
              />

              <Label>Ville</Label>
              <Textfield
                value={chargeForm.ville}
                onChange={(e) => updateChargeField('ville', e.target.value)}
              />

              <Label>Date début</Label>
              <Textfield
                type="date"
                value={chargeForm.dateDebut}
                onChange={(e) => updateChargeField('dateDebut', e.target.value)}
              />

              <Label>Date fin</Label>
              <Textfield
                type="date"
                value={chargeForm.dateFin}
                onChange={(e) => updateChargeField('dateFin', e.target.value)}
              />

              <Label>Montant</Label>
              <Textfield
                value={chargeForm.montant}
                onChange={(e) => updateChargeField('montant', e.target.value)}
              />

              <Label>Commentaire</Label>
              <TextArea
                value={chargeForm.commentaire}
                onChange={(e) => updateChargeField('commentaire', e.target.value)}
              />
            </Stack>
          )}

          {selectedChargeType === 'restaurant' && (
            <Stack space="space.100">
              <Label>Nom du restaurant / fournisseur</Label>
              <Textfield
                value={chargeForm.fournisseur}
                onChange={(e) => updateChargeField('fournisseur', e.target.value)}
              />

              <Label>Date</Label>
              <Textfield
                type="date"
                value={chargeForm.date}
                onChange={(e) => updateChargeField('date', e.target.value)}
              />

              <Label>Montant</Label>
              <Textfield
                value={chargeForm.montant}
                onChange={(e) => updateChargeField('montant', e.target.value)}
              />

              <Label>Commentaire</Label>
              <TextArea
                value={chargeForm.commentaire}
                onChange={(e) => updateChargeField('commentaire', e.target.value)}
              />
            </Stack>
          )}

          {selectedChargeType === 'transport' && (
            <Stack space="space.100">
              <Label>Type de transport</Label>
              <Select
                options={TRANSPORT_OPTIONS}
                value={chargeForm.typeTransport}
                onChange={(value) => updateChargeField('typeTransport', value)}
                placeholder="Choisir un transport"
              />

              {chargeForm.typeTransport?.value === 'avion' && (
                <>
                  <Label>Ville départ</Label>
                  <Textfield
                    value={chargeForm.villeDepart}
                    onChange={(e) => updateChargeField('villeDepart', e.target.value)}
                  />

                  <Label>Ville arrivée</Label>
                  <Textfield
                    value={chargeForm.villeArrivee}
                    onChange={(e) => updateChargeField('villeArrivee', e.target.value)}
                  />

                  <Label>Compagnie</Label>
                  <Textfield
                    value={chargeForm.compagnie}
                    onChange={(e) => updateChargeField('compagnie', e.target.value)}
                  />
                </>
              )}

              {chargeForm.typeTransport?.value === 'voiture' && (
                <>
                  <Label>Type véhicule</Label>
                  <Textfield
                    value={chargeForm.typeVehicule}
                    onChange={(e) => updateChargeField('typeVehicule', e.target.value)}
                  />

                  <Label>Chevaux</Label>
                  <Textfield
                    value={chargeForm.chevaux}
                    onChange={(e) => updateChargeField('chevaux', e.target.value)}
                  />

                  <Label>Kilométrage</Label>
                  <Textfield
                    value={chargeForm.kilometrage}
                    onChange={(e) => updateChargeField('kilometrage', e.target.value)}
                  />
                </>
              )}

              <Label>Date</Label>
              <Textfield
                type="date"
                value={chargeForm.date}
                onChange={(e) => updateChargeField('date', e.target.value)}
              />

              <Label>Montant</Label>
              <Textfield
                value={chargeForm.montant}
                onChange={(e) => updateChargeField('montant', e.target.value)}
              />

              <Label>Commentaire</Label>
              <TextArea
                value={chargeForm.commentaire}
                onChange={(e) => updateChargeField('commentaire', e.target.value)}
              />
            </Stack>
          )}

          <Inline space="space.100">
            <Button appearance="primary" onClick={handleSaveCharge} isDisabled={savingCharge}>
              {savingCharge ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
            <Button appearance="subtle" onClick={closeChargeForm} isDisabled={savingCharge}>
              Annuler
            </Button>
          </Inline>
        </Stack>
      </Box>
    );
  };

  useEffect(() => {
    if (!mission) return;
    loadAttachments();
    loadCharges();
  }, [mission?.issueKey, mission?.id]);

  if (!mission) {
    return <Text>Aucune mission sélectionnée.</Text>;
  }

  return (
    <Stack space="space.300">
      <Inline space="space.100" alignBlock="center">
        <Button appearance="subtle" onClick={onBack}>
          ← Retour
        </Button>
        <Text color="color.text.subtlest">Mes missions /</Text>
        <Text color="color.text.subtle">{mission.titre}</Text>
      </Inline>

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

      <Inline space="space.100" alignBlock="start">
        {[
          { label: 'Destination', value: mission.destination },
          { label: 'Pays', value: mission.pays },
          { label: 'Ville', value: mission.ville },
          { label: 'Départ', value: mission.dateDepart },
          { label: 'Retour', value: mission.dateRetour },
          { label: 'Motif', value: mission.motif },
          { label: 'Nombre de jours', value: `${getDurationDays()} jour(s)` }
        ].map(({ label, value }) => (
          <Box key={label} xcss={infoCardStyles}>
            <Stack space="space.050">
              <Text xcss={labelStyles}>{label.toUpperCase()}</Text>
              <Text>{value || '—'}</Text>
            </Stack>
          </Box>
        ))}
      </Inline>

      <Stack space="space.150">
        <Box xcss={sectionHeaderStyles}>
          <Heading size="small">Charges de mission</Heading>
        </Box>

        <Inline space="space.100">
          {CHARGE_TYPES.map(({ type, label, emoji }) => (
            <Button
              key={type}
              appearance={selectedChargeType === type && showChargeForm ? 'primary' : 'subtle'}
              onClick={() => openChargeForm(type)}
            >
              {emoji} {label}
            </Button>
          ))}
        </Inline>

        {renderChargeForm()}

        {loadingCharges && (
          <Text color="color.text.subtlest">Chargement des charges...</Text>
        )}

        {!loadingCharges && charges.length === 0 && (
          <Box xcss={softBoxStyles}>
            <Text color="color.text.subtlest">Aucune charge enregistrée.</Text>
          </Box>
        )}

        {!loadingCharges && charges.length > 0 && (
          <Box xcss={tableWrapperStyles}>
            <Box xcss={tableHeaderRowStyles}>
              <Inline spread="space-between" alignBlock="center">
                <Box xcss={colTypeStyles}>
                  <Text xcss={labelStyles}>TYPE</Text>
                </Box>
                <Box xcss={colDetailsStyles}>
                  <Text xcss={labelStyles}>DÉTAILS</Text>
                </Box>
                <Box xcss={colDateStyles}>
                  <Text xcss={labelStyles}>DATE(S)</Text>
                </Box>
                <Box xcss={colMontantStyles}>
                  <Text xcss={labelStyles}>MONTANT</Text>
                </Box>
                <Box xcss={colKeyStyles}>
                  <Text xcss={labelStyles}>CLÉ</Text>
                </Box>
                <Box xcss={colActionsStyles}>
                  <Text xcss={labelStyles}>ACTIONS</Text>
                </Box>
              </Inline>
            </Box>

            {charges.map((charge, index) => {
              const row = getChargeTableData(charge);
              const isLast = index === charges.length - 1;

              return (
                <Box
                  key={charge.id || charge.key}
                  xcss={isLast ? tableLastRowStyles : tableRowStyles}
                >
                  <Inline spread="space-between" alignBlock="start">
                    <Box xcss={colTypeStyles}>
                      <Text>{row.type}</Text>
                    </Box>

                    <Box xcss={colDetailsStyles}>
                      <Text>{row.details}</Text>
                    </Box>

                    <Box xcss={colDateStyles}>
                      <Text>{row.date}</Text>
                    </Box>

                    <Box xcss={colMontantStyles}>
                      <Text>{row.montant}</Text>
                    </Box>

                    <Box xcss={colKeyStyles}>
                      <Text
                        xcss={xcss({
                          color: 'color.link',
                          fontWeight: 'font.weight.medium',
                          fontSize: '12px'
                        })}
                      >
                        {row.issueKey}
                      </Text>
                    </Box>

                    <Box xcss={colActionsStyles}>
                      <Inline space="space.050">
                        <Button
                          appearance="subtle"
                          onClick={() => router.open(`/browse/${charge.key}`)}
                        >
                          Ouvrir
                        </Button>

                        <Button
                          appearance="primary"
                          onClick={() => handleUploadForCharge(charge.key)}
                        >
                          + Pièce jointe
                        </Button>
                      </Inline>
                    </Box>
                  </Inline>
                </Box>
              );
            })}
          </Box>
        )}
      </Stack>

      <Stack space="space.150">
        <Box xcss={sectionHeaderStyles}>
          <Inline spread="space-between" alignBlock="center">
            <Heading size="small">Documents de mission</Heading>

            <Inline space="space.100">
              <Button
                appearance="default"
                onClick={handleGeneratePdf}
                isDisabled={generatingPdf || attachments.length === 0}
              >
                {generatingPdf ? 'Génération...' : '📄 Générer PDF'}
              </Button>

              <Button appearance="primary" onClick={openJiraIssue} isDisabled={!mission.issueKey}>
                + Ajouter document
              </Button>
            </Inline>
          </Inline>
        </Box>

        {loadingAttachments && (
          <Text color="color.text.subtlest">Chargement des documents...</Text>
        )}

        {!loadingAttachments && attachments.length === 0 && (
          <Box xcss={softBoxStyles}>
            <Text color="color.text.subtlest">Aucun document attaché.</Text>
          </Box>
        )}

        {!loadingAttachments && attachments.length > 0 && (
          <Stack space="space.0">
            {attachments.map((file, index) => (
              <Box key={`${file.id}-${index}`} xcss={docItemStyles}>
                <Stack space="space.050">
                  <Inline spread="space-between" alignBlock="center">
                    <Stack space="space.025">
                      <Text>📎 {file.filename}</Text>
                      <Text color="color.text.subtlest">
                        Source : {file.sourceType} ({file.sourceIssueKey})
                      </Text>
                    </Stack>

                    <Inline space="space.075">
                      <Button
                        appearance="subtle"
                        onClick={() => openAttachment(file.id, file.filename)}
                      >
                        Ouvrir
                      </Button>

                      <Button
                        appearance="subtle"
                        onClick={() => downloadAttachment(file.id)}
                      >
                        Télécharger
                      </Button>
                    </Inline>
                  </Inline>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Stack>

      <Box>
        <Button appearance="primary" onClick={onBack}>
          ← Retour à la liste
        </Button>
      </Box>
    </Stack>
  );
};

export default MissionDetails;
import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Heading,
  Inline,
  Label,
  Stack,
  Text,
  TextArea,
  Textfield
} from '@forge/react';
import { xcss } from '@forge/react';
import { generateOrdreMissionPdf } from '../services/missionService';
import logo from '../assets/logo.png';

const cardStyles = xcss({
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
  borderRadius: 'border.radius.200',
  padding: 'space.200',
  backgroundColor: 'color.background.neutral.subtle'
});

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const cleanText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const uniqueLines = (items) => {
  const seen = new Set();

  return items
    .filter(Boolean)
    .filter((item) => {
      const key = cleanText(item);

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    })
    .join('\n');
};

const getTransportLabel = (item) => {
  const text = cleanText(`${item.details || ''} ${item.fileName || ''}`);

  if (text.includes('train')) return 'Train';

  if (
    text.includes('avion') ||
    text.includes('billet')
  ) {
    return 'Avion';
  }

  if (
    text.includes('taxi') ||
    text.includes('uber')
  ) {
    return 'Taxi / Uber';
  }

  if (text.includes('voiture')) {
    return 'Voiture';
  }

  return item.details || 'Transport';
};

const getHebergementLabel = (item) => {
  const text = cleanText(`${item.details || ''} ${item.fileName || ''}`);

  if (
    text.includes('hotel') ||
    text.includes('hôtel')
  ) {
    return "Hôtel pris en charge par l'entreprise";
  }

  if (
    text.includes('airbnb') ||
    text.includes('appartement') ||
    text.includes('apartment')
  ) {
    return "Appartement pris en charge par l'entreprise";
  }

  return "Hébergement pris en charge par l'entreprise";
};

const getRestaurantLabel = () => {
  return 'Remboursement sur justificatifs';
};

const OrdreMissionForm = ({ mission, analyses = [], onBack }) => {
  const [generating, setGenerating] = useState(false);

  const missionAnalyses = analyses.filter(
    (a) => a.missionIssueKey === mission.issueKey
  );

  const transports = missionAnalyses.filter(
    (a) => normalizeText(a.category || a.type) === 'transport'
  );

  const hebergements = missionAnalyses.filter(
    (a) => normalizeText(a.category || a.type) === 'hebergement'
  );

  const restaurants = missionAnalyses.filter(
    (a) => normalizeText(a.category || a.type) === 'restaurant'
  );

  const [form, setForm] = useState({
    nomPrenom: '',
    fonction: 'Collaborateur',
    cin: '',
    natureMission: '',
    lieuMission: '',
    pays: '',
    dateDepart: '',
    dateRetour: '',
    duree: '',
    transports: '',
    hebergements: '',
    restaurants: ''
  });

  const getDurationDays = () => {
    if (!mission?.dateDepart || !mission?.dateRetour) return '';

    const start = new Date(mission.dateDepart);
    const end = new Date(mission.dateRetour);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';

    const diff = end.getTime() - start.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;

    return days > 0 ? `${days} jour(s)` : '';
  };

  useEffect(() => {
    setForm({
      nomPrenom: `${mission?.prenomEmploye || ''} ${mission?.nomEmploye || ''}`.trim(),
      fonction: 'Collaborateur',
      cin: '',
      natureMission: mission?.titre || '',
      lieuMission: mission?.ville || '',
      pays: mission?.pays || mission?.destination || '',
      dateDepart: mission?.dateDepart || '',
      dateRetour: mission?.dateRetour || '',
      duree: getDurationDays(),

      transports: uniqueLines(
        transports.map((a) => getTransportLabel(a))
      ),

      hebergements: uniqueLines(
        hebergements.map((a) => getHebergementLabel(a))
      ),

      restaurants:
        restaurants.length > 0
          ? getRestaurantLabel()
          : ''
    });
  }, [mission?.id]);

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const downloadPdf = (res) => {
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
    link.download = res.fileName || 'ordre-mission.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  };
const getLogoBase64 = async () => {
  const response = await fetch(logo);
  const blob = await response.blob();

  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(blob);
  });
};
  const handleGenerate = async () => {
    try {
      setGenerating(true);

     const logoBase64 = await getLogoBase64();

        const res = await generateOrdreMissionPdf({
        missionId: mission.id,
        ordreData: form,
        logoBase64
        });

      if (!res?.success) {
        window.alert(res?.message || 'Erreur génération ordre de mission.');
        return;
      }

      downloadPdf(res);
    } catch (error) {
      console.error(error);
      window.alert('Erreur génération PDF.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Stack space="space.300">
      <Inline spread="space-between" alignBlock="center">
        <Heading size="large">Vérification ordre de mission</Heading>

        <Button appearance="subtle" onClick={onBack}>
          ← Retour
        </Button>
      </Inline>

      <Box xcss={cardStyles}>
        <Stack space="space.150">
          <Heading size="medium">Informations collaborateur</Heading>

          <Label>Nom et prénom</Label>
          <Textfield
            value={form.nomPrenom}
            onChange={(e) => updateField('nomPrenom', e.target.value)}
          />

          <Label>Fonction</Label>
          <Textfield
            value={form.fonction}
            onChange={(e) => updateField('fonction', e.target.value)}
          />

          <Label>CIN</Label>
          <Textfield
            value={form.cin}
            placeholder="Saisir CIN"
            onChange={(e) => updateField('cin', e.target.value)}
          />
        </Stack>
      </Box>

      <Box xcss={cardStyles}>
        <Stack space="space.150">
          <Heading size="medium">Mission</Heading>

          <Label>Nature de la mission</Label>
          <Textfield
            value={form.natureMission}
            onChange={(e) => updateField('natureMission', e.target.value)}
          />

          <Label>Lieu de la mission</Label>
          <Textfield
            value={form.lieuMission}
            onChange={(e) => updateField('lieuMission', e.target.value)}
          />

          <Label>Pays</Label>
          <Textfield
            value={form.pays}
            onChange={(e) => updateField('pays', e.target.value)}
          />
        </Stack>
      </Box>

      <Box xcss={cardStyles}>
        <Stack space="space.150">
          <Heading size="medium">Frais et moyens</Heading>

          <Label>Moyens de transport</Label>
          <TextArea
            value={form.transports}
            onChange={(e) => updateField('transports', e.target.value)}
          />

          <Label>Hébergement</Label>
          <TextArea
            value={form.hebergements}
            onChange={(e) => updateField('hebergements', e.target.value)}
          />

          <Label>Restauration</Label>
          <TextArea
            value={form.restaurants}
            onChange={(e) => updateField('restaurants', e.target.value)}
          />
        </Stack>
      </Box>

      <Inline space="space.100">
        <Button
          appearance="primary"
          onClick={handleGenerate}
          isDisabled={generating}
        >
          {generating
            ? 'Génération...'
            : 'Générer ordre de mission'}
        </Button>

        <Button
            appearance="subtle"
            onClick={() => {
                if (onBack) {
                onBack();
                }
            }}
            >
            ← Retour
            </Button>
      </Inline>
    </Stack>
  );
};

export default OrdreMissionForm;
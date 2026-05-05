import React, { useState } from 'react';
import {
  Box,
  Button,
  Heading,
  Label,
  RadioGroup,
  Stack,
  Text,
  Textfield
} from '@forge/react';
import { xcss } from '@forge/react';
import { saveAppConfig } from '../services/missionService';

const cardStyles = xcss({
  backgroundColor: 'color.background.neutral.subtle',
  borderRadius: 'border.radius.200',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
  padding: 'space.300'
});

const AppConfiguration = ({ onConfigured }) => {
  const [mode, setMode] = useState('existing');
  const [projectKey, setProjectKey] = useState('');
  const [projectName, setProjectName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);

      const res = await saveAppConfig({
        mode,
        projectKey,
        projectName
      });

      if (!res?.success) {
        window.alert(res?.message || 'Erreur configuration.');
        return;
      }

      window.alert('Configuration enregistrée avec succès.');
      onConfigured(res.config);
    } catch (error) {
      console.error(error);
      window.alert('Erreur lors de la configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box xcss={cardStyles}>
      <Stack space="space.200">
        <Heading size="large">Configuration de l’application</Heading>

        <Text>
          Avant d’utiliser l’application, veuillez choisir le projet Jira à lier avec la gestion des missions.
        </Text>

        <RadioGroup
          label="Choix de configuration"
          options={[
            {
              name: 'mode',
              value: 'existing',
              label: 'Lier avec un projet Jira existant'
            },
            {
              name: 'mode',
              value: 'new',
              label: 'Créer un nouveau projet Jira pour les missions'
            }
          ]}
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        />

        {mode === 'existing' && (
          <Stack space="space.100">
            <Label>Clé du projet Jira</Label>
            <Textfield
              value={projectKey}
              placeholder="Exemple : FOR"
              onChange={(e) => setProjectKey(e.target.value)}
            />

            <Label>Nom du projet</Label>
            <Textfield
              value={projectName}
              placeholder="Exemple : Gestion des missions"
              onChange={(e) => setProjectName(e.target.value)}
            />
          </Stack>
        )}

        {mode === 'new' && (
          <Stack space="space.100">
            <Label>Nom du nouveau projet</Label>
            <Textfield
              value={projectName}
              placeholder="Exemple : Gestion des missions"
              onChange={(e) => setProjectName(e.target.value)}
            />

            <Text color="color.text.subtlest">
              Pour l’instant, cette option prépare la configuration. La création automatique du projet Jira peut être ajoutée après.
            </Text>
          </Stack>
        )}

        <Button appearance="primary" onClick={handleSave} isDisabled={saving}>
          {saving ? 'Enregistrement...' : 'Enregistrer la configuration'}
        </Button>
      </Stack>
    </Box>
  );
};

export default AppConfiguration;
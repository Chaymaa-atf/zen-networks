import React, { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  Stack,
  Button,
  Text,
  Textfield,
  Inline,
  Image
} from '@forge/react';

import { xcss } from '@forge/react';

import GestionRoles from './GestionRoles';
import logo from '../assets/logo.png';

import {
  getOrdreMissionConfig,
  saveOrdreMissionConfig
} from '../services/missionService';

const cardStyles = xcss({
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
  borderRadius: 'border.radius.200',
  padding: 'space.200',
  backgroundColor: 'color.background.neutral.subtle'
});

const logoBoxStyles = xcss({
  borderWidth: 'border.width',
  borderStyle: 'dashed',
  borderColor: 'color.border.discovery',
  borderRadius: 'border.radius.200',
  padding: 'space.200',
  textAlign: 'center',
  backgroundColor: 'color.background.discovery'
});

const defaultConfig = {
  companyName: 'Zen Networks',
  ice: '001867 807 0000',
  address: '460 - 461, Technopark Boulevard Dammam Casablanca 20000 Morocco',
  phone: '+212 522 784 589 / +212 661 560 337',
  email: 'contact@zen-networks.ma',
  rc: '34163',
  cnss: '5446895',
  ifNumber: '20746278',
  patente: '67519049'
};

const Parametres = () => {
  const [config, setConfig] = useState(defaultConfig);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const updateField = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const loadConfig = async () => {
    const res = await getOrdreMissionConfig();

    if (res?.success) {
      setConfig(res.config || defaultConfig);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    const res = await saveOrdreMissionConfig(config);

    if (res?.success) {
      setMessage('Paramètres enregistrés avec succès.');
      setIsEditing(false);
    } else {
      setMessage(res?.message || 'Erreur lors de l’enregistrement.');
    }

    setSaving(false);
  };

  const handleCancel = async () => {
    setIsEditing(false);
    setMessage('');
    await loadConfig();
  };

  return (
    <Stack space="space.300">
      <Heading size="large">Paramètres</Heading>

      <Box xcss={cardStyles}>
        <GestionRoles />
      </Box>

      <Box xcss={cardStyles}>
        <Stack space="space.200">
          <Inline spread="space-between" alignBlock="center">
            <Heading size="medium">Paramètres ordre de mission</Heading>

            {!isEditing ? (
              <Button appearance="primary" onClick={() => setIsEditing(true)}>
                Modifier
              </Button>
            ) : (
              <Inline space="space.100">
                <Button appearance="primary" onClick={handleSave} isDisabled={saving}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>

                <Button appearance="subtle" onClick={handleCancel} isDisabled={saving}>
                  Annuler
                </Button>
              </Inline>
            )}
          </Inline>

          {message && <Text>{message}</Text>}

          <Stack space="space.100">
            <Text>Logo entreprise</Text>

            <Box xcss={logoBoxStyles}>
              <Stack space="space.100">
                <Image src={logo} alt="Logo entreprise" />

                <Text color="color.text.subtlest">
                  Logo actuel de l’entreprise
                </Text>
              </Stack>
            </Box>
          </Stack>

          <Text>Nom entreprise</Text>
          <Textfield
            value={config.companyName}
            isDisabled={!isEditing}
            onChange={(e) => updateField('companyName', e.target.value)}
          />

          <Text>ICE</Text>
          <Textfield
            value={config.ice}
            isDisabled={!isEditing}
            onChange={(e) => updateField('ice', e.target.value)}
          />

          <Text>Adresse</Text>
          <Textfield
            value={config.address}
            isDisabled={!isEditing}
            onChange={(e) => updateField('address', e.target.value)}
          />

          <Text>Téléphone</Text>
          <Textfield
            value={config.phone}
            isDisabled={!isEditing}
            onChange={(e) => updateField('phone', e.target.value)}
          />

          <Text>Email</Text>
          <Textfield
            value={config.email}
            isDisabled={!isEditing}
            onChange={(e) => updateField('email', e.target.value)}
          />

          <Text>RC</Text>
          <Textfield
            value={config.rc}
            isDisabled={!isEditing}
            onChange={(e) => updateField('rc', e.target.value)}
          />

          <Text>CNSS</Text>
          <Textfield
            value={config.cnss}
            isDisabled={!isEditing}
            onChange={(e) => updateField('cnss', e.target.value)}
          />

          <Text>IF</Text>
          <Textfield
            value={config.ifNumber}
            isDisabled={!isEditing}
            onChange={(e) => updateField('ifNumber', e.target.value)}
          />

          <Text>Patente</Text>
          <Textfield
            value={config.patente}
            isDisabled={!isEditing}
            onChange={(e) => updateField('patente', e.target.value)}
          />
        </Stack>
      </Box>
    </Stack>
  );
};

export default Parametres;
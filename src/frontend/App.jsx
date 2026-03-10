import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Heading,
  SectionMessage,
  Stack,
  Text
} from '@forge/react';
import MissionForm from './components/MissionForm';
import MissionList from './components/MissionList';
import { createMission, getMissions } from './services/missionService';

const App = () => {
  const [showForm, setShowForm] = useState(false);
  const [missions, setMissions] = useState([]);
  const [loadingMissions, setLoadingMissions] = useState(true);
  const [resultMessage, setResultMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const loadMissions = async () => {
    try {
      setLoadingMissions(true);
      const response = await getMissions();

      if (response.success) {
        setMissions(response.missions || []);
      } else {
        setMissions([]);
        setIsError(true);
        setResultMessage(response.message || 'Erreur lors du chargement des missions.');
      }
    } catch (error) {
      setMissions([]);
      setIsError(true);
      setResultMessage(`Erreur frontend: ${error.message}`);
    } finally {
      setLoadingMissions(false);
    }
  };

  useEffect(() => {
    loadMissions();
  }, []);

  const handleCreateMission = async (data) => {
    setResultMessage('');
    setIsError(false);

    try {
      const response = await createMission(data);

      setResultMessage(response.message);
      setIsError(!response.success);

      if (response.success) {
        setShowForm(false);
        await loadMissions();
      }
    } catch (error) {
      setIsError(true);
      setResultMessage(`Erreur frontend: ${error.message}`);
    }
  };

  return (
    <Box>
      <Stack space="space.300">
        <Heading size="large">Gestion des missions</Heading>

        {!showForm && (
          <Button appearance="primary" onClick={() => setShowForm(true)}>
            Créer mission
          </Button>
        )}

        {resultMessage && (
          <SectionMessage appearance={isError ? 'error' : 'success'}>
            <Text>{resultMessage}</Text>
          </SectionMessage>
        )}

        {showForm && (
          <MissionForm
            onSubmit={handleCreateMission}
            onCancel={() => setShowForm(false)}
          />
        )}

        <MissionList missions={missions} loading={loadingMissions} />
      </Stack>
    </Box>
  );
};

export default App;
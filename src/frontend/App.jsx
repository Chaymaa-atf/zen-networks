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
import MissionDetails from './components/MissionDetails';
import {
  createMission,
  getMissions,
  getMissionById
} from './services/missionService';

const App = () => {
  const [showForm, setShowForm] = useState(false);
  const [missions, setMissions] = useState([]);
  const [loadingMissions, setLoadingMissions] = useState(true);
  const [resultMessage, setResultMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const [selectedMission, setSelectedMission] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

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
        setShowDetails(false);
        setSelectedMission(null);
        await loadMissions();
      }
    } catch (error) {
      setIsError(true);
      setResultMessage(`Erreur frontend: ${error.message}`);
    }
  };

  const handleViewDetails = async (missionId) => {
    setResultMessage('');
    setIsError(false);

    try {
      const response = await getMissionById(missionId);

      if (response.success) {
        setSelectedMission(response.mission);
        setShowDetails(true);
        setShowForm(false);
      } else {
        setIsError(true);
        setResultMessage(response.message || 'Impossible de charger le détail.');
      }
    } catch (error) {
      setIsError(true);
      setResultMessage(`Erreur frontend: ${error.message}`);
    }
  };

  const handleBackToList = () => {
    setShowDetails(false);
    setSelectedMission(null);
  };

  return (
  <Box>
    <Stack space="space.300">
      <Stack space="space.100">
        
      </Stack>

      {!showForm && !showDetails && (
        <Button appearance="primary" onClick={() => setShowForm(true)}>
          Créer une mission
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

      {showDetails && (
        <MissionDetails
          mission={selectedMission}
          onBack={handleBackToList}
        />
      )}

      {!showForm && !showDetails && (
        <MissionList
          missions={missions}
          loading={loadingMissions}
          onViewDetails={handleViewDetails}
        />
      )}
    </Stack>
  </Box>
);
};

export default App;
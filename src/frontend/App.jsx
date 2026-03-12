import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Heading,
  SectionMessage,
  Stack,
  Text
} from '@forge/react';
import { view } from '@forge/bridge';
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

  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('employe');

  const loadMissions = async (userId) => {
    try {
      setLoadingMissions(true);
      const response = await getMissions(userId);

      if (response.success) {
        setMissions(response.missions || []);
        setUserRole(response.role || 'employe');
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
    const init = async () => {
      try {
        const context = await view.getContext();
        console.log('CONTEXT = ', context);

        const accountId =
          context?.accountId ||
          context?.extension?.accountId ||
          context?.extension?.principal?.accountId ||
          '';

        const displayName =
          context?.displayName ||
          context?.extension?.principal?.displayName ||
          'Utilisateur';

        if (!accountId) {
          setIsError(true);
          setResultMessage("Impossible de récupérer l'utilisateur connecté.");
          setLoadingMissions(false);
          return;
        }

        const user = {
          accountId,
          displayName
        };

        setCurrentUser(user);
        await loadMissions(accountId);
      } catch (error) {
        setIsError(true);
        setResultMessage(`Erreur initialisation: ${error.message}`);
        setLoadingMissions(false);
      }
    };

    init();
  }, []);

  const handleCreateMission = async (data) => {
    setResultMessage('');
    setIsError(false);

    try {
      const response = await createMission({
        ...data,
        createdBy: currentUser?.accountId,
        createdByName: currentUser?.displayName
      });

      setResultMessage(response.message);
      setIsError(!response.success);

      if (response.success) {
        setShowForm(false);
        setShowDetails(false);
        setSelectedMission(null);
        await loadMissions(currentUser?.accountId);
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

  const handleBackToList = async () => {
    setShowDetails(false);
    setSelectedMission(null);

    if (currentUser?.accountId) {
      await loadMissions(currentUser.accountId);
    }
  };

  return (
    <Box>
      <Stack space="space.300">
        <Stack space="space.100">
         
          <Text>{userRole === 'admin' ? 'Toutes les missions' : 'Mes missions'}</Text>
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
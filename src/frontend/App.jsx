import React, { useEffect, useState } from 'react';
import {
  Box,
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
  updateMission,
  getMissions,
  getMissionById,
  deleteMission
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
  const [isEditMode, setIsEditMode] = useState(false);

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

        setCurrentUser({ accountId, displayName });
        await loadMissions(accountId);
      } catch (error) {
        setIsError(true);
        setResultMessage(`Erreur initialisation: ${error.message}`);
        setLoadingMissions(false);
      }
    };

    init();
  }, []);

  const resetViewState = () => {
    setShowForm(false);
    setShowDetails(false);
    setSelectedMission(null);
    setIsEditMode(false);
  };

  const handleOpenCreateForm = () => {
    setResultMessage('');
    setIsError(false);
    setSelectedMission(null);
    setIsEditMode(false);
    setShowDetails(false);
    setShowForm(true);
  };

  const handleCreateOrUpdateMission = async (data) => {
  setResultMessage('');
  setIsError(false);

  try {
    let response;

    if (isEditMode && selectedMission?.id) {
      response = await updateMission({
        missionId: selectedMission.id,
        titre: data.titre,
        destination: data.ville,
        pays: data.pays,
        ville: data.ville,
        dateDepart: data.dateDepart,
        dateRetour: data.dateRetour,
        motif: data.motif
      });
    } else {
      response = await createMission({
        ...data,
        createdBy: currentUser?.accountId,
        createdByName: currentUser?.displayName
      });
    }

    setResultMessage(response.message || '');
    setIsError(!response.success);

    if (response.success) {
      resetViewState();
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
        setIsEditMode(false);
      } else {
        setIsError(true);
        setResultMessage(response.message || 'Impossible de charger le détail.');
      }
    } catch (error) {
      setIsError(true);
      setResultMessage(`Erreur frontend: ${error.message}`);
    }
  };

  const handleEditMission = async (missionId) => {
    setResultMessage('');
    setIsError(false);

    try {
      const response = await getMissionById(missionId);

      if (response.success) {
        setSelectedMission(response.mission);
        setIsEditMode(true);
        setShowDetails(false);
        setShowForm(true);
      } else {
        setIsError(true);
        setResultMessage(response.message || 'Impossible de charger la mission à modifier.');
      }
    } catch (error) {
      setIsError(true);
      setResultMessage(`Erreur frontend: ${error.message}`);
    }
  };

  const handleDeleteMission = async (missionId) => {
    if (!window.confirm('Confirmer la suppression de cette mission ?')) return;

    setResultMessage('');
    setIsError(false);

    try {
      const response = await deleteMission(missionId);
      setResultMessage(response.message || '');
      setIsError(!response.success);

      if (response.success) {
        await loadMissions(currentUser?.accountId);
      }
    } catch (error) {
      setIsError(true);
      setResultMessage(`Erreur frontend: ${error.message}`);
    }
  };

  const handleBackToList = async () => {
    resetViewState();

    if (currentUser?.accountId) {
      await loadMissions(currentUser.accountId);
    }
  };

  return (
    <Box>
      <Stack space="space.300">
        {resultMessage && (
          <SectionMessage appearance={isError ? 'error' : 'success'}>
            <Text>{resultMessage}</Text>
          </SectionMessage>
        )}

        {showForm && (
          <MissionForm
            key={isEditMode ? selectedMission?.id || 'edit' : 'create'}
            onSubmit={handleCreateOrUpdateMission}
            onCancel={handleBackToList}
            initialValues={selectedMission}
            isEditMode={isEditMode}
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
            onCreateMission={handleOpenCreateForm}
            onDeleteMission={handleDeleteMission}
            onEditMission={handleEditMission}
            userRole={userRole}
          />
        )}
      </Stack>
    </Box>
  );
};

export default App;
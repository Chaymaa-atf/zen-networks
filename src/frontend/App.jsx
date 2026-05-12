import React, { useEffect, useRef, useState } from 'react';
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
import AppConfiguration from './components/AppConfiguration';
import Parametres from './components/Parametres';
import DonneesExtraites from './components/DonneesExtraites';
import Statistiques from './components/Statistiques';
import OrdreMissionForm from './components/OrdreMissionForm';
import {
  createMission,
  updateMission,
  getMissions,
  getMissionById,
  deleteMission,
  getAppConfig,
  getStatsData,
  getMissionAttachmentAnalyses,
  updateMissionStatus
} from './services/missionService';

const App = () => {
  const historyRef = useRef(null);

  const [currentPage, setCurrentPage] = useState('missions');
  const [checkingConfig, setCheckingConfig] = useState(true);
  const [appConfig, setAppConfig] = useState(null);
  const [showOrdreForm, setShowOrdreForm] = useState(false);
  const [missions, setMissions] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [loadingMissions, setLoadingMissions] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedMission, setSelectedMission] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('employe');

  const [resultMessage, setResultMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const resetViewState = () => {
    setShowForm(false);
    setShowDetails(false);
    setSelectedMission(null);
    setIsEditMode(false);
    setShowOrdreForm(false);
  };

  const updatePageFromPath = (path) => {
    const pathText = String(path || '');

    if (pathText.includes('settings')) {
      setCurrentPage('settings');
    } else if (pathText.includes('extracted')) {
      setCurrentPage('extracted');
    } else if (pathText.includes('statistics')) {
      setCurrentPage('statistics');
    } else {
      setCurrentPage('missions');
    }

    resetViewState();
    setResultMessage('');
    setIsError(false);
  };

  const getConnectedUser = async () => {
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

    return { accountId, displayName };
  };

  const loadStatsData = async () => {
    try {
      const res = await getStatsData();

      if (res?.success) {
        setMissions(res.missions || []);
        setAnalyses(res.analyses || []);
      } else {
        setAnalyses([]);
      }
    } catch (error) {
      console.error('Erreur stats:', error);
      setAnalyses([]);
    }
  };

  const loadMissions = async (userId) => {
  try {
    setLoadingMissions(true);

    const response = await getMissions(userId);

    if (response.success) {
      const missionsList = response.missions || [];

      setMissions(missionsList);
      setUserRole(response.role || 'employe');

      const allAnalyses = [];

      for (const mission of missionsList) {
        if (!mission.issueKey) continue;

        const res = await getMissionAttachmentAnalyses(mission.issueKey);

        if (res.success) {
          allAnalyses.push(
            ...(res.analyses || []).map((a) => ({
              ...a,
              missionIssueKey: mission.issueKey
            }))
          );
        }
      }

      console.log('🔥 ANALYSES POUR TOTAL =', allAnalyses);
      setAnalyses(allAnalyses);
    } else {
      setMissions([]);
      setAnalyses([]);
      setIsError(true);
      setResultMessage(response.message || 'Erreur lors du chargement des missions.');
    }
  } catch (error) {
    setMissions([]);
    setAnalyses([]);
    setIsError(true);
    setResultMessage(`Erreur frontend: ${error.message}`);
  } finally {
    setLoadingMissions(false);
  }
};
  useEffect(() => {
    const init = async () => {
      try {
        const history = await view.createHistory();
        historyRef.current = history;

        updatePageFromPath(history.location?.pathname);

        history.listen((location) => {
          updatePageFromPath(location.pathname);
        });

        const configRes = await getAppConfig();

        if (!configRes?.configured) {
          setAppConfig(null);
          setLoadingMissions(false);
          return;
        }

        setAppConfig(configRes.config);

        const user = await getConnectedUser();

        if (!user.accountId) {
          setIsError(true);
          setResultMessage("Impossible de récupérer l'utilisateur connecté.");
          setLoadingMissions(false);
          return;
        }

        setCurrentUser(user);
        await loadMissions(user.accountId);
      } catch (error) {
        setIsError(true);
        setResultMessage(`Erreur initialisation: ${error.message}`);
        setLoadingMissions(false);
      } finally {
        setCheckingConfig(false);
      }
    };

    init();
  }, []);

  const handleConfigured = async (config) => {
    setAppConfig(config);
    setCheckingConfig(false);

    try {
      const user = await getConnectedUser();
      setCurrentUser(user);
      await loadMissions(user.accountId);
    } catch (error) {
      setIsError(true);
      setResultMessage(`Erreur après configuration: ${error.message}`);
    }
  };

  const handleOpenCreateForm = () => {
    setResultMessage('');
    setIsError(false);
    resetViewState();
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
          ...data
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
        resetViewState();
        setSelectedMission(response.mission);
        setShowDetails(true);
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
        resetViewState();
        setSelectedMission(response.mission);
        setIsEditMode(true);
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
const handleUpdateStatus = async (missionId, newStatus) => {
  try {
    setMissions((prev) =>
      prev.map((mission) =>
        mission.id === missionId
          ? { ...mission, statut: newStatus }
          : mission
      )
    );

    const response = await updateMissionStatus(missionId, newStatus);

    if (!response.success) {
      setIsError(true);
      setResultMessage(response.message || 'Erreur mise à jour statut');
    }
  } catch (error) {
    setIsError(true);
    setResultMessage(error.message);
  }
};
const handlePrepareOrdreMission = async (missionId) => {
  setResultMessage('');
  setIsError(false);

  try {
    const response = await getMissionById(missionId);

    if (response.success) {
      resetViewState();
      setSelectedMission(response.mission);
      setShowOrdreForm(true);
    } else {
      setIsError(true);
      setResultMessage(response.message || 'Impossible de charger la mission.');
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

  if (checkingConfig) {
    return <Text>Chargement de la configuration...</Text>;
  }

  if (!appConfig) {
    return <AppConfiguration onConfigured={handleConfigured} />;
  }

  return (
    <Box>
      <Stack space="space.300">
        {resultMessage && (
          <SectionMessage appearance={isError ? 'error' : 'success'}>
            <Text>{resultMessage}</Text>
          </SectionMessage>
        )}

        {currentPage === 'settings' && <Parametres />}

        {currentPage === 'extracted' && (
          <DonneesExtraites missions={missions} analyses={analyses} />
        )}

        {currentPage === 'statistics' && (
          <Statistiques missions={missions} analyses={analyses} />
        )}

        {currentPage === 'missions' && showForm && (
          <MissionForm
            key={isEditMode ? selectedMission?.id || 'edit' : 'create'}
            onSubmit={handleCreateOrUpdateMission}
            onCancel={handleBackToList}
            initialValues={selectedMission}
            isEditMode={isEditMode}
          />
        )}

        {currentPage === 'missions' && showOrdreForm && (
        <OrdreMissionForm
          mission={selectedMission}
          analyses={analyses || []}
          onBack={handleBackToList}
        />
      )}

    {currentPage === 'missions' && showDetails && !showOrdreForm && (
      <MissionDetails
        mission={selectedMission}
        onBack={handleBackToList}
      />
    )}

    {currentPage === 'missions' &&
      !showForm &&
      !showDetails &&
      !showOrdreForm && (
        <MissionList
          missions={missions}
          charges={analyses || []}
          loading={loadingMissions}
          userRole={userRole}
          onViewDetails={handleViewDetails}
          onCreateMission={handleOpenCreateForm}
          onDeleteMission={handleDeleteMission}
          onEditMission={handleEditMission}
          onUpdateStatus={handleUpdateStatus}
          onPrepareOrdre={handlePrepareOrdreMission}
        />
    )}
      </Stack>
    </Box>
  );
};

export default App;
import React, { useEffect, useState } from 'react';
import { Box, Button, Heading, Inline, Stack, Text } from '@forge/react';
import { router } from '@forge/bridge';
import { getMissionAttachments } from '../services/missionService';

const MissionDetails = ({ mission, onBack }) => {
  const [attachments, setAttachments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  if (!mission) {
    return <Text>Aucune mission sélectionnée.</Text>;
  }

  const openJiraIssue = async () => {
    if (mission.issueKey) {
      await router.open(`/browse/${mission.issueKey}`);
    }
  };

const openAttachment = async (attachmentId, filename) => {
  await router.open(`/secure/attachment/${attachmentId}/${filename}`);
};

const downloadAttachment = async (attachmentId) => {
  try {
    await router.open(`/rest/api/2/attachment/content/${attachmentId}`);
  } catch (error) {
    console.error('Erreur téléchargement pièce jointe:', error);
  }
};

  useEffect(() => {
    const loadAttachments = async () => {
      if (!mission?.issueKey) {
        setAttachments([]);
        return;
      }

      try {
        setLoadingAttachments(true);
        const response = await getMissionAttachments(mission.issueKey);

        if (response.success) {
          setAttachments(response.attachments || []);
        } else {
          setAttachments([]);
        }
      } catch (error) {
        console.error('Erreur chargement attachments:', error);
        setAttachments([]);
      } finally {
        setLoadingAttachments(false);
      }
    };

    loadAttachments();
  }, [mission?.issueKey]);

  return (
    <Box>
      <Stack space="space.300">
        <Heading size="medium">Fiche mission</Heading>

        <Box>
          <Stack space="space.100">
            <Text>Titre : {mission.titre}</Text>
            <Text>Destination : {mission.destination}</Text>
            <Text>Pays : {mission.pays}</Text>
            <Text>Ville : {mission.ville}</Text>
            <Text>Date départ : {mission.dateDepart}</Text>
            <Text>Date retour : {mission.dateRetour}</Text>
            <Text>Motif : {mission.motif}</Text>
            <Text>Statut : {mission.statut}</Text>
          </Stack>
        </Box>

        {mission.issueKey && (
          <Box>
            <Stack space="space.100">
              <Text>Ticket Jira : {mission.issueKey}</Text>
              <Button appearance="subtle" onClick={openJiraIssue}>
                Ouvrir le ticket Jira
              </Button>
            </Stack>
          </Box>
        )}

        <Box>
          <Heading size="small">Documents de mission</Heading>

          <Stack space="space.100">
            {loadingAttachments && (
              <Text>Chargement des documents...</Text>
            )}

            {!loadingAttachments && attachments.length === 0 && (
              <Text>Aucun document attaché au ticket Jira.</Text>
            )}

            {!loadingAttachments && attachments.length > 0 && attachments.map((file) => (
              <Box key={file.id}>
                <Stack space="space.050">
                  <Text>📎 {file.filename}</Text>

                  <Inline space="space.100">
                    <Button
                      appearance="subtle"
                      onClick={() => openAttachment(file.id,file.filename)}
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
                </Stack>
              </Box>
            ))}

            <Button appearance="primary" onClick={openJiraIssue}>
              Ajouter document
            </Button>
          </Stack>
        </Box>

        <Button appearance="primary" onClick={onBack}>
          Retour à la liste
        </Button>
      </Stack>
    </Box>
  );
};

export default MissionDetails;
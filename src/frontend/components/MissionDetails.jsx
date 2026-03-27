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
  Label
} from '@forge/react';
import { xcss } from '@forge/react';
import { router } from '@forge/bridge';
import {
  getMissionAttachments,
  getMissionAllDocuments,
  getMissionCharges,
  createCharge,
  markChargeAttachmentUploaded,
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

const chargeItemStyles = xcss({
  backgroundColor: 'color.background.input',
  borderRadius: 'border.radius.200',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
  padding: 'space.150'
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
  { type: 'hotel', label: 'Hôtel', emoji: '🏨' },
  { type: 'restaurant', label: 'Restaurant', emoji: '🍽️' },
  { type: 'avion', label: 'Billet avion', emoji: '✈️' },
  { type: 'carburant', label: 'Carburant', emoji: '⛽' }
];

const getChargeLabelFront = (type) => {
  switch (type) {
    case 'hotel':
      return 'Hôtel';
    case 'restaurant':
      return 'Restaurant';
    case 'carburant':
      return 'Carburant';
    case 'avion':
      return 'Billet avion';
    default:
      return 'Charge';
  }
};

const MissionDetails = ({ mission, onBack }) => {
  const [attachments, setAttachments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  const [charges, setCharges] = useState([]);
  const [loadingCharges, setLoadingCharges] = useState(false);

  const [analysisMessage, setAnalysisMessage] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const [selectedChargeType, setSelectedChargeType] = useState(null);
  const [showChargeForm, setShowChargeForm] = useState(false);

  const [chargeForm, setChargeForm] = useState({
    nomHotel: '',
    ville: '',
    dateDebut: '',
    dateFin: '',
    montant: '',
    fournisseur: '',
    commentaire: '',
    trajet: '',
    date: '',
    quantite: ''
  });

  if (!mission) {
    return <Text>Aucune mission sélectionnée.</Text>;
  }

  const resetChargeForm = () => {
    setChargeForm({
      nomHotel: '',
      ville: '',
      dateDebut: '',
      dateFin: '',
      montant: '',
      fournisseur: '',
      commentaire: '',
      trajet: '',
      date: '',
      quantite: ''
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
    if (mission.issueKey) {
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

      if (!res.success) {
        window.alert(res.message || 'Erreur lors de la génération du PDF.');
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
      setAttachments(res.success ? res.attachments || [] : []);
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
      setCharges(res.success ? res.charges || [] : []);
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

    if (selectedChargeType === 'hotel') {
      if (!chargeForm.nomHotel || !chargeForm.ville || !chargeForm.dateDebut || !chargeForm.dateFin) {
        return 'Merci de remplir nom hôtel, ville, date début et date fin.';
      }
    }

    if (selectedChargeType === 'restaurant') {
      if (!chargeForm.fournisseur || !chargeForm.date || !chargeForm.montant) {
        return 'Merci de remplir restaurant, date et montant.';
      }
    }

    if (selectedChargeType === 'carburant') {
      if (!chargeForm.quantite || !chargeForm.date || !chargeForm.montant) {
        return 'Merci de remplir quantité, date et montant.';
      }
    }

    if (selectedChargeType === 'avion') {
      if (!chargeForm.trajet || !chargeForm.date || !chargeForm.montant) {
        return 'Merci de remplir trajet, date et montant.';
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

      const payload = {
        issueKey: mission.issueKey,
        type: selectedChargeType,
        ...chargeForm
      };

      const res = await createCharge(payload);

      if (res.success) {
        window.alert(res.message || 'Charge créée avec succès.');
        closeChargeForm();
        await loadCharges();

        if (res.chargeKey) {
          await router.open(`/browse/${res.chargeKey}`);
        }
      } else {
        window.alert(res.message || "Erreur lors de l'ajout de la charge.");
      }
    } catch (e) {
      console.error(e);
      window.alert("Erreur lors de l'ajout de la charge.");
    }
  };

  const handleUploadForCharge = async (chargeKey) => {
    try {
      localStorage.setItem('pendingChargeIssueKey', chargeKey);
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

          {selectedChargeType === 'hotel' && (
            <Stack space="space.100">
              <Label>Nom hôtel</Label>
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

          {selectedChargeType === 'carburant' && (
            <Stack space="space.100">
              <Label>Quantité</Label>
              <Textfield
                value={chargeForm.quantite}
                onChange={(e) => updateChargeField('quantite', e.target.value)}
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

          {selectedChargeType === 'avion' && (
            <Stack space="space.100">
              <Label>Trajet</Label>
              <Textfield
                value={chargeForm.trajet}
                onChange={(e) => updateChargeField('trajet', e.target.value)}
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

          <Inline space="space.100">
            <Button appearance="primary" onClick={handleSaveCharge}>
              Enregistrer
            </Button>
            <Button appearance="subtle" onClick={closeChargeForm}>
              Annuler
            </Button>
          </Inline>
        </Stack>
      </Box>
    );
  };

  useEffect(() => {
    const runPendingAnalysis = async () => {
      const pendingChargeIssueKey = localStorage.getItem('pendingChargeIssueKey');
      if (!pendingChargeIssueKey) return;

      try {
        setAnalysisMessage('Vérification des pièces jointes...');

        const res = await getMissionAttachments(pendingChargeIssueKey);

        if (!res.success || !res.attachments || res.attachments.length === 0) {
          setAnalysisMessage('Aucune pièce jointe trouvée sur cette charge.');
          return;
        }

        const lastAttachment = res.attachments[res.attachments.length - 1];

        const analysisRes = await markChargeAttachmentUploaded({
          issueKey: pendingChargeIssueKey,
          attachmentId: lastAttachment.id,
          fileName: lastAttachment.filename
        });

        if (analysisRes.success) {
          setAnalysisMessage('Analyse automatique lancée avec succès.');

          setTimeout(async () => {
            await loadCharges();
            await loadAttachments();
          }, 3000);
        } else {
          setAnalysisMessage(analysisRes.message || "Échec de l'analyse.");
        }
      } catch (e) {
        console.error(e);
        setAnalysisMessage("Erreur pendant l'analyse automatique.");
      } finally {
        localStorage.removeItem('pendingChargeIssueKey');
      }
    };

    const handleFocus = async () => {
      await runPendingAnalysis();
      await loadCharges();
      await loadAttachments();
    };

    window.addEventListener('focus', handleFocus);

    runPendingAnalysis();

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [mission?.issueKey]);

  useEffect(() => {
    loadAttachments();
    loadCharges();
  }, [mission?.issueKey]);

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

      {analysisMessage && (
        <Box xcss={cardStyles}>
          <Text>{analysisMessage}</Text>
        </Box>
      )}

      <Inline space="space.100" alignBlock="start">
        {[
          { label: 'Destination', value: mission.destination },
          { label: 'Pays', value: mission.pays },
          { label: 'Ville', value: mission.ville },
          { label: 'Départ', value: mission.dateDepart },
          { label: 'Retour', value: mission.dateRetour },
          { label: 'Motif', value: mission.motif }
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
          <Stack space="space.100">
            {charges.map((charge) => (
              <Box key={charge.id || charge.key} xcss={chargeItemStyles}>
                <Stack space="space.100">
                  <Inline spread="space-between" alignBlock="center">
                    <Stack space="space.050">
                      <Text
                        xcss={xcss({
                          color: 'color.link',
                          fontWeight: 'font.weight.medium',
                          fontSize: '12px'
                        })}
                      >
                        {charge.key}
                      </Text>
                      <Text>{charge.fields?.summary || 'Sans titre'}</Text>
                    </Stack>

                    <Inline space="space.075">
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
                  </Inline>

                  {charge.extractedData && (
                    <Box
                      xcss={xcss({
                        backgroundColor: 'color.background.neutral.subtle',
                        borderRadius: 'border.radius.200',
                        padding: 'space.150'
                      })}
                    >
                      <Stack space="space.100">
                        <Text xcss={labelStyles}>DONNÉES EXTRAITES</Text>
                        <Text>Type : {charge.extractedData.type || '—'}</Text>
                        <Text>Montant : {charge.extractedData.montant || '—'}</Text>
                        <Text>Devise : {charge.extractedData.devise || '—'}</Text>
                        <Text>Date : {charge.extractedData.date || '—'}</Text>
                        <Text>Fournisseur : {charge.extractedData.fournisseur || '—'}</Text>
                        <Text>Commentaire : {charge.extractedData.commentaire || '—'}</Text>
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </Box>
            ))}
          </Stack>
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

              <Button appearance="primary" onClick={openJiraIssue}>
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
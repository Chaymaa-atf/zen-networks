import Resolver from '@forge/resolver';
import api, { route, storage, startsWith } from '@forge/api';
import { Queue } from '@forge/events';
import { PDFDocument } from 'pdf-lib';

const resolver = new Resolver();
const queue = new Queue({ key: 'attachment-analysis-queue' });

const ADMIN_IDS = ['ID_ADMIN_1'];

// À adapter selon ton projet Jira
const PROJECT_KEY = 'FOR';
const ISSUE_TYPE_NAME = 'Task';
const SUBTASK_ISSUE_TYPE_NAME = 'Sous-tâche';

/* =========================
   Helpers
========================= */

const toAdfParagraph = (text) => ({
  type: 'paragraph',
  content: [
    {
      type: 'text',
      text: String(text || '')
    }
  ]
});

const normalizeText = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const getChargeLabel = (type) => {
  const labelsByType = {
    hotel: 'Hôtel',
    restaurant: 'Restaurant',
    avion: 'Billet avion',
    carburant: 'Carburant'
  };

  return labelsByType[type] || 'Charge';
};

const buildChargeSummary = ({
  type,
  nomHotel,
  fournisseur,
  trajet,
  date
}) => {
  const baseLabel = getChargeLabel(type);

  if (type === 'hotel') {
    return nomHotel ? `${baseLabel} - ${nomHotel}` : baseLabel;
  }

  if (type === 'restaurant') {
    if (fournisseur && date) return `${baseLabel} - ${fournisseur} - ${date}`;
    if (fournisseur) return `${baseLabel} - ${fournisseur}`;
    return baseLabel;
  }

  if (type === 'carburant') {
    return date ? `${baseLabel} - ${date}` : baseLabel;
  }

  if (type === 'avion') {
    if (trajet && date) return `${baseLabel} - ${trajet} - ${date}`;
    if (trajet) return `${baseLabel} - ${trajet}`;
    return baseLabel;
  }

  return baseLabel;
};

const searchIssuesByJql = async (jql, fields = []) => {
  const fieldsParam = Array.isArray(fields) ? fields.join(',') : fields;

  const response = await api.asApp().requestJira(
    route`/rest/api/3/search/jql?jql=${jql}&fields=${fieldsParam}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  return await response.json();
};

const validateChargePayload = ({
  type,
  nomHotel,
  ville,
  dateDebut,
  dateFin,
  montant,
  fournisseur,
  trajet,
  date,
  quantite
}) => {
  if (type === 'hotel') {
    if (!nomHotel || !ville || !dateDebut || !dateFin) {
      return 'Pour un hôtel, nom hôtel, ville, date début et date fin sont obligatoires.';
    }
  }

  if (type === 'restaurant') {
    if (!fournisseur || !date || !montant) {
      return 'Pour un restaurant, fournisseur, date et montant sont obligatoires.';
    }
  }

  if (type === 'carburant') {
    if (!quantite || !date || !montant) {
      return 'Pour le carburant, quantité, date et montant sont obligatoires.';
    }
  }

  if (type === 'avion') {
    if (!trajet || !date || !montant) {
      return 'Pour un billet avion, trajet, date et montant sont obligatoires.';
    }
  }

  return null;
};

const buildChargeDescriptionLines = ({
  issueKey,
  type,
  nomHotel,
  ville,
  dateDebut,
  dateFin,
  montant,
  fournisseur,
  commentaire,
  trajet,
  date,
  quantite
}) => {
  const chargeLabel = getChargeLabel(type);

  const lines = [
    `Type de charge : ${chargeLabel}`,
    `Mission parente : ${issueKey}`
  ];

  if (type === 'hotel') {
    if (nomHotel) lines.push(`Nom hôtel : ${nomHotel}`);
    if (ville) lines.push(`Ville : ${ville}`);
    if (dateDebut) lines.push(`Date début : ${dateDebut}`);
    if (dateFin) lines.push(`Date fin : ${dateFin}`);
    if (montant) lines.push(`Montant : ${montant}`);
  }

  if (type === 'restaurant') {
    if (fournisseur) lines.push(`Restaurant / Fournisseur : ${fournisseur}`);
    if (date) lines.push(`Date : ${date}`);
    if (montant) lines.push(`Montant : ${montant}`);
  }

  if (type === 'carburant') {
    if (quantite) lines.push(`Quantité : ${quantite}`);
    if (date) lines.push(`Date : ${date}`);
    if (montant) lines.push(`Montant : ${montant}`);
  }

  if (type === 'avion') {
    if (trajet) lines.push(`Trajet : ${trajet}`);
    if (date) lines.push(`Date : ${date}`);
    if (montant) lines.push(`Montant : ${montant}`);
  }

  if (commentaire) {
    lines.push(`Commentaire : ${commentaire}`);
  }

  lines.push('Preuve à ajouter dans ce ticket.');

  return lines;
};

const getAllMissionDocuments = async (issueKey) => {
  const missionResponse = await api.asApp().requestJira(
    route`/rest/api/3/issue/${issueKey}?fields=attachment,summary`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    }
  );

  if (!missionResponse.ok) {
    const errorText = await missionResponse.text();
    throw new Error(`Impossible de lire la mission: ${errorText}`);
  }

  const missionData = await missionResponse.json();

  const missionAttachments = (missionData.fields?.attachment || []).map((file) => ({
    ...file,
    sourceIssueKey: issueKey,
    sourceType: 'Mission',
    sourceSummary: missionData.fields?.summary || 'Mission principale'
  }));

  const jql = `parent = "${issueKey}"`;
  const chargesData = await searchIssuesByJql(jql, ['summary', 'attachment']);
  const charges = chargesData.issues || [];

  const chargeAttachments = charges.flatMap((charge) =>
    (charge.fields?.attachment || []).map((file) => ({
      ...file,
      sourceIssueKey: charge.key,
      sourceType: charge.fields?.summary || 'Charge',
      sourceSummary: charge.fields?.summary || 'Charge'
    }))
  );

  return [...missionAttachments, ...chargeAttachments];
};

const getExtension = (filename = '') => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

/* =========================
   Missions
========================= */

resolver.define('createMission', async ({ payload }) => {
  try {
    const {
      titre,
      destination,
      pays,
      ville,
      dateDepart,
      dateRetour,
      motif,
      createdBy,
      createdByName
    } = payload || {};

    if (
      !titre ||
      !destination ||
      !pays ||
      !ville ||
      !dateDepart ||
      !dateRetour ||
      !motif ||
      !createdBy
    ) {
      return {
        success: false,
        message: 'Veuillez remplir tous les champs.'
      };
    }

    if (dateRetour < dateDepart) {
      return {
        success: false,
        message: 'La date de retour doit être après la date de départ.'
      };
    }

    const jiraPayload = {
      fields: {
        project: {
          key: PROJECT_KEY
        },
        issuetype: {
          name: ISSUE_TYPE_NAME
        },
        summary: titre,
        description: {
          type: 'doc',
          version: 1,
          content: [
            toAdfParagraph("Mission créée depuis l'application Forge"),
            toAdfParagraph(`Destination: ${destination}`),
            toAdfParagraph(`Pays: ${pays}`),
            toAdfParagraph(`Ville: ${ville}`),
            toAdfParagraph(`Date départ: ${dateDepart}`),
            toAdfParagraph(`Date retour: ${dateRetour}`),
            toAdfParagraph(`Motif: ${motif}`),
            toAdfParagraph(`Créée par: ${createdByName || 'Utilisateur'}`)
          ]
        }
      }
    };

    const jiraResponse = await api.asApp().requestJira(
      route`/rest/api/3/issue`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jiraPayload)
      }
    );

    if (!jiraResponse.ok) {
      const errorText = await jiraResponse.text();
      return {
        success: false,
        message: `Création ticket Jira échouée: ${errorText}`
      };
    }

    const jiraIssue = await jiraResponse.json();

    const missionId = `mission-${Date.now()}`;

    const mission = {
      id: missionId,
      titre,
      destination,
      pays,
      ville,
      dateDepart,
      dateRetour,
      motif,
      statut: 'En attente',
      createdAt: new Date().toISOString(),
      createdBy,
      createdByName: createdByName || 'Utilisateur',
      issueId: jiraIssue.id,
      issueKey: jiraIssue.key
    };

    await storage.set(missionId, mission);

    return {
      success: true,
      message: `Mission créée avec succès. Ticket Jira: ${jiraIssue.key}`,
      mission
    };
  } catch (error) {
    console.error('Erreur backend createMission:', error);
    return {
      success: false,
      message: `Erreur backend: ${error.message}`
    };
  }
});

resolver.define('getMissions', async ({ payload }) => {
  try {
    const userId = payload?.userId;

    const results = await storage
      .query()
      .where('key', startsWith('mission-'))
      .getMany();

    const missions = (results.results || []).map((item) => item.value);

    const isAdmin = ADMIN_IDS.includes(userId);

    const filteredMissions = isAdmin
      ? missions
      : missions.filter((mission) => mission.createdBy === userId);

    filteredMissions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return {
      success: true,
      missions: filteredMissions,
      role: isAdmin ? 'admin' : 'employe'
    };
  } catch (error) {
    console.error('Erreur backend getMissions:', error);
    return {
      success: false,
      message: `Erreur backend: ${error.message}`,
      missions: []
    };
  }
});

resolver.define('getMissionById', async ({ payload }) => {
  try {
    const { missionId } = payload || {};

    if (!missionId) {
      return {
        success: false,
        message: 'missionId manquant.'
      };
    }

    const mission = await storage.get(missionId);

    if (!mission) {
      return {
        success: false,
        message: 'Mission introuvable.'
      };
    }

    return {
      success: true,
      mission
    };
  } catch (error) {
    console.error('Erreur backend getMissionById:', error);
    return {
      success: false,
      message: `Erreur backend: ${error.message}`
    };
  }
});

resolver.define('updateMissionStatus', async ({ payload }) => {
  try {
    const { missionId, statut } = payload || {};

    if (!missionId || !statut) {
      return {
        success: false,
        message: 'missionId ou statut manquant.'
      };
    }

    const mission = await storage.get(missionId);

    if (!mission) {
      return {
        success: false,
        message: 'Mission introuvable.'
      };
    }

    const updatedMission = {
      ...mission,
      statut
    };

    await storage.set(missionId, updatedMission);

    return {
      success: true,
      message: 'Statut mis à jour avec succès.',
      mission: updatedMission
    };
  } catch (error) {
    console.error('Erreur backend updateMissionStatus:', error);
    return {
      success: false,
      message: `Erreur backend: ${error.message}`
    };
  }
});

resolver.define('deleteMission', async ({ payload }) => {
  try {
    const { missionId } = payload || {};

    if (!missionId) {
      return {
        success: false,
        message: 'missionId manquant.'
      };
    }

    const mission = await storage.get(missionId);

    if (!mission) {
      return {
        success: false,
        message: 'Mission introuvable.'
      };
    }

    await storage.delete(missionId);

    return {
      success: true,
      message: 'Mission supprimée avec succès.'
    };
  } catch (error) {
    console.error('Erreur backend deleteMission:', error);
    return {
      success: false,
      message: `Erreur backend: ${error.message}`
    };
  }
});

/* =========================
   Pièces jointes
========================= */

resolver.define('getMissionAttachments', async ({ payload }) => {
  try {
    const { issueKey } = payload || {};

    if (!issueKey) {
      return {
        success: false,
        message: 'issueKey manquant.'
      };
    }

    const response = await api.asApp().requestJira(
      route`/rest/api/3/issue/${issueKey}?fields=attachment`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        message: `Impossible de récupérer les pièces jointes: ${errorText}`
      };
    }

    const data = await response.json();

    return {
      success: true,
      attachments: data.fields?.attachment || []
    };
  } catch (error) {
    console.error('Erreur backend getMissionAttachments:', error);
    return {
      success: false,
      message: `Erreur backend: ${error.message}`
    };
  }
});

/* =========================
   Charges
========================= */

resolver.define('createCharge', async ({ payload }) => {
  try {
    const {
      issueKey,
      type,
      nomHotel,
      ville,
      dateDebut,
      dateFin,
      montant,
      fournisseur,
      commentaire,
      trajet,
      date,
      quantite
    } = payload || {};

    if (!issueKey || !type) {
      return {
        success: false,
        message: 'issueKey ou type manquant.'
      };
    }

    const validationError = validateChargePayload({
      type,
      nomHotel,
      ville,
      dateDebut,
      dateFin,
      montant,
      fournisseur,
      trajet,
      date,
      quantite
    });

    if (validationError) {
      return {
        success: false,
        message: validationError
      };
    }

    const chargeLabel = getChargeLabel(type);
    const chargeSummary = buildChargeSummary({
      type,
      nomHotel,
      fournisseur,
      trajet,
      date
    });

    const descriptionLines = buildChargeDescriptionLines({
      issueKey,
      type,
      nomHotel,
      ville,
      dateDebut,
      dateFin,
      montant,
      fournisseur,
      commentaire,
      trajet,
      date,
      quantite
    });

    const jql = `parent = "${issueKey}"`;
    const searchData = await searchIssuesByJql(jql, ['summary']);
    const existingCharges = searchData.issues || [];

    const existingCharge = existingCharges.find((issue) => {
      const summary = normalizeText(issue.fields?.summary);
      return summary === normalizeText(chargeSummary);
    });

    if (existingCharge) {
      return {
        success: true,
        alreadyExists: true,
        message: 'Cette charge existe déjà.',
        chargeKey: existingCharge.key,
        charge: existingCharge
      };
    }

    const jiraPayload = {
      fields: {
        project: {
          key: PROJECT_KEY
        },
        issuetype: {
          name: SUBTASK_ISSUE_TYPE_NAME
        },
        parent: {
          key: issueKey
        },
        summary: chargeSummary,
        description: {
          type: 'doc',
          version: 1,
          content: descriptionLines.map((line) => toAdfParagraph(line))
        }
      }
    };

    const createResponse = await api.asApp().requestJira(
      route`/rest/api/3/issue`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jiraPayload)
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      return {
        success: false,
        message: `Création charge échouée: ${errorText}`
      };
    }

    const subtask = await createResponse.json();

    return {
      success: true,
      alreadyExists: false,
      message: 'Charge ajoutée avec succès.',
      chargeKey: subtask.key,
      charge: {
        key: subtask.key,
        summary: chargeSummary,
        type: chargeLabel
      }
    };
  } catch (error) {
    console.error('Erreur backend createCharge:', error);
    return {
      success: false,
      message: `Erreur backend: ${error.message}`
    };
  }
});

resolver.define('getMissionCharges', async ({ payload }) => {
  try {
    const { issueKey } = payload || {};

    if (!issueKey) {
      return {
        success: false,
        message: 'issueKey manquant.'
      };
    }

    const jql = `parent = "${issueKey}"`;
    const data = await searchIssuesByJql(jql, [
      'summary',
      'status',
      'issuetype',
      'attachment',
      'description'
    ]);

    const charges = await Promise.all(
      (data.issues || []).map(async (issue) => {
        const attachments = issue.fields?.attachment || [];
        let extractedData = null;

        if (attachments.length > 0) {
          const firstAttachment = attachments[0];
          const storageKey = `charge-analysis-${issue.key}-${firstAttachment.id}`;
          extractedData = await storage.get(storageKey);
        }

        return {
          ...issue,
          extractedData: extractedData || null
        };
      })
    );

    return {
      success: true,
      charges
    };
  } catch (error) {
    console.error('Erreur backend getMissionCharges:', error);
    return {
      success: false,
      message: `Impossible de récupérer les charges: ${error.message}`,
      charges: []
    };
  }
});

resolver.define('getChargeExtractedData', async ({ payload }) => {
  try {
    const issueKey = payload?.issueKey || null;
    const attachmentId = payload?.attachmentId || null;

    if (!issueKey || !attachmentId) {
      return {
        success: false,
        message: 'issueKey ou attachmentId manquant.'
      };
    }

    const storageKey = `charge-analysis-${issueKey}-${attachmentId}`;
    const extractedData = await storage.get(storageKey);

    return {
      success: true,
      issueKey,
      attachmentId,
      extractedData: extractedData || null
    };
  } catch (error) {
    console.error('Erreur getChargeExtractedData :', error);
    return {
      success: false,
      message: error.message
    };
  }
});

resolver.define('markChargeAttachmentUploaded', async ({ payload }) => {
  try {
    const issueKey = payload?.issueKey || null;
    const attachmentId = payload?.attachmentId || null;
    const fileName = payload?.fileName || null;

    if (!issueKey || !attachmentId || !fileName) {
      return {
        success: false,
        message: 'issueKey, attachmentId ou fileName manquant.'
      };
    }

    await queue.push({
      body: {
        action: 'analyze_attachment',
        issueKey,
        attachmentId,
        fileName
      }
    });

    return {
      success: true,
      message: 'Pièce jointe envoyée pour analyse automatique',
      data: {
        issueKey,
        attachmentId,
        fileName,
        uploaded: true
      }
    };
  } catch (error) {
    console.error('Erreur markChargeAttachmentUploaded :', error);
    return {
      success: false,
      message: error.message
    };
  }
});

resolver.define('getMissionAllDocuments', async ({ payload }) => {
  try {
    const { issueKey } = payload || {};

    if (!issueKey) {
      return {
        success: false,
        message: 'issueKey manquant.',
        attachments: []
      };
    }

    const allDocuments = await getAllMissionDocuments(issueKey);

    return {
      success: true,
      attachments: allDocuments
    };
  } catch (error) {
    console.error('Erreur backend getMissionAllDocuments:', error);
    return {
      success: false,
      message: `Erreur backend: ${error.message}`,
      attachments: []
    };
  }
});

/* =========================
   PDF
========================= */
const A4_PORTRAIT = { width: 595.28, height: 841.89 };
const A4_LANDSCAPE = { width: 841.89, height: 595.28 };
const PDF_MARGIN = 24;

const fitInside = (srcWidth, srcHeight, maxWidth, maxHeight) => {
  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
  return {
    width: srcWidth * ratio,
    height: srcHeight * ratio
  };
};

const addImageAsFittedPage = async (finalPdf, imageBytes, type) => {
  const image =
    type === 'png'
      ? await finalPdf.embedPng(imageBytes)
      : await finalPdf.embedJpg(imageBytes);

  const imgWidth = image.width;
  const imgHeight = image.height;

  const pageSize =
    imgWidth >= imgHeight ? A4_LANDSCAPE : A4_PORTRAIT;

  const page = finalPdf.addPage([pageSize.width, pageSize.height]);

  const maxWidth = pageSize.width - PDF_MARGIN * 2;
  const maxHeight = pageSize.height - PDF_MARGIN * 2;

  const fitted = fitInside(imgWidth, imgHeight, maxWidth, maxHeight);

  const x = (pageSize.width - fitted.width) / 2;
  const y = (pageSize.height - fitted.height) / 2;

  page.drawImage(image, {
    x,
    y,
    width: fitted.width,
    height: fitted.height
  });
};
resolver.define('generateMissionPdf', async ({ payload }) => {
  try {
    const { issueKey } = payload || {};

    if (!issueKey) {
      return {
        success: false,
        message: 'issueKey manquant.'
      };
    }

    const documents = await getAllMissionDocuments(issueKey);

    if (!documents.length) {
      return {
        success: false,
        message: 'Aucun document trouvé pour cette mission.'
      };
    }

    const finalPdf = await PDFDocument.create();
    const skippedFiles = [];

    for (const file of documents) {
      try {
        const ext = getExtension(file.filename);

        const fileResponse = await api.asApp().requestJira(
          route`/rest/api/3/attachment/content/${file.id}`,
          {
            method: 'GET',
            headers: {
              Accept: '*/*'
            }
          }
        );

        if (!fileResponse.ok) {
          skippedFiles.push({
            filename: file.filename,
            reason: 'Téléchargement impossible'
          });
          continue;
        }

        const fileBytes = new Uint8Array(await fileResponse.arrayBuffer());

        if (ext === 'pdf') {
          const sourcePdf = await PDFDocument.load(fileBytes);
          const copiedPages = await finalPdf.copyPages(
            sourcePdf,
            sourcePdf.getPageIndices()
          );
          copiedPages.forEach((page) => finalPdf.addPage(page));
          continue;
        }

        if (ext === 'jpg' || ext === 'jpeg') {
          await addImageAsFittedPage(finalPdf, fileBytes, 'jpg');
          continue;
        }

        if (ext === 'png') {
          await addImageAsFittedPage(finalPdf, fileBytes, 'png');
          continue;
        }

        skippedFiles.push({
          filename: file.filename,
          reason: 'Format non supporté'
        });
      } catch (err) {
        skippedFiles.push({
          filename: file.filename,
          reason: err.message
        });
      }
    }

    if (finalPdf.getPageCount() === 0) {
      return {
        success: false,
        message: 'Aucun fichier exploitable pour générer le PDF.',
        skippedFiles
      };
    }

    const pdfBytes = await finalPdf.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

    return {
      success: true,
      fileName: `mission-${issueKey}-documents.pdf`,
      pdfBase64,
      skippedFiles
    };
  } catch (error) {
    console.error('Erreur backend generateMissionPdf:', error);
    return {
      success: false,
      message: `Erreur backend: ${error.message}`
    };
  }
});

export const handler = resolver.getDefinitions();
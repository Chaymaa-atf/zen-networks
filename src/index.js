import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';
import { kvs, WhereConditions } from '@forge/kvs';
import { Queue } from '@forge/events';
import { PDFDocument } from 'pdf-lib';
import FormData from 'form-data';
const resolver = new Resolver();
const queue = new Queue({ key: 'attachment-analysis-queue' });


// À adapter selon ton projet Jira
const PROJECT_KEY = 'FOR';
const getAppConfigOrDefault = async () => {
  const config = await kvs.get('app-config');

  return {
    configured: !!config?.configured,
    projectKey: config?.projectKey || PROJECT_KEY,
    projectName: config?.projectName || 'Gestion des missions',
    adminIds: config?.adminIds || []
  };
};
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

const getTypeHebergementLabel = (typeHebergement) => {
  const value =
    typeof typeHebergement === 'string'
      ? typeHebergement
      : typeHebergement?.value || '';

  const labels = {
    hotel: 'Hôtel',
    airbnb: 'Airbnb',
    autre: 'Autre'
  };

  return labels[value] || 'Hébergement';
};

const getTypeTransportLabel = (typeTransport) => {
  const value =
    typeof typeTransport === 'string'
      ? typeTransport
      : typeTransport?.value || '';

  const labels = {
    avion: 'Avion',
    taxi_uber: 'Taxi / Uber',
    voiture: 'Voiture'
  };

  return labels[value] || 'Transport';
};

const getChargeLabel = (type) => {
  const labelsByType = {
    hebergement: 'Hébergement',
    restaurant: 'Restaurant',
    transport: 'Transport'
  };

  return labelsByType[type] || 'Charge';
};

const buildChargeSummary = ({
  type,
  typeHebergement,
  typeTransport,
  nomHotel,
  fournisseur,
  date,
  villeDepart,
  villeArrivee,
  typeVehicule
}) => {
  const baseLabel = getChargeLabel(type);

  if (type === 'hebergement') {
    const hebergementTypeLabel = getTypeHebergementLabel(typeHebergement);

    if (nomHotel) {
      return `${baseLabel} - ${hebergementTypeLabel} - ${nomHotel}`;
    }

    return `${baseLabel} - ${hebergementTypeLabel}`;
  }

  if (type === 'restaurant') {
    if (fournisseur && date) return `${baseLabel} - ${fournisseur} - ${date}`;
    if (fournisseur) return `${baseLabel} - ${fournisseur}`;
    return baseLabel;
  }

  if (type === 'transport') {
    const transportLabel = getTypeTransportLabel(typeTransport);

    if (typeTransport === 'avion') {
      if (villeDepart && villeArrivee) {
        return `${baseLabel} - ${transportLabel} - ${villeDepart} - ${villeArrivee}`;
      }
      return `${baseLabel} - ${transportLabel}`;
    }

    if (typeTransport === 'voiture') {
      if (typeVehicule) {
        return `${baseLabel} - ${transportLabel} - ${typeVehicule}`;
      }
      return `${baseLabel} - ${transportLabel}`;
    }

    return `${baseLabel} - ${transportLabel}`;
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
  typeHebergement,
  nomHotel,
  ville,
  dateDebut,
  dateFin,
  montant,
  fournisseur,
  date,
  typeTransport,
  villeDepart,
  villeArrivee,
  compagnie,
  typeVehicule,
  chevaux,
  kilometrage
}) => {
  if (type === 'hebergement') {
    if (!typeHebergement || !nomHotel || !ville || !dateDebut || !dateFin) {
      return 'Pour un hébergement, type hébergement, nom, ville, date début et date fin sont obligatoires.';
    }
  }

  if (type === 'restaurant') {
    if (!fournisseur || !date || !montant) {
      return 'Pour un restaurant, fournisseur, date et montant sont obligatoires.';
    }
  }

  if (type === 'transport') {
    if (!typeTransport) {
      return 'Pour un transport, le type de transport est obligatoire.';
    }

    if (typeTransport === 'avion') {
      if (!villeDepart || !villeArrivee || !date || !compagnie || !montant) {
        return 'Pour un avion, ville départ, ville arrivée, date, compagnie et montant sont obligatoires.';
      }
    }

    if (typeTransport === 'taxi_uber') {
      if (!date || !montant) {
        return 'Pour Taxi / Uber, date et montant sont obligatoires.';
      }
    }

    if (typeTransport === 'voiture') {
      if (!typeVehicule || !chevaux || !kilometrage || !date || !montant) {
        return 'Pour une voiture, type véhicule, chevaux, kilométrage, date et montant sont obligatoires.';
      }
    }
  }

  return null;
};

const buildChargeDescriptionLines = ({
  issueKey,
  type,
  typeHebergement,
  nomHotel,
  ville,
  dateDebut,
  dateFin,
  montant,
  fournisseur,
  commentaire,
  date,
  typeTransport,
  villeDepart,
  villeArrivee,
  compagnie,
  typeVehicule,
  chevaux,
  kilometrage
}) => {
  const chargeLabel = getChargeLabel(type);

  const lines = [
    `Type de charge : ${chargeLabel}`,
    `Mission parente : ${issueKey}`
  ];

  if (type === 'hebergement') {
    if (typeHebergement) {
      lines.push(`Type hébergement : ${getTypeHebergementLabel(typeHebergement)}`);
    }
    if (nomHotel) lines.push(`Nom hébergement : ${nomHotel}`);
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

  if (type === 'transport') {
    if (typeTransport) {
      lines.push(`Type transport : ${getTypeTransportLabel(typeTransport)}`);
    }

    if (typeTransport === 'avion') {
      if (villeDepart) lines.push(`Ville départ : ${villeDepart}`);
      if (villeArrivee) lines.push(`Ville arrivée : ${villeArrivee}`);
      if (compagnie) lines.push(`Compagnie : ${compagnie}`);
    }

    if (typeTransport === 'voiture') {
      if (typeVehicule) lines.push(`Type véhicule : ${typeVehicule}`);
      if (chevaux) lines.push(`Chevaux : ${chevaux}`);
      if (kilometrage) lines.push(`Kilométrage : ${kilometrage}`);
    }

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
      nomEmploye,
      prenomEmploye,
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
      !nomEmploye ||
      !prenomEmploye ||
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
    const config = await getAppConfigOrDefault();
    const jiraPayload = {
      fields: {
       project: {
          key: config.projectKey
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
            toAdfParagraph(`Employé: ${prenomEmploye} ${nomEmploye}`),
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
      nomEmploye,
      prenomEmploye,
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

    await kvs.set(missionId, mission);

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

    const results = await kvs
      .query()
      .where('key', WhereConditions.beginsWith('mission-'))
      .getMany();

    const missions = (results.results || []).map((item) => item.value);

    const config = await getAppConfigOrDefault();
    const isAdmin = config.adminIds.includes(userId);

    const filteredMissions = isAdmin
      ? missions
      : missions.filter((mission) => mission.createdBy === userId);

    filteredMissions.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return {
      success: true,
      missions: filteredMissions,
      role: isAdmin ? 'admin' : 'employe',
      projectKey: config.projectKey
    };
  } catch (error) {
    console.error('Erreur backend getMissions:', error);

    return {
      success: false,
      message: `Erreur backend: ${error.message}`,
      missions: [],
      role: 'employe'
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

    const mission = await kvs.get(missionId);

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
  const { missionId, statut } = payload;

  const mission = await storage.get(`mission-${missionId}`);

  if (!mission) {
    return { success: false, error: 'Mission introuvable' };
  }

  await storage.set(`mission-${missionId}`, {
    ...mission,
    statut,
  });

  return { success: true };
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

    const mission = await kvs.get(missionId);

    if (!mission) {
      return {
        success: false,
        message: 'Mission introuvable.'
      };
    }

    await kvs.delete(missionId);

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

resolver.define('updateMission', async ({ payload }) => {
  try {
    const {
      missionId,
      nomEmploye,
      prenomEmploye,
      titre,
      destination,
      pays,
      ville,
      dateDepart,
      dateRetour,
      motif
    } = payload || {};

    if (!missionId) {
      return {
        success: false,
        message: 'missionId manquant.'
      };
    }

    const mission = await kvs.get(missionId);

    if (!mission) {
      return {
        success: false,
        message: 'Mission introuvable.'
      };
    }

    const updatedMission = {
      ...mission,
      nomEmploye: nomEmploye ?? mission.nomEmploye,
      prenomEmploye: prenomEmploye ?? mission.prenomEmploye,
      titre: titre ?? mission.titre,
      destination: destination ?? mission.destination,
      pays: pays ?? mission.pays,
      ville: ville ?? mission.ville,
      dateDepart: dateDepart ?? mission.dateDepart,
      dateRetour: dateRetour ?? mission.dateRetour,
      motif: motif ?? mission.motif,
      updatedAt: new Date().toISOString()
    };

    if (updatedMission.dateRetour < updatedMission.dateDepart) {
      return {
        success: false,
        message: 'La date de retour doit être après la date de départ.'
      };
    }

    await kvs.set(missionId, updatedMission);

    if (mission.issueKey) {
      const jiraPayload = {
        fields: {
          summary: updatedMission.titre,
          description: {
            type: 'doc',
            version: 1,
            content: [
              toAdfParagraph("Mission modifiée depuis l'application Forge"),
              toAdfParagraph(`Employé: ${updatedMission.prenomEmploye} ${updatedMission.nomEmploye}`),
              toAdfParagraph(`Destination: ${updatedMission.destination}`),
              toAdfParagraph(`Pays: ${updatedMission.pays}`),
              toAdfParagraph(`Ville: ${updatedMission.ville}`),
              toAdfParagraph(`Date départ: ${updatedMission.dateDepart}`),
              toAdfParagraph(`Date retour: ${updatedMission.dateRetour}`),
              toAdfParagraph(`Motif: ${updatedMission.motif}`),
              toAdfParagraph(`Créée par: ${mission.createdByName || 'Utilisateur'}`)
            ]
          }
        }
      };

      const jiraResponse = await api.asApp().requestJira(
        route`/rest/api/3/issue/${mission.issueKey}`,
        {
          method: 'PUT',
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
          message: `Mission locale modifiée, mais échec mise à jour Jira: ${errorText}`
        };
      }
    }

    return {
      success: true,
      message: 'Mission modifiée avec succès.',
      mission: updatedMission
    };
  } catch (error) {
    console.error('Erreur backend updateMission:', error);
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

resolver.define('uploadAttachment', async ({ payload }) => {
  try {
    const { issueKey, fileName, mimeType, base64Content } = payload;

    const buffer = Buffer.from(base64Content, 'base64');

    const form = new FormData();
    form.append('file', buffer, fileName);

    const response = await api.asApp().requestJira(
      route`/rest/api/3/issue/${issueKey}/attachments`,
      {
        method: 'POST',
        headers: {
          'X-Atlassian-Token': 'no-check',
          ...form.getHeaders()
        },
        body: form.getBuffer() // ✅ TRÈS IMPORTANT
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('UPLOAD ERROR:', error);

      return { success: false, message: error };
    }

    const data = await response.json();

    return {
      success: true,
      message: 'Upload OK',
      data
    };
  } catch (e) {
    console.error(e);
    return { success: false, message: e.message };
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

/* =========================
   Charges
========================= */

resolver.define('createCharge', async ({ payload }) => {
  try {
    const {
      issueKey,
      type,
      typeHebergement,
      nomHotel,
      ville,
      dateDebut,
      dateFin,
      montant,
      fournisseur,
      commentaire,
      date,
      typeTransport,
      villeDepart,
      villeArrivee,
      compagnie,
      typeVehicule,
      chevaux,
      kilometrage
    } = payload || {};

    if (!issueKey || !type) {
      return {
        success: false,
        message: 'issueKey ou type manquant.'
      };
    }

    const validationError = validateChargePayload({
      type,
      typeHebergement,
      nomHotel,
      ville,
      dateDebut,
      dateFin,
      montant,
      fournisseur,
      date,
      typeTransport,
      villeDepart,
      villeArrivee,
      compagnie,
      typeVehicule,
      chevaux,
      kilometrage
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
      typeHebergement,
      typeTransport,
      nomHotel,
      fournisseur,
      date,
      villeDepart,
      villeArrivee,
      typeVehicule
    });

    const descriptionLines = buildChargeDescriptionLines({
      issueKey,
      type,
      typeHebergement,
      nomHotel,
      ville,
      dateDebut,
      dateFin,
      montant,
      fournisseur,
      commentaire,
      date,
      typeTransport,
      villeDepart,
      villeArrivee,
      compagnie,
      typeVehicule,
      chevaux,
      kilometrage
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
    const config = await getAppConfigOrDefault();
    const jiraPayload = {
      fields: {
        project: {
            key: config.projectKey
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

    return {
      success: true,
      charges: data.issues || []
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

/* =========================
   IA / Extraction
========================= */

resolver.define('getChargeExtractedData', async (req) => {
  try {
    const { text } = req.payload || {};

    if (!text || !String(text).trim()) {
      return {
        success: false,
        message: 'Texte manquant.',
        result: ''
      };
    }

    const prompt = `
Analyse ce texte extrait d'un justificatif de mission.

Retourne uniquement du JSON valide avec exactement cette structure :

{
  "category": "",
  "confidence": 0,
  "date": "",
  "amount": "",
  "currency": "",
  "details": "",
  "rawText": ""
}

Catégories autorisées :
- restaurant
- hebergement
- transport
- inconnu

Règles :
- "amount" doit contenir seulement la valeur numérique si trouvée
- "currency" doit être MAD, EUR, USD ou vide
- "date" doit être la date trouvée dans le document ou vide
- "details" doit être une phrase courte
- "rawText" doit contenir le texte d'origine
- N'invente pas d'information

Texte :
${text}
`;

    const response = await api.fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur Groq getChargeExtractedData:', errorText);

      return {
        success: false,
        message: `Erreur Groq: ${errorText}`,
        result: ''
      };
    }

    const data = await response.json();
    const result = data?.choices?.[0]?.message?.content || '';

    return {
      success: true,
      result
    };
  } catch (error) {
    console.error('❌ getChargeExtractedData error:', error);
    return {
      success: false,
      message: error.message,
      result: ''
    };
  }
});

resolver.define('getExtractedAttachmentData', async ({ payload }) => {
  try {
    const { issueKey, attachmentId } = payload || {};

    if (!issueKey || !attachmentId) {
      return {
        success: false,
        message: 'issueKey ou attachmentId manquant.'
      };
    }

    const key = `charge-analysis-${issueKey}-${attachmentId}`;
    const data = await kvs.get(key);

    if (!data) {
      return {
        success: false,
        message: 'Aucune donnée extraite.'
      };
    }

    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Erreur getExtractedAttachmentData:', error);
    return {
      success: false,
      message: error.message
    };
  }
});

resolver.define('getMissionAttachmentAnalyses', async ({ payload }) => {
  try {
    const { issueKey } = payload || {};

    console.log('📥 getMissionAttachmentAnalyses appelé avec issueKey =', issueKey);

    if (!issueKey) {
      return {
        success: false,
        message: 'issueKey manquant.',
        analyses: []
      };
    }

    const issueResp = await api.asApp().requestJira(
      route`/rest/api/3/issue/${issueKey}?fields=subtasks`
    );

    if (!issueResp.ok) {
      const errorText = await issueResp.text();
      throw new Error(errorText);
    }

    const issueData = await issueResp.json();

    const issueKeys = [
      issueKey,
      ...(issueData.fields?.subtasks || []).map((subtask) => subtask.key)
    ];

    console.log('🎯 Tickets à vérifier =', JSON.stringify(issueKeys));

    const allAnalyses = [];

    for (const currentIssueKey of issueKeys) {
      const results = await kvs
        .query()
        .where('key', WhereConditions.beginsWith(`charge-analysis-${currentIssueKey}-`))
        .getMany();

      const analyses = (results.results || []).map((item) => {
        const value = item.value || {};

        return {
          ...value,

          // clé exacte KVS
          analysisKey: item.key,

          // ticket où la pièce jointe existe
          sourceIssueKey: currentIssueKey,

          // mission principale pour calcul total
          missionIssueKey: issueKey,

          // sécurité
          amount: value.amount || value.montant || '',
          currency: value.currency || value.devise || 'MAD',
          category: value.category || value.type || 'inconnu'
        };
      });

      allAnalyses.push(...analyses);
    }

    console.log('✅ Toutes les analyses retournées =', JSON.stringify(allAnalyses));

    return {
      success: true,
      analyses: allAnalyses
    };
  } catch (error) {
    console.error('❌ Erreur getMissionAttachmentAnalyses:', error);

    return {
      success: false,
      message: error.message,
      analyses: []
    };
  }
});
/* =========================
   Budget (stubs propres)
========================= */

resolver.define('calculateMissionBudget', async ({ payload }) => {
  try {
    const { missionId } = payload || {};

    if (!missionId) {
      return {
        success: false,
        message: 'missionId manquant.'
      };
    }

    return {
      success: true,
      budget: {
        missionId,
        total: 0,
        currency: 'MAD'
      }
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
});

resolver.define('getMissionBudget', async ({ payload }) => {
  try {
    const { missionId } = payload || {};

    if (!missionId) {
      return {
        success: false,
        message: 'missionId manquant.'
      };
    }

    return {
      success: true,
      budget: {
        missionId,
        total: 0,
        currency: 'MAD'
      }
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
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
export const handleAttachmentCreatedTrigger = async (event) => {
  try {
    console.log('📎 Trigger reçu =', JSON.stringify(event));

    const attachment = event?.payload?.attachment;

    if (!attachment?.id) {
      console.log('❌ attachment.id introuvable');
      return;
    }

    const attachmentId = attachment.id;

    const response = await api.asApp().requestJira(
      route`/rest/api/3/attachment/${attachmentId}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' }
      }
    );

    if (!response.ok) {
      console.error('❌ Erreur lecture attachment');
      return;
    }

    const data = await response.json();

    console.log('📄 DATA attachment =', JSON.stringify(data));

    // ✅ IMPORTANT
    const issueKey =
      data.issueKey ||
      data?.issue?.key ||
      data?.issue?.fields?.key ||
      '';

    const fileName = data.filename || '';
    const mimeType = data.mimeType || '';

    if (!issueKey) {
      console.log('❌ issueKey introuvable');
      return;
    }

    await queue.push({
      body: {
        issueKey,
        attachmentId,
        fileName,
        mimeType
      }
    });

    console.log(`✅ Analyse envoyée pour ${issueKey}`);
  } catch (error) {
    console.error('❌ Trigger error:', error);
  }
};

resolver.define('scanMissionAttachmentsForAnalysis', async ({ payload }) => {
  try {
    const { issueKey } = payload || {};

    if (!issueKey) {
      return {
        success: false,
        message: 'issueKey manquant.',
        queued: 0
      };
    }

    // ✅ Important : mission principale + sous-tickets
    const documents = await getAllMissionDocuments(issueKey);

    let queued = 0;

    for (const attachment of documents) {
      const sourceIssueKey = attachment.sourceIssueKey || issueKey;

      const key = `charge-analysis-${sourceIssueKey}-${attachment.id}`;
      const existing = await kvs.get(key);

      if (!existing) {
        await queue.push({
          body: {
            issueKey: sourceIssueKey,
            attachmentId: attachment.id,
            fileName: attachment.filename || '',
            mimeType: attachment.mimeType || ''
          }
        });

        queued += 1;

        console.log(`📤 Analyse envoyée : ${sourceIssueKey} - ${attachment.filename}`);
      }
    }

    return {
      success: true,
      message: `${queued} fichier(s) envoyé(s) en analyse.`,
      queued
    };
  } catch (error) {
    console.error('Erreur scanMissionAttachmentsForAnalysis:', error);

    return {
      success: false,
      message: error.message,
      queued: 0
    };
  }
});

resolver.define('updateMissionAttachmentAnalysis', async ({ payload }) => {
  try {
    const { issueKey, attachmentId, fileName, category, date, amount, currency, details } = payload || {};

    if (!issueKey || !attachmentId) {
      return {
        success: false,
        message: 'issueKey ou attachmentId manquant.'
      };
    }

    const key = `charge-analysis-${issueKey}-${attachmentId}`;

    const existing = await kvs.get(key);

    if (!existing) {
      return {
        success: false,
        message: 'Analyse introuvable.'
      };
    }

    const updatedValue = {
      ...existing,
      fileName: fileName ?? existing.fileName ?? '',
      category: category ?? existing.category ?? '',
      date: date ?? existing.date ?? '',
      amount: amount ?? existing.amount ?? '',
      currency: currency ?? existing.currency ?? '',
      details: details ?? existing.details ?? '',
      updatedAt: new Date().toISOString()
    };

    await kvs.set(key, updatedValue);

    return {
      success: true,
      message: 'Analyse modifiée avec succès.',
      analysis: updatedValue
    };
  } catch (error) {
    console.error('updateMissionAttachmentAnalysis error:', error);
    return {
      success: false,
      message: 'Erreur lors de la modification de l’analyse.'
    };
  }
});

resolver.define('deleteMissionAttachmentAnalysis', async ({ payload }) => {
  try {
    const { issueKey, attachmentId } = payload || {};

    if (!issueKey || !attachmentId) {
      return {
        success: false,
        message: 'issueKey ou attachmentId manquant.'
      };
    }

    const key = `charge-analysis-${issueKey}-${attachmentId}`;

    const existing = await kvs.get(key);

    if (!existing) {
      return {
        success: false,
        message: 'Analyse introuvable.'
      };
    }

    await kvs.delete(key);

    return {
      success: true,
      message: 'Analyse supprimée avec succès.'
    };
  } catch (error) {
    console.error('deleteMissionAttachmentAnalysis error:', error);
    return {
      success: false,
      message: 'Erreur lors de la suppression de l’analyse.'
    };
  }
});

resolver.define('getAppConfig', async () => {
  try {
    const config = await kvs.get('app-config');

    return {
      success: true,
      configured: !!config?.configured,
      config: config || null
    };
  } catch (error) {
    return {
      success: false,
      configured: false,
      config: null,
      message: error.message
    };
  }
});

resolver.define('saveAppConfig', async ({ payload, context }) => {
  try {
    const {
      mode,
      projectKey,
      projectName
    } = payload || {};

    if (!mode) {
      return {
        success: false,
        message: 'Veuillez choisir une option.'
      };
    }

    if (mode === 'existing' && !projectKey) {
      return {
        success: false,
        message: 'Veuillez saisir la clé du projet Jira.'
      };
    }

    const finalProjectKey = mode === 'existing'
      ? projectKey.toUpperCase()
      : `MIS${Date.now().toString().slice(-4)}`;

    const finalProjectName = mode === 'existing'
      ? projectName || projectKey.toUpperCase()
      : projectName || 'Gestion des missions';

    const config = {
      configured: true,
      mode,
      projectKey: finalProjectKey,
      projectName: finalProjectName,
      adminIds: [context.accountId],
      createdAt: new Date().toISOString()
    };

    await kvs.set('app-config', config);

    return {
      success: true,
      message: 'Configuration enregistrée avec succès.',
      config
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
});
const isCurrentUserAdmin = async (accountId) => {
  const config = await kvs.get('app-config');
  const adminIds = config?.adminIds || [];

  return {
    config,
    isAdmin: adminIds.includes(accountId)
  };
};

resolver.define('getAdminUsers', async ({ context }) => {
  try {
    const { config, isAdmin } = await isCurrentUserAdmin(context.accountId);

    if (!isAdmin) {
      return {
        success: false,
        message: 'Accès refusé. Réservé aux administrateurs.',
        admins: []
      };
    }

    const adminIds = config?.adminIds || [];
    const admins = [];

    for (const accountId of adminIds) {
      const response = await api.asApp().requestJira(
        route`/rest/api/3/user?accountId=${accountId}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json'
          }
        }
      );

      if (response.ok) {
        const user = await response.json();

        admins.push({
          accountId,
          displayName: user.displayName || accountId,
          emailAddress: user.emailAddress || '',
          avatarUrl: user.avatarUrls?.['48x48'] || ''
        });
      } else {
        admins.push({
          accountId,
          displayName: accountId,
          emailAddress: '',
          avatarUrl: ''
        });
      }
    }

    return {
      success: true,
      admins
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      admins: []
    };
  }
});

resolver.define('addAdminUser', async ({ payload, context }) => {
  try {
    const { newAdminId } = payload || {};

    if (!newAdminId) {
      return {
        success: false,
        message: 'Account ID obligatoire.'
      };
    }

    const { config, isAdmin } = await isCurrentUserAdmin(context.accountId);

    if (!isAdmin) {
      return {
        success: false,
        message: 'Accès refusé. Réservé aux administrateurs.'
      };
    }

    const adminIds = config?.adminIds || [];

    if (adminIds.includes(newAdminId)) {
      return {
        success: false,
        message: 'Cet utilisateur est déjà administrateur.'
      };
    }

    const updatedConfig = {
      ...config,
      adminIds: [...adminIds, newAdminId],
      updatedAt: new Date().toISOString()
    };

    await kvs.set('app-config', updatedConfig);

    return {
      success: true,
      message: 'Administrateur ajouté avec succès.',
      admins: updatedConfig.adminIds
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
});

resolver.define('removeAdminUser', async ({ payload, context }) => {
  try {
    const { adminId } = payload || {};

    if (!adminId) {
      return {
        success: false,
        message: 'Account ID obligatoire.'
      };
    }

    const { config, isAdmin } = await isCurrentUserAdmin(context.accountId);

    if (!isAdmin) {
      return {
        success: false,
        message: 'Accès refusé. Réservé aux administrateurs.'
      };
    }

    const adminIds = config?.adminIds || [];

    if (adminIds.length <= 1) {
      return {
        success: false,
        message: 'Impossible de supprimer le dernier administrateur.'
      };
    }

    const updatedConfig = {
      ...config,
      adminIds: adminIds.filter((id) => id !== adminId),
      updatedAt: new Date().toISOString()
    };

    await kvs.set('app-config', updatedConfig);

    return {
      success: true,
      message: 'Administrateur supprimé avec succès.',
      admins: updatedConfig.adminIds
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
});
resolver.define('searchJiraUsersForAdmin', async ({ payload, context }) => {
  try {
    const { query } = payload || {};

    if (!query || query.trim().length < 2) {
      return {
        success: false,
        message: 'Saisir au moins 2 caractères.',
        users: []
      };
    }

    const { config, isAdmin } = await isCurrentUserAdmin(context.accountId);

    if (!isAdmin) {
      return {
        success: false,
        message: 'Accès refusé. Réservé aux administrateurs.',
        users: []
      };
    }

    const response = await api.asApp().requestJira(
      route`/rest/api/3/users/search?query=${query}`,
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
        message: errorText,
        users: []
      };
    }

    const data = await response.json();

  const q = String(query || '').toLowerCase().trim();

const users = (data || [])
  .filter((user) => {
    const name = String(user.displayName || '').toLowerCase();

    return (
      user.accountType === 'atlassian' &&
      user.active === true &&
      name.includes(q) &&
      !name.includes('jira') &&
      !name.includes('automation') &&
      !name.includes('assist') &&
      !name.includes('app')
    );
  })
  .map((user) => ({
    accountId: user.accountId,
    displayName: user.displayName,
    emailAddress: user.emailAddress || '',
    avatarUrl: user.avatarUrls?.['48x48'] || ''
  }))
  .slice(0, 10);

    return {
      success: true,
      users
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      users: []
    };
  }
});

export const handler = resolver.getDefinitions();
import Resolver from '@forge/resolver';
import api, { route, storage, startsWith } from '@forge/api';

const resolver = new Resolver();

const ADMIN_IDS = ['ID_ADMIN_1'];

// À adapter selon ton projet Jira
const PROJECT_KEY = 'FOR';
const ISSUE_TYPE_NAME = 'Task';
const SUBTASK_ISSUE_TYPE_NAME = 'Sous-tâche'; 
// Si ça ne marche pas dans ton Jira, remplace par le vrai nom exact du type de sous-tâche

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

    return {
      success: true,
      missions: filteredMissions,
      role: isAdmin ? 'admin' : 'employe'
    };
  } catch (error) {
    console.error('Erreur backend getMissions:', error);
    return {
      success: false,
      message: `Erreur backend: ${error.message}`
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
    const { issueKey, type } = payload || {};

    if (!issueKey || !type) {
      return {
        success: false,
        message: 'issueKey ou type manquant.'
      };
    }

    const chargeLabel = getChargeLabel(type);
    const jql = `parent = "${issueKey}"`;

    const searchData = await searchIssuesByJql(jql, ['summary', 'issuetype']);
    const existingCharges = searchData.issues || [];

    const existingCharge = existingCharges.find((issue) => {
      const summary = normalizeText(issue.fields?.summary);
      return summary === normalizeText(chargeLabel);
    });

    if (existingCharge) {
      return {
        success: true,
        alreadyExists: true,
        message: 'Charge déjà existante.',
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
        summary: chargeLabel,
        description: {
          type: 'doc',
          version: 1,
          content: [
            toAdfParagraph(`Type de charge : ${chargeLabel}`),
            toAdfParagraph(`Mission parente : ${issueKey}`),
            toAdfParagraph('Preuve à ajouter dans ce ticket.')
          ]
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
      charge: subtask
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
    const data = await searchIssuesByJql(jql, ['summary', 'status', 'issuetype']);

    return {
      success: true,
      charges: data.issues || []
    };
  } catch (error) {
    console.error('Erreur backend getMissionCharges:', error);
    return {
      success: false,
      message: `Impossible de récupérer les charges: ${error.message}`
    };
  }
});

export const handler = resolver.getDefinitions();
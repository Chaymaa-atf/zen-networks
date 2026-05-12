import { invoke } from '@forge/bridge';

/* =========================
   MISSIONS
========================= */

export const createMission = async (data) => {
  return await invoke('createMission', data);
};

export const getMissions = async (userId) => {
  return await invoke('getMissions', { userId });
};

export const getMissionById = async (missionId) => {
  return await invoke('getMissionById', { missionId });
};

export const updateMission = async (data) => {
  return await invoke('updateMission', data);
};

export const updateMissionStatus = async (missionId, statut) => {
  return await invoke('updateMissionStatus', { missionId, statut });
};

export const deleteMission = async (missionId) => {
  return await invoke('deleteMission', { missionId });
};

/* =========================
   DOCUMENTS / ATTACHMENTS
========================= */

export const getMissionAttachments = async (issueKey) => {
  return await invoke('getMissionAttachments', { issueKey });
};

export const getMissionAllDocuments = async (issueKey) => {
  return await invoke('getMissionAllDocuments', { issueKey });
};

export const generateMissionPdf = async (issueKey) => {
  return await invoke('generateMissionPdf', { issueKey });
};

export const uploadAttachment = async (payload) => {
  return await invoke('uploadAttachment', payload);
};

/* =========================
   CHARGES
========================= */

export const createCharge = async (data) => {
  return await invoke('createCharge', data);
};

export const getMissionCharges = async (issueKey) => {
  return await invoke('getMissionCharges', { issueKey });
};

/* =========================
   IA / EXTRACTION
========================= */

export const getExtractedAttachmentData = async (issueKey, attachmentId) => {
  return await invoke('getExtractedAttachmentData', {
    issueKey,
    attachmentId
  });
};

export const getMissionAttachmentAnalyses = async (issueKey) => {
  return await invoke('getMissionAttachmentAnalyses', {
    issueKey
  });
};

/* =========================
   BUDGET PREVISIONNEL
========================= */

export const calculateMissionBudget = async (missionId) => {
  return await invoke('calculateMissionBudget', { missionId });
};

export const getMissionBudget = async (missionId) => {
  return await invoke('getMissionBudget', { missionId });
};

/* =========================
   HELPERS FRONT
========================= */

export const refreshMissionAnalysisData = async (issueKey) => {
  const [documentsRes, chargesRes, analysesRes] = await Promise.all([
    getMissionAllDocuments(issueKey),
    getMissionCharges(issueKey),
    getMissionAttachmentAnalyses(issueKey)
  ]);

  return {
    documents: documentsRes?.success ? documentsRes.attachments || [] : [],
    charges: chargesRes?.success ? chargesRes.charges || [] : [],
    analyses: analysesRes?.success ? analysesRes.analyses || [] : []
  };
};

export const scanMissionAttachmentsForAnalysis = async (issueKey) => {
  return await invoke('scanMissionAttachmentsForAnalysis', { issueKey });
};

export const updateMissionAttachmentAnalysis = async (payload) => {
  const response = await invoke('updateMissionAttachmentAnalysis', payload);
  return response;
};

export const deleteMissionAttachmentAnalysis = async (payload) => {
  const response = await invoke('deleteMissionAttachmentAnalysis', payload);
  return response;
};
export const getAppConfig = async () => {
  return await invoke('getAppConfig');
};

export const saveAppConfig = async (payload) => {
  return await invoke('saveAppConfig', payload);
};
export const getAdminUsers = async () => {
  return await invoke('getAdminUsers');
};

export const addAdminUser = async (newAdminId) => {
  return await invoke('addAdminUser', { newAdminId });
};

export const removeAdminUser = async (adminId) => {
  return await invoke('removeAdminUser', { adminId });
};
export const searchJiraUsersForAdmin = async (query) => {
  return await invoke('searchJiraUsersForAdmin', { query });
};
export const createManualChargeAnalysis = async (payload) => {
  return await invoke('createManualChargeAnalysis', payload);
};
export const getOrdreMissionConfig = async () => {
  return await invoke('getOrdreMissionConfig');
};

export const saveOrdreMissionConfig = async (payload) => {
  return await invoke('saveOrdreMissionConfig', payload);
};
export const generateOrdreMissionPdf = async (payload) => {
  return await invoke('generateOrdreMissionPdf', payload);
};
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

export const queueAttachmentAnalysis = async (data) => {
  return await invoke('queueAttachmentAnalysis', data);
};

export const getChargeExtractedData = async (issueKey, attachmentId) => {
  return await invoke('getChargeExtractedData', { issueKey, attachmentId });
};

export const markChargeAttachmentUploaded = async (data) => {
  return await invoke('markChargeAttachmentUploaded', data);
};
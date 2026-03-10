import { invoke } from '@forge/bridge';

export const createMission = async (data) => {
  return await invoke('createMission', data);
};

export const getMissions = async () => {
  return await invoke('getMissions');
};
import { storage, startsWith } from '@forge/api';

const registerMissionResolvers = (resolver) => {
  resolver.define('createMission', async ({ payload }) => {
    try {
      const {
        titre,
        destination,
        pays,
        ville,
        dateDepart,
        dateRetour,
        motif
      } = payload;

      if (
        !titre ||
        !destination ||
        !pays ||
        !ville ||
        !dateDepart ||
        !dateRetour ||
        !motif
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
        createdAt: new Date().toISOString()
      };

      await storage.set(missionId, mission);

      return {
        success: true,
        message: 'Mission créée avec succès.'
      };
    } catch (error) {
      console.error('Erreur backend createMission:', error);
      return {
        success: false,
        message: `Erreur backend: ${error.message}`
      };
    }
  });

  resolver.define('getMissions', async () => {
    try {
      const data = await storage
        .query()
        .where('key', startsWith('mission-'))
        .getMany();

      const missions = (data.results || []).map((item) => item.value);

      missions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return {
        success: true,
        missions
      };
    } catch (error) {
      console.error('Erreur backend getMissions:', error);
      return {
        success: false,
        missions: [],
        message: `Erreur backend: ${error.message}`
      };
    }
  });
};

export default registerMissionResolvers;
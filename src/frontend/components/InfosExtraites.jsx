import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';

const InfosExtraites = ({ issueKey, attachmentId }) => {
  const [data, setData] = useState(null);

  // ✅ TA FONCTION ICI
  const loadData = async () => {
    try {
      const res = await invoke('getExtractedAttachmentData', {
        issueKey,
        attachmentId
      });

      console.log("DATA:", res);

      if (res.success) {
        setData(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ✅ IMPORTANT : auto refresh (car queue async)
  useEffect(() => {
    loadData();

    const interval = setInterval(loadData, 3000); // toutes les 3s
    return () => clearInterval(interval);
  }, [issueKey, attachmentId]);

  // ✅ affichage
  if (!data) {
    return <p>Analyse en cours...</p>;
  }

  return (
    <div style={{ padding: 10, background: "#f4f5f7", borderRadius: 8 }}>
      <h3>📄 Analyse IA</h3>
      <p>💰 Montant : {data.montant || '-'}</p>
      <p>📅 Date : {data.date || '-'}</p>
      <p>🏢 Fournisseur : {data.fournisseur || '-'}</p>
    </div>
  );
};

export default InfosExtraites;
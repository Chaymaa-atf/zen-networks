import React, { useEffect, useState } from 'react';
import { events } from '@forge/bridge';

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result || '';
      const base64 = String(result).split(',')[1] || '';
      resolve(base64);
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let successSub;
    let errorSub;

    const register = async () => {
      successSub = await events.on('ATTACHMENT_UPLOAD_SUCCESS', () => {
        setStatus('Pièce jointe ajoutée avec succès.');
        setSelectedFile(null);
      });

      errorSub = await events.on('ATTACHMENT_UPLOAD_ERROR', ({ message }) => {
        setStatus(message || "Erreur lors de l'envoi.");
      });
    };

    register();

    return () => {
      if (successSub) {
        successSub.then(({ unsubscribe }) => unsubscribe());
      }
      if (errorSub) {
        errorSub.then(({ unsubscribe }) => unsubscribe());
      }
    };
  }, []);

  const handleSend = async () => {
    try {
      if (!selectedFile) {
        setStatus('Choisis un fichier.');
        return;
      }

      setStatus('Conversion du fichier...');

      const fileBase64 = await toBase64(selectedFile);

      await events.emit('ATTACHMENT_UPLOAD_REQUEST', {
        fileName: selectedFile.name,
        mimeType: selectedFile.type || 'application/octet-stream',
        fileBase64
      });
    } catch (error) {
      console.error(error);
      setStatus('Erreur pendant la conversion du fichier.');
    }
  };

  const handleCancel = async () => {
    await events.emit('ATTACHMENT_UPLOAD_CANCEL', {});
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: 12 }}>
      <input
        type="file"
        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
      />

      <div style={{ marginTop: 10, fontSize: 12, color: '#6b778c' }}>
        {selectedFile ? `Fichier choisi : ${selectedFile.name}` : 'Aucun fichier choisi'}
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button type="button" onClick={handleSend}>
          Envoyer
        </button>
        <button type="button" onClick={handleCancel}>
          Annuler
        </button>
      </div>

      <div style={{ marginTop: 12, fontSize: 12 }}>{status}</div>
    </div>
  );
}
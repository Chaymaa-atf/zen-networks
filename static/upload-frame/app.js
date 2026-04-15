const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const sendBtn = document.getElementById('sendBtn');
const cancelBtn = document.getElementById('cancelBtn');
const statusEl = document.getElementById('status');

let selectedFile = null;

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

fileInput.addEventListener('change', (e) => {
  selectedFile = e.target.files && e.target.files[0] ? e.target.files[0] : null;
  fileName.textContent = selectedFile
    ? `Fichier choisi : ${selectedFile.name}`
    : 'Aucun fichier choisi';
  statusEl.textContent = '';
  statusEl.className = 'info';

  console.log('FRAME: fichier sélectionné =', selectedFile);
});

sendBtn.addEventListener('click', async () => {
  try {
    console.log('FRAME: clic sur Envoyer');

    if (!selectedFile) {
      statusEl.textContent = 'Choisis un fichier.';
      statusEl.className = 'error';
      return;
    }

    statusEl.textContent = 'Conversion du fichier...';
    statusEl.className = 'info';

    const fileBase64 = await toBase64(selectedFile);

    console.log('FRAME: base64 prêt, envoi au parent');

    window.parent.postMessage(
      {
        type: 'ATTACHMENT_UPLOAD_REQUEST',
        payload: {
          fileName: selectedFile.name,
          mimeType: selectedFile.type || 'application/octet-stream',
          fileBase64
        }
      },
      '*'
    );
  } catch (error) {
    console.error('FRAME: erreur upload =', error);
    statusEl.textContent = 'Erreur pendant la conversion du fichier.';
    statusEl.className = 'error';
  }
});

cancelBtn.addEventListener('click', () => {
  console.log('FRAME: clic sur Annuler');

  window.parent.postMessage(
    {
      type: 'ATTACHMENT_UPLOAD_CANCEL'
    },
    '*'
  );
});

window.addEventListener('message', (event) => {
  const data = event.data;

  console.log('FRAME: message reçu du parent =', data);

  if (!data || typeof data !== 'object') return;

  if (data.type === 'ATTACHMENT_UPLOAD_SUCCESS') {
    statusEl.textContent = 'Pièce jointe ajoutée avec succès.';
    statusEl.className = 'success';
    fileInput.value = '';
    selectedFile = null;
    fileName.textContent = 'Aucun fichier choisi';
  }

  if (data.type === 'ATTACHMENT_UPLOAD_ERROR') {
    statusEl.textContent = data.message || "Erreur lors de l'envoi.";
    statusEl.className = 'error';
  }
});
import api, { route, storage } from '@forge/api';

function guessTypeFromFileName(fileName = '') {
  const name = fileName.toLowerCase();

  if (name.includes('hotel')) return 'hotel';
  if (name.includes('restaurant') || name.includes('resto')) return 'restaurant';
  if (name.includes('carburant') || name.includes('essence')) return 'carburant';
  if (name.includes('avion') || name.includes('billet') || name.includes('train')) return 'transport';

  return 'autre';
}

function extractAmount(text = '') {
  const match = text.match(/(\d+[.,]\d{2})/);
  return match ? match[1].replace(',', '.') : '';
}

function extractDate(text = '') {
  const match = text.match(/\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/);
  return match ? match[1] : '';
}

function guessSupplier(text = '') {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.length > 0 ? lines[0] : '';
}

async function extractFieldsFromDocument({ fileName, mimeType, base64Content }) {
  const fakeExtractedText = '';

  const type = guessTypeFromFileName(fileName);

  return {
    type,
    montant: extractAmount(fakeExtractedText),
    devise: fakeExtractedText.includes('EUR') ? 'EUR' : 'MAD',
    date: extractDate(fakeExtractedText),
    fournisseur: guessSupplier(fakeExtractedText),
    commentaire: fakeExtractedText
      ? 'Extraction automatique effectuée'
      : 'Aucun texte extrait: brancher un OCR/Vision'
  };
}

async function downloadAttachmentContent(attachmentId) {
  const response = await api.asApp().requestJira(
    route`/rest/api/3/attachment/content/${attachmentId}`,
    {
      method: 'GET',
      headers: {
        Accept: '*/*'
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Téléchargement de la pièce jointe échoué: ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

function getMimeTypeFromFileName(fileName = '') {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.pdf')) return 'application/pdf';

  return 'application/octet-stream';
}

export const handler = async (event) => {
  try {
    console.log('===== CONSUMER START =====');
    console.log('EVENT CONSUMER =', JSON.stringify(event, null, 2));

    const payload = event?.body || event;
    const { action, issueKey, attachmentId, fileName } = payload || {};

    if (action !== 'analyze_attachment') {
      console.log('Action ignorée:', action);
      return;
    }

    if (!issueKey || !attachmentId || !fileName) {
      throw new Error('issueKey, attachmentId ou fileName manquant');
    }

    const mimeType = getMimeTypeFromFileName(fileName);
    const base64Content = await downloadAttachmentContent(attachmentId);

    const extractedData = await extractFieldsFromDocument({
      fileName,
      mimeType,
      base64Content
    });

    const finalData = {
      type: extractedData.type || guessTypeFromFileName(fileName),
      montant: extractedData.montant || '',
      devise: extractedData.devise || 'MAD',
      date: extractedData.date || '',
      fournisseur: extractedData.fournisseur || '',
      commentaire: extractedData.commentaire || ''
    };

    const storageKey = `charge-analysis-${issueKey}-${attachmentId}`;
    await storage.set(storageKey, finalData);

    console.log('Analyse enregistrée :', finalData);
    console.log('===== CONSUMER END =====');
  } catch (error) {
    console.error('Erreur consumer:', error);
  }
};
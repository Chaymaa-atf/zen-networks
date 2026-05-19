import api, { route } from '@forge/api';
import { kvs } from '@forge/kvs';

/* =========================
   Utils
========================= */

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function detectMimeTypeFromFileName(fileName = '') {
  const lower = String(fileName || '').toLowerCase();

  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';

  return 'application/octet-stream';
}

function buildStorageKey(issueKey, attachmentId) {
  return `charge-analysis-${issueKey}-${attachmentId}`;
}

function normalizeCategory(value = '') {
  const v = String(value || '').toLowerCase().trim();

  if (
    v.includes('transport') ||
    v.includes('avion') ||
    v.includes('billet d’avion') ||
    v.includes("billet d'avion") ||
    v.includes('flight') ||
    v.includes('boarding')
  ) {
    return 'transport';
  }

  if (
    v.includes('restaurant') ||
    v.includes('restauration') ||
    v.includes('repas')
  ) {
    return 'restaurant';
  }

  if (
    v.includes('hebergement') ||
    v.includes('hébergement') ||
    v.includes('hotel') ||
    v.includes('hôtel') ||
    v.includes('airbnb')
  ) {
    return 'hebergement';
  }

  return 'inconnu';
}

function validateGroqResult(result) {
  if (!result || typeof result !== 'object') {
    throw new Error('Réponse Groq invalide.');
  }

  return {
    category: normalizeCategory(result.category),
    confidence: Number(result.confidence || 0),
    date: String(result.date || ''),
    amount: String(result.amount || ''),
    currency: String(result.currency || ''),
    details: String(result.details || ''),
    rawText: String(result.rawText || '')
  };
}

/* =========================
   OCR
========================= */

async function extractTextWithOCR(bytes, mimeType, fileName) {
  const ocrApiKey =
    process.env.OCR_SPACE_API_KEY ||
    process.env.FORGE_USER_VAR_OCR_SPACE_API_KEY;

  if (!ocrApiKey) {
    console.error('❌ OCR key absente');
    throw new Error('OCR_SPACE_API_KEY manquant.');
  }

  const base64 = Buffer.from(bytes).toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const body =
    `base64Image=${encodeURIComponent(dataUrl)}` +
    `&language=fre` +
    `&OCREngine=2` +
    `&isOverlayRequired=false`;

  const response = await api.fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: {
      apikey: ocrApiKey,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ OCR HTTP error:', errorText);
    throw new Error('Erreur OCR HTTP');
  }

  const data = await response.json();
  console.log('📄 OCR RAW:', JSON.stringify(data));

  if (data?.IsErroredOnProcessing) {
    throw new Error(data?.ErrorMessage?.join?.(' | ') || 'OCR échoué');
  }

  const text = (data?.ParsedResults || [])
    .map((x) => x?.ParsedText || '')
    .join('\n')
    .trim();

  if (!text) {
    throw new Error('OCR vide');
  }

  return text;
}

/* =========================
   GROQ
========================= */

async function extractStructuredData(text, fileName) {
  const GROQ_KEYS = [
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
  process.env.GROQ_API_KEY_4,
  process.env.GROQ_API_KEY_5,
  process.env.GROQ_API_KEY_6,
  process.env.GROQ_API_KEY_7,
  process.env.GROQ_API_KEY_8
].filter(Boolean);

const getGroqApiKey = () => {
  if (GROQ_KEYS.length === 0) {
    throw new Error('Aucune clé Groq configurée.');
  }

  const randomIndex = Math.floor(Math.random() * GROQ_KEYS.length);

  return GROQ_KEYS[randomIndex];
};

const groqApiKey = getGroqApiKey();

  if (!groqApiKey) {
    console.error('❌ Groq key absente');
    throw new Error('GROQ_API_KEY manquant.');
  }

  const prompt = `
Analyse ce texte extrait d'un justificatif de mission.

Retourne uniquement un JSON valide, sans explication, sans markdown, sans texte avant ou après.

Structure obligatoire :

{
  "category": "",
  "confidence": 0,
  "date": "",
  "amount": "",
  "currency": "",
  "details": "",
  "rawText": ""
}

Contraintes :
- category doit être uniquement : "restaurant", "hebergement", "transport", "inconnu"
- confidence doit être un nombre
- date doit être une chaîne ou vide
- amount doit être une chaîne ou vide
- currency doit être une chaîne ou vide
- details doit être une chaîne courte
- rawText doit contenir le texte extrait

Nom du fichier :
${fileName}

Texte :
${text}
`;

  const response = await api.fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      temperature: 0,
      messages: [{ role: 'user', content: prompt }]
    })
  });

 if (!response.ok) {
  const errorText = await response.text();
  console.error('❌ GROQ error status:', response.status);
  console.error('❌ GROQ error body:', errorText);

  throw new Error(`Erreur Groq ${response.status}: ${errorText}`);
}

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || '';

  console.log('🤖 GROQ RAW:', content);

  let jsonString = '';

  const fencedMatch = content.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fencedMatch && fencedMatch[1]) {
    jsonString = fencedMatch[1].trim();
  } else {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      jsonString = content.slice(start, end + 1).trim();
    }
  }

  const parsed = safeJsonParse(jsonString);

  if (!parsed) {
    console.error('❌ JSON extrait invalide:', jsonString);
    throw new Error('Groq JSON invalide');
  }

  return validateGroqResult(parsed);
}

/* =========================
   MAIN CONSUMER
========================= */

export const handler = async (event) => {
  console.log('🚀 CONSUMER DEMARRE');
  console.log('📥 EVENT:', JSON.stringify(event));

  const { issueKey, attachmentId, fileName, mimeType } = event.body || {};

  if (!issueKey || !attachmentId || !fileName) {
    throw new Error('Paramètres manquants');
  }

  const finalMime = mimeType || detectMimeTypeFromFileName(fileName);

  const response = await api.asApp().requestJira(
    route`/rest/api/3/attachment/content/${attachmentId}`,
    {
      method: 'GET',
      headers: { Accept: '*/*' }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Download attachment failed:', errorText);
    throw new Error('Download attachment failed');
  }

  const bytes = new Uint8Array(await response.arrayBuffer());

  console.log('📄 FILE OK:', fileName);

  const text = await extractTextWithOCR(bytes, finalMime, fileName);
  console.log('✅ OCR TEXT:', text.substring(0, 500));

  const ai = await extractStructuredData(text, fileName);
  console.log('✅ GROQ:', JSON.stringify(ai));

  const payload = {
    issueKey,
    attachmentId,
    fileName,
    mimeType: finalMime,
    analyzedAt: new Date().toISOString(),
    ...ai,
    rawText: ai.rawText || text
  };

  const key = buildStorageKey(issueKey, attachmentId);
  await kvs.set(key, payload);

  console.log('💾 SAVED:', JSON.stringify(payload));
};
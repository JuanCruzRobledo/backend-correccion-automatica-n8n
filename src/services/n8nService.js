/**
 * Servicio para interactuar con webhooks de n8n
 */
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import User from '../models/User.js';

/**
 * Obtiene la API key de Gemini del usuario
 * @param {String} userId - ID del usuario
 * @returns {Promise<String>} API key de Gemini
 * @throws {Error} Si el usuario no tiene API key configurada
 */
export const getGeminiApiKeyForUser = async (userId) => {
  if (!userId) {
    throw new Error('Se requiere ID de usuario para obtener API key');
  }

  // Buscar usuario (necesitamos incluir el campo encriptado)
  const user = await User.findById(userId).select('+gemini_api_key_encrypted');

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  if (user.deleted) {
    throw new Error('Usuario eliminado');
  }

  // Verificar que tenga API key válida
  if (!user.hasValidGeminiApiKey()) {
    throw new Error(
      'Debes configurar tu API Key de Gemini en tu perfil antes de poder usar el sistema de corrección. ' +
      'Ve a tu perfil para configurarla.'
    );
  }

  // Obtener la API key desencriptada
  const apiKey = user.getGeminiApiKey();

  if (!apiKey) {
    throw new Error('Error al obtener la API key. Intenta reconfigurarla en tu perfil.');
  }

  return apiKey;
};

/**
 * Generar rúbrica desde PDF usando webhook de n8n
 * @param {String} pdfPath - Ruta del archivo PDF
 * @param {String} userId - ID del usuario (opcional, usa key del sistema si no se proporciona)
 * @returns {Promise<Object>} JSON de la rúbrica
 */
export const generateRubricFromPDF = async (pdfPath, userId = null) => {
  try {
    const webhookUrl = process.env.N8N_RUBRIC_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error('N8N_RUBRIC_WEBHOOK_URL no está configurada en .env');
    }

    // Obtener API key (del usuario si se proporciona userId, sino del sistema)
    let geminiApiKey;
    if (userId) {
      geminiApiKey = await getGeminiApiKeyForUser(userId);
      console.log(`📄 Generando rúbrica desde PDF usando API key del usuario ${userId}`);
    } else {
      geminiApiKey = process.env.GEMINI_API_KEY;
      console.log('📄 Generando rúbrica desde PDF usando API key del sistema (legacy)');
    }

    // Crear FormData
    const formData = new FormData();
    formData.append('pdf', fs.createReadStream(pdfPath));
    formData.append('gemini_api_key', geminiApiKey); // Pasar API key a n8n

    // Enviar a n8n
    const response = await axios.post(webhookUrl, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 60000, // 60 segundos
    });

    // El webhook devuelve el JSON de la rúbrica
    return response.data;
  } catch (error) {
    console.error('Error al generar rúbrica desde PDF:', error.message);

    if (error.response) {
      throw new Error(`Error del webhook n8n: ${error.response.data?.message || error.response.statusText}`);
    }

    throw new Error(`Error al conectar con n8n: ${error.message}`);
  }
};

/**
 * Corregir archivo con rúbrica usando webhook de n8n
 * @param {String} rubricPath - Ruta del archivo JSON de rúbrica
 * @param {String} submissionPath - Ruta del archivo a corregir
 * @param {String} userId - ID del usuario (OBLIGATORIO)
 * @returns {Promise<Object>} Resultado de la corrección
 */
export const gradeSubmission = async (rubricPath, submissionPath, userId) => {
  try {
    // El userId es OBLIGATORIO para corrección
    if (!userId) {
      throw new Error('Se requiere ID de usuario para realizar correcciones');
    }

    const webhookUrl = process.env.N8N_GRADING_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error('N8N_GRADING_WEBHOOK_URL no está configurada en .env');
    }

    // Obtener API key del usuario (OBLIGATORIA)
    const geminiApiKey = await getGeminiApiKeyForUser(userId);
    console.log(`✅ Corrigiendo archivo usando API key del usuario ${userId}`);

    // Crear FormData
    const formData = new FormData();
    formData.append('rubric', fs.createReadStream(rubricPath));
    formData.append('submission', fs.createReadStream(submissionPath));
    formData.append('gemini_api_key', geminiApiKey); // Pasar API key a n8n

    // Enviar a n8n
    const response = await axios.post(webhookUrl, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 120000, // 120 segundos (la evaluación puede tardar más)
    });

    return response.data;
  } catch (error) {
    console.error('Error al corregir archivo:', error.message);

    if (error.response) {
      throw new Error(`Error del webhook n8n: ${error.response.data?.message || error.response.statusText}`);
    }

    throw new Error(`Error al conectar con n8n: ${error.message}`);
  }
};

/**
 * Subir resultados a Google Sheets usando webhook de n8n
 * @param {Object} data - Datos a subir
 * @returns {Promise<Object>} Respuesta del webhook
 */
export const uploadToSpreadsheet = async (data) => {
  try {
    const webhookUrl = process.env.N8N_SPREADSHEET_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error('N8N_SPREADSHEET_WEBHOOK_URL no está configurada en .env');
    }

    const response = await axios.post(webhookUrl, data, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 segundos
    });

    return response.data;
  } catch (error) {
    console.error('Error al subir a spreadsheet:', error.message);

    if (error.response) {
      throw new Error(`Error del webhook n8n: ${error.response.data?.message || error.response.statusText}`);
    }

    throw new Error(`Error al conectar con n8n: ${error.message}`);
  }
};

/**
 * Servicio para interactuar con webhooks de n8n
 */
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

/**
 * Generar rúbrica desde PDF usando webhook de n8n
 * @param {String} pdfPath - Ruta del archivo PDF
 * @returns {Promise<Object>} JSON de la rúbrica
 */
export const generateRubricFromPDF = async (pdfPath) => {
  try {
    const webhookUrl = process.env.N8N_RUBRIC_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error('N8N_RUBRIC_WEBHOOK_URL no está configurada en .env');
    }

    // Crear FormData
    const formData = new FormData();
    formData.append('pdf', fs.createReadStream(pdfPath));

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
 * @returns {Promise<Object>} Resultado de la corrección
 */
export const gradeSubmission = async (rubricPath, submissionPath) => {
  try {
    const webhookUrl = process.env.N8N_GRADING_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error('N8N_GRADING_WEBHOOK_URL no está configurada en .env');
    }

    // Crear FormData
    const formData = new FormData();
    formData.append('rubric', fs.createReadStream(rubricPath));
    formData.append('submission', fs.createReadStream(submissionPath));

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

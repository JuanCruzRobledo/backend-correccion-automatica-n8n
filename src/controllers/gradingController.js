/**
 * Grading Controller
 * Maneja la corrección de exámenes (proxy al webhook de n8n con API key del usuario)
 */
import User from '../models/User.js';
import FormData from 'form-data';
import axios from 'axios';

/**
 * POST /api/grade
 * Corregir un examen individual (proxy con API key del usuario)
 */
export const gradeSubmission = async (req, res) => {
  try {
    // req.user viene del middleware authenticate
    const userId = req.user.id;

    // Verificar que el usuario tenga API key configurada
    const user = await User.findById(userId).select('+gemini_api_key_encrypted');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    if (!user.hasValidGeminiApiKey()) {
      return res.status(403).json({
        success: false,
        message: 'Debes configurar tu API Key de Gemini en tu perfil antes de poder corregir.',
      });
    }

    // Obtener la API key desencriptada
    const geminiApiKey = user.getGeminiApiKey();

    if (!geminiApiKey) {
      return res.status(500).json({
        success: false,
        message: 'Error al obtener la API key. Intenta reconfigurarla en tu perfil.',
      });
    }

    // Extraer datos del body y archivos
    const {
      universidad,
      facultad,
      carrera,
      materia,
      comision,
      nombre_rubrica,
    } = req.body;

    // Validar campos requeridos
    if (!universidad || !facultad || !carrera || !materia || !comision || !nombre_rubrica) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: universidad, facultad, carrera, materia, comision, nombre_rubrica',
      });
    }

    // Validar archivos
    if (!req.files || !req.files.rubrica || !req.files.examen) {
      return res.status(400).json({
        success: false,
        message: 'Faltan archivos requeridos: rubrica (JSON) y examen (archivo binario)',
      });
    }

    const rubricaFile = Array.isArray(req.files.rubrica) ? req.files.rubrica[0] : req.files.rubrica;
    const examenFile = Array.isArray(req.files.examen) ? req.files.examen[0] : req.files.examen;

    // Crear FormData para enviar a n8n
    const formData = new FormData();

    // Agregar strings
    formData.append('universidad', universidad);
    formData.append('facultad', facultad);
    formData.append('carrera', carrera);
    formData.append('materia', materia);
    formData.append('comision', comision);
    formData.append('apiKey', geminiApiKey); // API key real del usuario
    formData.append('nombre_rubrica', nombre_rubrica);

    // Agregar archivo JSON (rúbrica)
    formData.append('rubrica', rubricaFile.data, {
      filename: rubricaFile.name,
      contentType: 'application/json',
    });

    // Agregar archivo binario (examen)
    formData.append('examen', examenFile.data, {
      filename: examenFile.name,
      contentType: examenFile.mimetype,
    });

    // Webhook de n8n
    const webhookUrl = 'https://primerparcialp1-n8n.vbz8zm.easypanel.host/webhook/automatico';

    console.log(`📝 Corrigiendo examen para usuario ${user.username} (${userId})`);

    // Enviar a n8n
    const response = await axios.post(webhookUrl, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 120000, // 2 minutos
    });

    console.log(`✅ Corrección completada para usuario ${user.username}`);

    // Devolver respuesta de n8n al frontend
    res.status(200).json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error('Error al corregir examen:', error);

    if (error.response) {
      return res.status(error.response.status || 500).json({
        success: false,
        message: `Error del webhook n8n: ${error.response.data?.message || error.response.statusText}`,
        error: error.response.data,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al corregir el examen',
      error: error.message,
    });
  }
};

export default {
  gradeSubmission,
};

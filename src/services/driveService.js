/**
 * Servicio para interactuar con webhooks de n8n para Google Drive
 * Este servicio maneja la creación automática de carpetas en Drive
 * cuando se crean nuevas entidades en el sistema
 */
import axios from 'axios';

/**
 * Crear carpeta de Universidad en Google Drive
 * @param {String} university_id - ID de la universidad (nombre de carpeta)
 * @returns {Promise<Object>} Respuesta del webhook
 */
export const createUniversityFolder = async (university_id) => {
  try {
    const webhookUrl = process.env.N8N_CREATE_UNIVERSITY_FOLDER_WEBHOOK;

    if (!webhookUrl) {
      console.warn('⚠️  N8N_CREATE_UNIVERSITY_FOLDER_WEBHOOK no está configurada. Saltando creación de carpeta.');
      return { success: false, message: 'Webhook no configurado' };
    }

    console.log(`📁 Creando carpeta de universidad: ${university_id}`);

    const response = await axios.post(
      webhookUrl,
      { university_id },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000, // 30 segundos
      }
    );

    console.log(`✅ Carpeta de universidad creada: ${university_id}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error al crear carpeta de universidad "${university_id}":`, error.message);

    // No lanzar error, solo registrar (para no bloquear la creación de la entidad)
    return {
      success: false,
      message: error.response?.data?.message || error.message,
    };
  }
};

/**
 * Crear carpeta de Facultad en Google Drive
 * @param {String} faculty_id - ID de la facultad
 * @param {String} university_id - ID de la universidad padre
 * @returns {Promise<Object>} Respuesta del webhook
 */
export const createFacultyFolder = async (faculty_id, university_id) => {
  try {
    const webhookUrl = process.env.N8N_CREATE_FACULTY_FOLDER_WEBHOOK;

    if (!webhookUrl) {
      console.warn('⚠️  N8N_CREATE_FACULTY_FOLDER_WEBHOOK no está configurada. Saltando creación de carpeta.');
      return { success: false, message: 'Webhook no configurado' };
    }

    console.log(`📁 Creando carpeta de facultad: ${faculty_id} (en ${university_id})`);

    const response = await axios.post(
      webhookUrl,
      { faculty_id, university_id },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );

    console.log(`✅ Carpeta de facultad creada: ${faculty_id}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error al crear carpeta de facultad "${faculty_id}":`, error.message);

    return {
      success: false,
      message: error.response?.data?.message || error.message,
    };
  }
};

/**
 * Crear carpeta de Carrera en Google Drive
 * @param {String} career_id - ID de la carrera
 * @param {String} faculty_id - ID de la facultad padre
 * @param {String} university_id - ID de la universidad
 * @returns {Promise<Object>} Respuesta del webhook
 */
export const createCareerFolder = async (career_id, faculty_id, university_id) => {
  try {
    const webhookUrl = process.env.N8N_CREATE_CAREER_FOLDER_WEBHOOK;

    if (!webhookUrl) {
      console.warn('⚠️  N8N_CREATE_CAREER_FOLDER_WEBHOOK no está configurada. Saltando creación de carpeta.');
      return { success: false, message: 'Webhook no configurado' };
    }

    console.log(`📁 Creando carpeta de carrera: ${career_id} (en ${faculty_id}/${university_id})`);

    const response = await axios.post(
      webhookUrl,
      { career_id, faculty_id, university_id },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );

    console.log(`✅ Carpeta de carrera creada: ${career_id}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error al crear carpeta de carrera "${career_id}":`, error.message);

    return {
      success: false,
      message: error.response?.data?.message || error.message,
    };
  }
};

/**
 * Crear carpeta de Materia/Curso en Google Drive
 * @param {String} course_id - ID del curso
 * @param {String} career_id - ID de la carrera padre
 * @param {String} faculty_id - ID de la facultad
 * @param {String} university_id - ID de la universidad
 * @returns {Promise<Object>} Respuesta del webhook
 */
export const createCourseFolder = async (course_id, career_id, faculty_id, university_id) => {
  try {
    const webhookUrl = process.env.N8N_CREATE_COURSE_FOLDER_WEBHOOK;

    if (!webhookUrl) {
      console.warn('⚠️  N8N_CREATE_COURSE_FOLDER_WEBHOOK no está configurada. Saltando creación de carpeta.');
      return { success: false, message: 'Webhook no configurado' };
    }

    console.log(`📁 Creando carpeta de materia: ${course_id} (en ${career_id}/${faculty_id}/${university_id})`);

    const response = await axios.post(
      webhookUrl,
      { course_id, career_id, faculty_id, university_id },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );

    console.log(`✅ Carpeta de materia creada: ${course_id}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error al crear carpeta de materia "${course_id}":`, error.message);

    return {
      success: false,
      message: error.response?.data?.message || error.message,
    };
  }
};

/**
 * Crear carpeta de Comisión en Google Drive
 * Además crea subcarpetas "Entregas" y "Rubricas"
 * @param {String} commission_id - ID de la comisión
 * @param {String} course_id - ID del curso padre
 * @param {String} career_id - ID de la carrera
 * @param {String} faculty_id - ID de la facultad
 * @param {String} university_id - ID de la universidad
 * @returns {Promise<Object>} Respuesta del webhook (incluye entregas_folder_id y rubricas_folder_id)
 */
export const createCommissionFolder = async (commission_id, course_id, career_id, faculty_id, university_id) => {
  try {
    const webhookUrl = process.env.N8N_CREATE_COMMISSION_FOLDER_WEBHOOK;

    if (!webhookUrl) {
      console.warn('⚠️  N8N_CREATE_COMMISSION_FOLDER_WEBHOOK no está configurada. Saltando creación de carpeta.');
      return { success: false, message: 'Webhook no configurado' };
    }

    console.log(`📁 Creando carpeta de comisión: ${commission_id} (en ${course_id}/${career_id}/${faculty_id}/${university_id})`);

    const response = await axios.post(
      webhookUrl,
      { commission_id, course_id, career_id, faculty_id, university_id },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 45000, // 45 segundos (crea 3 carpetas: comisión + Entregas + Rubricas)
      }
    );

    console.log(`✅ Carpeta de comisión creada: ${commission_id} (con subcarpetas Entregas y Rubricas)`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error al crear carpeta de comisión "${commission_id}":`, error.message);

    return {
      success: false,
      message: error.response?.data?.message || error.message,
    };
  }
};

/**
 * Crear carpeta de Submission/Entrega en Google Drive
 * Se llama cuando se crea una rúbrica para preparar la carpeta de entregas
 * @param {String} submit_id - ID del submission (normalmente el rubric_id)
 * @param {String} commission_id - ID de la comisión
 * @param {String} course_id - ID del curso
 * @param {String} career_id - ID de la carrera
 * @param {String} faculty_id - ID de la facultad
 * @param {String} university_id - ID de la universidad
 * @returns {Promise<Object>} Respuesta del webhook
 */
export const createSubmissionFolder = async (submit_id, commission_id, course_id, career_id, faculty_id, university_id) => {
  try {
    const webhookUrl = process.env.N8N_CREATE_SUBMISSION_FOLDER_WEBHOOK;

    if (!webhookUrl) {
      console.warn('⚠️  N8N_CREATE_SUBMISSION_FOLDER_WEBHOOK no está configurada. Saltando creación de carpeta.');
      return { success: false, message: 'Webhook no configurado' };
    }

    console.log(`📁 Creando carpeta de submission: ${submit_id} (en ${commission_id}/${course_id}/${career_id}/${faculty_id}/${university_id})`);

    const response = await axios.post(
      webhookUrl,
      { submit_id, commission_id, course_id, career_id, faculty_id, university_id },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000, // 30 segundos
      }
    );

    console.log(`✅ Carpeta de submission creada: ${submit_id}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error al crear carpeta de submission "${submit_id}":`, error.message);

    return {
      success: false,
      message: error.response?.data?.message || error.message,
    };
  }
};

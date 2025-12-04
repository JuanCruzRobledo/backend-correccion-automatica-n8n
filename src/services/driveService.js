/**
 * Servicio para interactuar con webhooks de n8n para Google Drive
 * Este servicio maneja la creación automática de carpetas en Drive
 * cuando se crean nuevas entidades en el sistema
 */
import axios from 'axios';
import fs from 'fs';

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

/**
 * Crear carpeta de alumno en Google Drive
 * @param {String} studentName - Nombre del alumno (ej: "juan-perez")
 * @param {String} rubricDriveFolderId - ID de la carpeta de rúbrica en Drive
 * @returns {Promise<Object>} { success, folder_id, folder_name }
 */
export const createStudentFolder = async (studentName, rubricDriveFolderId) => {
  try {
    const webhookUrl = process.env.N8N_CREATE_STUDENT_FOLDER_WEBHOOK;

    if (!webhookUrl) {
      console.warn('⚠️ N8N_CREATE_STUDENT_FOLDER_WEBHOOK no configurado, usando método alternativo');
      // Si no hay webhook, intentar crear carpeta directamente con el webhook de upload
      return { success: false, message: 'Webhook no configurado' };
    }

    console.log(`📁 Creando carpeta de alumno: ${studentName} en ${rubricDriveFolderId}`);

    const payload = {
      folderName: `alumno-${studentName}`,
      parentFolderId: rubricDriveFolderId,
    };

    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    if (!response.data || !response.data.success) {
      throw new Error('No se pudo crear la carpeta del alumno');
    }

    console.log(`✅ Carpeta de alumno creada: ${response.data.folder_id}`);

    return {
      success: true,
      folder_id: response.data.folder_id,
      folder_name: response.data.folder_name,
    };
  } catch (error) {
    console.error(`❌ Error al crear carpeta de alumno "${studentName}":`, error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message,
    };
  }
};

/**
 * Subir archivo a Google Drive (para entregas de alumnos)
 * Usa webhook de n8n que recibe el archivo como texto plano en JSON
 * @param {String} filePath - Ruta del archivo temporal en el servidor
 * @param {String} fileName - Nombre con el que se guardará en Drive (siempre "entrega.txt")
 * @param {String} folderId - ID de la carpeta destino (carpeta del alumno)
 * @returns {Promise<Object>} { success, drive_file_id, drive_file_url }
 */
export const uploadFileToDrive = async (filePath, fileName, folderId) => {
  try {
    const webhookUrl = process.env.N8N_UPLOAD_FILE_TO_DRIVE_WEBHOOK;

    if (!webhookUrl) {
      throw new Error('N8N_UPLOAD_FILE_TO_DRIVE_WEBHOOK no está configurado en .env');
    }

    console.log(`📤 Subiendo archivo a Drive: ${fileName}`);
    console.log(`📁 Carpeta destino (folderId): ${folderId}`);

    // Leer el contenido del archivo como texto (es un .txt)
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');

    const payload = {
      fileName,
      folderId: folderId,
      fileContent, // Contenido del archivo como string
    };

    console.log(`📦 Payload a enviar:`, {
      fileName: payload.fileName,
      folderId: payload.folderId,
      fileContentLength: payload.fileContent.length,
    });

    // Enviar al webhook de n8n como JSON
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 segundos para archivos grandes
    });

    console.log(`✅ Archivo subido a Drive: ${fileName}`);

    // Validar respuesta
    if (!response.data || !response.data.success) {
      throw new Error('Respuesta inválida del webhook de n8n');
    }

    return {
      success: true,
      drive_file_id: response.data.drive_file_id,
      drive_file_url: response.data.drive_file_url,
    };
  } catch (error) {
    console.error(`❌ Error al subir archivo "${fileName}" a Drive:`, error.message);

    throw new Error(
      `Error al subir archivo a Google Drive: ${error.response?.data?.message || error.message}`
    );
  }
};

/**
 * Controlador de Rúbricas
 */
import Rubric, { RUBRIC_TYPES } from '../models/Rubric.js';
import Commission from '../models/Commission.js';
import Course from '../models/Course.js';
import { generateRubricFromPDF } from '../services/n8nService.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Listar todas las rúbricas activas - GET /api/rubrics
 * @route GET /api/rubrics?commission_id=...&course_id=...&rubric_type=...&year=...&career_id=...&faculty_id=...&university_id=...
 * @access Public
 */
export const getRubrics = async (req, res) => {
  try {
    const { commission_id, course_id, rubric_type, year, career_id, faculty_id, university_id } = req.query;
    const userRole = req.user.role;

    const filters = {};
    if (rubric_type) filters.rubric_type = rubric_type;
    if (year) filters.year = parseInt(year);

    // Aplicar filtros según rol del usuario
    if (userRole === 'super-admin') {
      // Super-admin ve todas las rúbricas
      if (commission_id) filters.commission_id = commission_id;
      if (course_id) filters.course_id = course_id;
      if (career_id) filters.career_id = career_id;
      if (faculty_id) filters.faculty_id = faculty_id;
      if (university_id) filters.university_id = university_id;
    } else if (userRole === 'university-admin') {
      // University-admin solo ve rúbricas de su universidad
      filters.university_id = req.user.university_id;
      if (commission_id) filters.commission_id = commission_id;
      if (course_id) filters.course_id = course_id;
      if (career_id) filters.career_id = career_id;
      if (faculty_id) filters.faculty_id = faculty_id;
    } else if (userRole === 'faculty-admin') {
      // Faculty-admin solo ve rúbricas de su facultad
      filters.university_id = req.user.university_id;
      filters.faculty_id = req.user.faculty_id;
      if (commission_id) filters.commission_id = commission_id;
      if (course_id) filters.course_id = course_id;
      if (career_id) filters.career_id = career_id;
    } else if (userRole === 'professor-admin') {
      // Professor-admin solo ve rúbricas de SUS cursos
      filters.course_id = { $in: req.user.course_ids };
      if (course_id) {
        // Validar que el course_id solicitado esté en sus cursos
        if (!req.user.course_ids.includes(course_id)) {
          return res.status(403).json({
            success: false,
            message: 'No tiene permisos para ver rúbricas de este curso',
          });
        }
        filters.course_id = course_id;
      }
      if (commission_id) filters.commission_id = commission_id;
    } else if (userRole === 'professor') {
      // Professor solo ve rúbricas de sus comisiones
      // Necesitamos buscar primero las comisiones del profesor
      const commissions = await Commission.find({
        professors: req.user.userId,
        deleted: false
      }).select('commission_id');

      const commissionIds = commissions.map(c => c.commission_id);

      if (commissionIds.length === 0) {
        return res.status(200).json({
          success: true,
          count: 0,
          data: [],
        });
      }

      filters.commission_id = { $in: commissionIds };
      if (commission_id) {
        // Validar que tenga acceso a esa comisión
        if (!commissionIds.includes(commission_id)) {
          return res.status(403).json({
            success: false,
            message: 'No tiene permisos para ver rúbricas de esta comisión',
          });
        }
        filters.commission_id = commission_id;
      }
    } else if (userRole === 'user') {
      // User puede ver rúbricas (para corrección)
      filters.university_id = req.user.university_id;
      if (commission_id) filters.commission_id = commission_id;
      if (course_id) filters.course_id = course_id;
    } else {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para ver rúbricas',
      });
    }

    const rubrics = await Rubric.findActive(filters);

    res.status(200).json({
      success: true,
      count: rubrics.length,
      data: rubrics,
    });
  } catch (error) {
    console.error('Error al obtener rúbricas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener rúbricas',
      error: error.message,
    });
  }
};

/**
 * Obtener una rúbrica por ID - GET /api/rubrics/:id
 * @route GET /api/rubrics/:id
 * @access Public
 */
export const getRubricById = async (req, res) => {
  try {
    const { id } = req.params;

    const rubric = await Rubric.findById(id);

    if (!rubric) {
      return res.status(404).json({
        success: false,
        message: 'Rúbrica no encontrada',
      });
    }

    res.status(200).json({
      success: true,
      data: rubric,
    });
  } catch (error) {
    console.error('Error al obtener rúbrica:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener rúbrica',
      error: error.message,
    });
  }
};

/**
 * Crear rúbrica desde JSON - POST /api/rubrics
 * @route POST /api/rubrics
 * @access Private (solo admin)
 */
export const createRubric = async (req, res) => {
  try {
    const {
      name,
      commission_id,
      course_id,
      career_id,
      faculty_id,
      university_id,
      rubric_type,
      rubric_number,
      year,
      rubric_json,
    } = req.body;

    const userRole = req.user.role;

    // Validar datos requeridos
    if (
      !name ||
      !commission_id ||
      !course_id ||
      !career_id ||
      !faculty_id ||
      !university_id ||
      !rubric_type ||
      !rubric_number ||
      !year ||
      !rubric_json
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Faltan campos requeridos: name, commission_id, course_id, career_id, faculty_id, university_id, rubric_type, rubric_number, year, rubric_json',
      });
    }

    // Validar permisos según rol
    if (userRole === 'super-admin') {
      // Super-admin puede crear en cualquier comisión
    } else if (userRole === 'university-admin') {
      // University-admin solo puede crear en su universidad
      if (university_id !== req.user.university_id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puede crear rúbricas en su universidad',
        });
      }
    } else if (userRole === 'faculty-admin') {
      // Faculty-admin solo puede crear en su facultad
      if (university_id !== req.user.university_id || faculty_id !== req.user.faculty_id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puede crear rúbricas en su facultad',
        });
      }
    } else if (userRole === 'professor-admin') {
      // Professor-admin solo puede crear rúbricas de SUS cursos
      if (!req.user.course_ids.includes(course_id)) {
        return res.status(403).json({
          success: false,
          message: 'Solo puede crear rúbricas para sus cursos asignados',
        });
      }
    } else if (userRole === 'professor') {
      // Professor puede crear rúbricas de sus comisiones
      const commission = await Commission.findOne({
        commission_id,
        professors: req.user.userId,
        deleted: false
      });

      if (!commission) {
        return res.status(403).json({
          success: false,
          message: 'Solo puede crear rúbricas para sus comisiones asignadas',
        });
      }
    } else {
      // User no puede crear rúbricas
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para crear rúbricas',
      });
    }

    // Validar que rubric_type es válido
    if (!Object.values(RUBRIC_TYPES).includes(rubric_type)) {
      return res.status(400).json({
        success: false,
        message: `rubric_type debe ser uno de: ${Object.values(RUBRIC_TYPES).join(', ')}`,
      });
    }

    // Verificar que la comisión existe
    const commission = await Commission.findOne({ commission_id, deleted: false });
    if (!commission) {
      return res.status(400).json({
        success: false,
        message: 'La comisión especificada no existe',
      });
    }

    // Verificar que el curso existe
    const course = await Course.findOne({ course_id, deleted: false });
    if (!course) {
      return res.status(400).json({
        success: false,
        message: 'El curso especificado no existe',
      });
    }

    // Verificar si ya existe una rúbrica con ese tipo y número en esa comisión
    const existingRubric = await Rubric.findOne({
      commission_id,
      rubric_type,
      rubric_number,
      deleted: false,
    });

    if (existingRubric) {
      return res.status(409).json({
        success: false,
        message: `Ya existe una rúbrica de tipo ${rubric_type} con número ${rubric_number} en esta comisión`,
      });
    }

    // Generar ID único
    const rubric_id = Rubric.generateRubricId(commission_id, rubric_type, name, rubric_number);

    // Crear rúbrica
    const rubric = new Rubric({
      rubric_id,
      name,
      commission_id,
      course_id,
      career_id,
      faculty_id,
      university_id,
      rubric_type,
      rubric_number,
      year,
      rubric_json,
      source: 'json',
    });

    await rubric.save();

    // Crear carpeta de submission en Google Drive y guardar el folder_id
    // Usamos el rubric_id como submit_id para crear la carpeta
    const { createSubmissionFolder } = await import('../services/driveService.js');
    try {
      console.log(`📁 Intentando crear carpeta en Drive para rúbrica: ${rubric_id}`);
      const driveResponse = await createSubmissionFolder(rubric_id, commission_id, course_id, career_id, faculty_id, university_id);

      console.log(`📁 Respuesta de createSubmissionFolder:`, driveResponse);

      // Si la carpeta se creó exitosamente, guardar el folder_id
      if (driveResponse.success && driveResponse.folder_id) {
        rubric.drive_folder_id = driveResponse.folder_id;

        // Guardar IDs del spreadsheet (agregado en FASE 4)
        if (driveResponse.spreadsheet_id) {
          rubric.spreadsheet_file_id = driveResponse.spreadsheet_id;
          rubric.spreadsheet_file_url = driveResponse.spreadsheet_url;
          console.log(`✅ Spreadsheet creado: ${driveResponse.spreadsheet_id}`);
        } else {
          console.warn('⚠️ El workflow no devolvió spreadsheet_id (verifica FASE 1)');
        }

        await rubric.save();
        console.log(`✅ folder_id guardado en rúbrica: ${driveResponse.folder_id}`);
      } else {
        console.warn(`⚠️ No se pudo crear carpeta en Drive. Respuesta:`, driveResponse);
      }
    } catch (err) {
      console.error('⚠️ Error al crear carpeta de submission en Drive:', err);
      // No fallar la creación de la rúbrica si falla Drive
    }

    res.status(201).json({
      success: true,
      message: 'Rúbrica creada exitosamente',
      data: rubric,
    });
  } catch (error) {
    console.error('Error al crear rúbrica:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: messages,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una rúbrica con esa combinación de comisión, tipo y número',
        error: 'Clave duplicada',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al crear rúbrica',
      error: error.message,
    });
  }
};

/**
 * Crear rúbrica desde PDF - POST /api/rubrics/from-pdf
 * @route POST /api/rubrics/from-pdf
 * @access Private (solo admin)
 */
export const createRubricFromPDF = async (req, res) => {
  let pdfPath = null;

  try {
    // req.file es añadido por multer
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó archivo PDF',
      });
    }

    const {
      name,
      commission_id,
      course_id,
      career_id,
      faculty_id,
      university_id,
      rubric_type,
      rubric_number,
      year,
    } = req.body;

    // Validar datos requeridos
    if (
      !name ||
      !commission_id ||
      !course_id ||
      !career_id ||
      !faculty_id ||
      !university_id ||
      !rubric_type ||
      !rubric_number ||
      !year
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Faltan campos requeridos: name, commission_id, course_id, career_id, faculty_id, university_id, rubric_type, rubric_number, year',
      });
    }

    // Validar que rubric_type es válido
    if (!Object.values(RUBRIC_TYPES).includes(rubric_type)) {
      return res.status(400).json({
        success: false,
        message: `rubric_type debe ser uno de: ${Object.values(RUBRIC_TYPES).join(', ')}`,
      });
    }

    // Verificar que la comisión existe
    const commission = await Commission.findOne({ commission_id, deleted: false });
    if (!commission) {
      return res.status(400).json({
        success: false,
        message: 'La comisión especificada no existe',
      });
    }

    // Verificar que el curso existe
    const course = await Course.findOne({ course_id, deleted: false });
    if (!course) {
      return res.status(400).json({
        success: false,
        message: 'El curso especificado no existe',
      });
    }

    // Verificar si ya existe una rúbrica con ese tipo y número en esa comisión
    const existingRubric = await Rubric.findOne({
      commission_id,
      rubric_type,
      rubric_number,
      deleted: false,
    });

    if (existingRubric) {
      return res.status(409).json({
        success: false,
        message: `Ya existe una rúbrica de tipo ${rubric_type} con número ${rubric_number} en esta comisión`,
      });
    }

    pdfPath = req.file.path;

    // Obtener userId del usuario autenticado
    const userId = req.user?.id;

    // Llamar a n8n para generar rúbrica (con API key del usuario)
    console.log('📄 Generando rúbrica desde PDF con n8n...');
    const rubric_json = await generateRubricFromPDF(pdfPath, userId);

    // Generar ID único
    const rubric_id = Rubric.generateRubricId(commission_id, rubric_type, name, rubric_number);

    // Crear rúbrica
    const rubric = new Rubric({
      rubric_id,
      name,
      commission_id,
      course_id,
      career_id,
      faculty_id,
      university_id,
      rubric_type,
      rubric_number,
      year,
      rubric_json,
      source: 'pdf',
      original_file_url: req.file.filename, // Guardamos el nombre del archivo
    });

    await rubric.save();

    // Crear carpeta de submission en Google Drive y guardar el folder_id
    // Usamos el rubric_id como submit_id para crear la carpeta
    const { createSubmissionFolder } = await import('../services/driveService.js');
    try {
      console.log(`📁 Intentando crear carpeta en Drive para rúbrica: ${rubric_id}`);
      const driveResponse = await createSubmissionFolder(rubric_id, commission_id, course_id, career_id, faculty_id, university_id);

      console.log(`📁 Respuesta de createSubmissionFolder:`, driveResponse);

      // Si la carpeta se creó exitosamente, guardar el folder_id
      if (driveResponse.success && driveResponse.folder_id) {
        rubric.drive_folder_id = driveResponse.folder_id;

        // Guardar IDs del spreadsheet (agregado en FASE 4)
        if (driveResponse.spreadsheet_id) {
          rubric.spreadsheet_file_id = driveResponse.spreadsheet_id;
          rubric.spreadsheet_file_url = driveResponse.spreadsheet_url;
          console.log(`✅ Spreadsheet creado: ${driveResponse.spreadsheet_id}`);
        } else {
          console.warn('⚠️ El workflow no devolvió spreadsheet_id (verifica FASE 1)');
        }

        await rubric.save();
        console.log(`✅ folder_id guardado en rúbrica: ${driveResponse.folder_id}`);
      } else {
        console.warn(`⚠️ No se pudo crear carpeta en Drive. Respuesta:`, driveResponse);
      }
    } catch (err) {
      console.error('⚠️ Error al crear carpeta de submission en Drive:', err);
      // No fallar la creación de la rúbrica si falla Drive
    }

    res.status(201).json({
      success: true,
      message: 'Rúbrica creada exitosamente desde PDF',
      data: rubric,
    });
  } catch (error) {
    console.error('Error al crear rúbrica desde PDF:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: messages,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una rúbrica con esa combinación de comisión, tipo y número',
        error: 'Clave duplicada',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al crear rúbrica desde PDF',
      error: error.message,
    });
  } finally {
    // Limpiar archivo temporal
    if (pdfPath) {
      try {
        await fs.unlink(pdfPath);
        console.log('✅ Archivo temporal eliminado:', pdfPath);
      } catch (err) {
        console.error('⚠️ Error al eliminar archivo temporal:', err);
      }
    }
  }
};

/**
 * Actualizar rúbrica - PUT /api/rubrics/:id
 * @route PUT /api/rubrics/:id
 * @access Private (solo admin)
 * @note No se permite cambiar commission_id, rubric_type ni rubric_number por integridad referencial
 */
export const updateRubric = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, rubric_json, course_id, career_id, faculty_id, university_id, year } = req.body;

    // Validar datos
    if (!name && !rubric_json && !course_id && !career_id && !faculty_id && !university_id && !year) {
      return res.status(400).json({
        success: false,
        message: 'Al menos un campo es requerido para actualizar',
      });
    }

    // Buscar rúbrica
    const rubric = await Rubric.findById(id);

    if (!rubric) {
      return res.status(404).json({
        success: false,
        message: 'Rúbrica no encontrada',
      });
    }

    // Actualizar campos
    if (name) rubric.name = name;
    if (rubric_json) rubric.rubric_json = rubric_json;
    if (course_id) rubric.course_id = course_id;
    if (career_id) rubric.career_id = career_id;
    if (faculty_id) rubric.faculty_id = faculty_id;
    if (university_id) rubric.university_id = university_id;
    if (year) rubric.year = year;

    await rubric.save();

    res.status(200).json({
      success: true,
      message: 'Rúbrica actualizada exitosamente',
      data: rubric,
    });
  } catch (error) {
    console.error('Error al actualizar rúbrica:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: messages,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al actualizar rúbrica',
      error: error.message,
    });
  }
};

const parseSpreadsheetId = (value) => {
  if (!value) return null;
  const trimmed = value.trim();
  const urlMatch = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  return trimmed.split('?')[0];
};

/**
 * Actualizar ID/URL de spreadsheet - PUT /api/rubrics/:rubricId/spreadsheet
 * @route PUT /api/rubrics/:rubricId/spreadsheet
 * @access Private (admin, university-admin, professor)
 */
export const updateRubricSpreadsheet = async (req, res) => {
  try {
    const { rubricId } = req.params;
    const { spreadsheet_file_id, spreadsheet_file_url } = req.body;

    if (!spreadsheet_file_id) {
      return res.status(400).json({
        success: false,
        message: 'spreadsheet_file_id es requerido',
      });
    }

    const parsedId = parseSpreadsheetId(spreadsheet_file_id);
    if (!parsedId || !/^[a-zA-Z0-9-_]{10,}$/.test(parsedId)) {
      return res.status(400).json({
        success: false,
        message: 'spreadsheet_file_id no tiene un formato válido',
      });
    }

    const rubric = await Rubric.findOne({ rubric_id: rubricId, deleted: false });
    if (!rubric) {
      return res.status(404).json({
        success: false,
        message: 'Rúbrica no encontrada',
      });
    }

    rubric.spreadsheet_file_id = parsedId;
    rubric.spreadsheet_file_url = spreadsheet_file_url || rubric.spreadsheet_file_url || spreadsheet_file_id;
    await rubric.save();

    return res.status(200).json({
      success: true,
      message: 'Spreadsheet configurado correctamente',
      data: {
        rubric_id: rubric.rubric_id,
        spreadsheet_file_id: rubric.spreadsheet_file_id,
        spreadsheet_file_url: rubric.spreadsheet_file_url,
      },
    });
  } catch (error) {
    console.error('Error al actualizar spreadsheet de rúbrica:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar spreadsheet',
      error: error.message,
    });
  }
};

/**
 * Eliminar rúbrica (baja lógica) - DELETE /api/rubrics/:id
 * @route DELETE /api/rubrics/:id
 * @access Private (solo admin)
 */
export const deleteRubric = async (req, res) => {
  try {
    const { id } = req.params;

    const rubric = await Rubric.findById(id);

    if (!rubric) {
      return res.status(404).json({
        success: false,
        message: 'Rúbrica no encontrada',
      });
    }

    await rubric.softDelete();

    res.status(200).json({
      success: true,
      message: 'Rúbrica eliminada exitosamente',
    });
  } catch (error) {
    console.error('Error al eliminar rúbrica:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar rúbrica',
      error: error.message,
    });
  }
};

/**
 * Reparar rúbricas sin drive_folder_id - POST /api/rubrics/:id/fix-drive-folder
 * Crea la carpeta en Drive y actualiza el drive_folder_id
 * @access Professor, Admin, Super-admin
 */
export const fixRubricDriveFolder = async (req, res) => {
  try {
    const { id } = req.params;

    const rubric = await Rubric.findById(id);

    if (!rubric) {
      return res.status(404).json({
        success: false,
        message: 'Rúbrica no encontrada',
      });
    }

    // Verificar si ya tiene drive_folder_id
    if (rubric.drive_folder_id && rubric.drive_folder_id !== 'null') {
      return res.status(400).json({
        success: false,
        message: 'La rúbrica ya tiene drive_folder_id configurado',
        data: { drive_folder_id: rubric.drive_folder_id },
      });
    }

    // Crear carpeta de submission en Google Drive
    const { createSubmissionFolder } = await import('../services/driveService.js');

    console.log(`🔧 Reparando drive_folder_id para rúbrica: ${rubric.rubric_id}`);

    const driveResponse = await createSubmissionFolder(
      rubric.rubric_id,
      rubric.commission_id,
      rubric.course_id,
      rubric.career_id,
      rubric.faculty_id,
      rubric.university_id
    );

    console.log(`📁 Respuesta de createSubmissionFolder:`, driveResponse);

    if (!driveResponse.success || !driveResponse.folder_id) {
      return res.status(500).json({
        success: false,
        message: 'No se pudo crear la carpeta en Drive',
        error: driveResponse.message || 'Error desconocido',
      });
    }

    // Actualizar rúbrica con el folder_id
    rubric.drive_folder_id = driveResponse.folder_id;
    await rubric.save();

    console.log(`✅ drive_folder_id reparado: ${driveResponse.folder_id}`);

    res.status(200).json({
      success: true,
      message: 'Carpeta de Drive creada y rúbrica actualizada exitosamente',
      data: {
        rubric_id: rubric.rubric_id,
        name: rubric.name,
        drive_folder_id: rubric.drive_folder_id,
      },
    });
  } catch (error) {
    console.error('Error al reparar drive_folder_id:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reparar drive_folder_id',
      error: error.message,
    });
  }
};

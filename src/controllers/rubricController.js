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

    const filters = {};
    if (commission_id) filters.commission_id = commission_id;
    if (course_id) filters.course_id = course_id;
    if (rubric_type) filters.rubric_type = rubric_type;
    if (year) filters.year = parseInt(year);
    if (career_id) filters.career_id = career_id;
    if (faculty_id) filters.faculty_id = faculty_id;
    if (university_id) filters.university_id = university_id;

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
    const rubric_id = Rubric.generateRubricId(commission_id, rubric_type, rubric_number);

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
    const rubric_id = Rubric.generateRubricId(commission_id, rubric_type, rubric_number);

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

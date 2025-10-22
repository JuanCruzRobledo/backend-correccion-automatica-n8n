/**
 * Controlador de Rúbricas
 */
import Rubric from '../models/Rubric.js';
import University from '../models/University.js';
import Course from '../models/Course.js';
import { generateRubricFromPDF } from '../services/n8nService.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Listar todas las rúbricas activas - GET /api/rubrics
 * @route GET /api/rubrics?university_id=xxx&course_id=xxx
 * @access Public
 */
export const getRubrics = async (req, res) => {
  try {
    const { university_id, course_id } = req.query;

    const filters = {};
    if (university_id) filters.university_id = university_id;
    if (course_id) filters.course_id = course_id;

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
    const { name, university_id, course_id, rubric_json } = req.body;

    // Validar datos
    if (!name || !university_id || !course_id || !rubric_json) {
      return res.status(400).json({
        success: false,
        message: 'name, university_id, course_id y rubric_json son requeridos',
      });
    }

    // Verificar que la universidad existe
    const university = await University.findOne({ university_id });
    if (!university) {
      return res.status(400).json({
        success: false,
        message: 'La universidad especificada no existe',
      });
    }

    // Verificar que el curso existe
    const course = await Course.findOne({ course_id });
    if (!course) {
      return res.status(400).json({
        success: false,
        message: 'El curso especificado no existe',
      });
    }

    // Generar ID único
    const rubric_id = Rubric.generateRubricId(university_id, course_id);

    // Crear rúbrica
    const rubric = new Rubric({
      rubric_id,
      name,
      university_id,
      course_id,
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

    const { name, university_id, course_id } = req.body;

    // Validar datos
    if (!name || !university_id || !course_id) {
      return res.status(400).json({
        success: false,
        message: 'name, university_id y course_id son requeridos',
      });
    }

    // Verificar que la universidad existe
    const university = await University.findOne({ university_id });
    if (!university) {
      return res.status(400).json({
        success: false,
        message: 'La universidad especificada no existe',
      });
    }

    // Verificar que el curso existe
    const course = await Course.findOne({ course_id });
    if (!course) {
      return res.status(400).json({
        success: false,
        message: 'El curso especificado no existe',
      });
    }

    pdfPath = req.file.path;

    // Llamar a n8n para generar rúbrica
    console.log('📄 Generando rúbrica desde PDF con n8n...');
    const rubric_json = await generateRubricFromPDF(pdfPath);

    // Generar ID único
    const rubric_id = Rubric.generateRubricId(university_id, course_id);

    // Crear rúbrica
    const rubric = new Rubric({
      rubric_id,
      name,
      university_id,
      course_id,
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
 */
export const updateRubric = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, rubric_json } = req.body;

    // Validar datos
    if (!name && !rubric_json) {
      return res.status(400).json({
        success: false,
        message: 'Al menos name o rubric_json es requerido',
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

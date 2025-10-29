/**
 * Controlador de Carreras
 * Maneja todas las operaciones CRUD de carreras
 */
import Career from '../models/Career.js';
import * as driveService from '../services/driveService.js';

/**
 * Obtener todas las carreras (con filtros opcionales)
 * @route GET /api/careers?faculty_id=...&university_id=...
 */
export const getCareers = async (req, res) => {
  try {
    const { faculty_id, university_id } = req.query;

    let query = { deleted: false };
    if (faculty_id) {
      query.faculty_id = faculty_id;
    }
    if (university_id) {
      query.university_id = university_id;
    }

    const careers = await Career.find(query).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: careers.length,
      data: careers,
    });
  } catch (error) {
    console.error('Error al obtener carreras:', error);
    res.status(500).json({
      message: 'Error al obtener las carreras',
      error: error.message,
    });
  }
};

/**
 * Obtener una carrera por ID
 * @route GET /api/careers/:id
 */
export const getCareerById = async (req, res) => {
  try {
    const { id } = req.params;

    const career = await Career.findById(id);

    if (!career) {
      return res.status(404).json({
        message: 'Carrera no encontrada',
      });
    }

    if (career.deleted) {
      return res.status(404).json({
        message: 'Carrera no disponible (eliminada)',
      });
    }

    res.status(200).json({
      success: true,
      data: career,
    });
  } catch (error) {
    console.error('Error al obtener carrera:', error);
    res.status(500).json({
      message: 'Error al obtener la carrera',
      error: error.message,
    });
  }
};

/**
 * Crear una nueva carrera
 * @route POST /api/careers
 * @access Admin only
 */
export const createCareer = async (req, res) => {
  try {
    const { career_id, name, faculty_id, university_id } = req.body;

    // Validar campos requeridos
    if (!career_id || !name || !faculty_id || !university_id) {
      return res.status(400).json({
        message: 'Faltan campos requeridos: career_id, name, faculty_id, university_id',
      });
    }

    // Verificar si ya existe una carrera con ese ID en esa facultad
    const existingCareer = await Career.findOne({
      faculty_id,
      career_id,
      deleted: false,
    });

    if (existingCareer) {
      return res.status(409).json({
        message: 'Ya existe una carrera con ese ID en esta facultad',
      });
    }

    // Crear la carrera
    const career = await Career.create({
      career_id,
      name,
      faculty_id,
      university_id,
    });

    // Crear carpeta en Google Drive (no bloqueante)
    driveService.createCareerFolder(career_id, faculty_id, university_id).catch((err) => {
      console.error('Error al crear carpeta de carrera en Drive:', err);
    });

    res.status(201).json({
      success: true,
      message: 'Carrera creada exitosamente',
      data: career,
    });
  } catch (error) {
    console.error('Error al crear carrera:', error);

    // Manejar error de clave duplicada
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Ya existe una carrera con ese ID',
        error: 'Clave duplicada',
      });
    }

    res.status(500).json({
      message: 'Error al crear la carrera',
      error: error.message,
    });
  }
};

/**
 * Actualizar una carrera
 * @route PUT /api/careers/:id
 * @access Admin only
 */
export const updateCareer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, faculty_id, university_id } = req.body;

    // Buscar la carrera
    const career = await Career.findById(id);

    if (!career) {
      return res.status(404).json({
        message: 'Carrera no encontrada',
      });
    }

    if (career.deleted) {
      return res.status(400).json({
        message: 'No se puede actualizar una carrera eliminada. Restáurela primero.',
      });
    }

    // Actualizar campos (no se puede cambiar career_id por integridad)
    if (name) career.name = name;
    if (faculty_id) career.faculty_id = faculty_id;
    if (university_id) career.university_id = university_id;

    await career.save();

    res.status(200).json({
      success: true,
      message: 'Carrera actualizada exitosamente',
      data: career,
    });
  } catch (error) {
    console.error('Error al actualizar carrera:', error);
    res.status(500).json({
      message: 'Error al actualizar la carrera',
      error: error.message,
    });
  }
};

/**
 * Eliminar una carrera (soft delete)
 * @route DELETE /api/careers/:id
 * @access Admin only
 */
export const deleteCareer = async (req, res) => {
  try {
    const { id } = req.params;

    const career = await Career.findById(id);

    if (!career) {
      return res.status(404).json({
        message: 'Carrera no encontrada',
      });
    }

    if (career.deleted) {
      return res.status(400).json({
        message: 'La carrera ya está eliminada',
      });
    }

    await career.softDelete();

    res.status(200).json({
      success: true,
      message: 'Carrera eliminada exitosamente',
      data: career,
    });
  } catch (error) {
    console.error('Error al eliminar carrera:', error);
    res.status(500).json({
      message: 'Error al eliminar la carrera',
      error: error.message,
    });
  }
};

/**
 * Restaurar una carrera eliminada
 * @route PUT /api/careers/:id/restore
 * @access Admin only
 */
export const restoreCareer = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar incluyendo eliminadas
    const career = await Career.findOne({ _id: id, deleted: true });

    if (!career) {
      return res.status(404).json({
        message: 'Carrera eliminada no encontrada',
      });
    }

    await career.restore();

    res.status(200).json({
      success: true,
      message: 'Carrera restaurada exitosamente',
      data: career,
    });
  } catch (error) {
    console.error('Error al restaurar carrera:', error);
    res.status(500).json({
      message: 'Error al restaurar la carrera',
      error: error.message,
    });
  }
};

/**
 * Obtener todas las carreras incluyendo eliminadas
 * @route GET /api/careers/all
 * @access Admin only
 */
export const getAllCareers = async (req, res) => {
  try {
    const { faculty_id, university_id } = req.query;

    const query = {};
    if (faculty_id) {
      query.faculty_id = faculty_id;
    }
    if (university_id) {
      query.university_id = university_id;
    }

    const careers = await Career.find(query).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: careers.length,
      data: careers,
    });
  } catch (error) {
    console.error('Error al obtener todas las carreras:', error);
    res.status(500).json({
      message: 'Error al obtener todas las carreras',
      error: error.message,
    });
  }
};

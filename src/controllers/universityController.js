/**
 * Controlador de Universidades
 */
import University from '../models/University.js';
import * as driveService from '../services/driveService.js';

/**
 * Listar todas las universidades activas - GET /api/universities
 * @route GET /api/universities
 * @access Public
 */
export const getUniversities = async (req, res) => {
  try {
    const universities = await University.findActive();

    res.status(200).json({
      success: true,
      count: universities.length,
      data: universities,
    });
  } catch (error) {
    console.error('Error al obtener universidades:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener universidades',
      error: error.message,
    });
  }
};

/**
 * Obtener una universidad por ID - GET /api/universities/:id
 * @route GET /api/universities/:id
 * @access Public
 */
export const getUniversityById = async (req, res) => {
  try {
    const { id } = req.params;

    const university = await University.findById(id);

    if (!university) {
      return res.status(404).json({
        success: false,
        message: 'Universidad no encontrada',
      });
    }

    res.status(200).json({
      success: true,
      data: university,
    });
  } catch (error) {
    console.error('Error al obtener universidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener universidad',
      error: error.message,
    });
  }
};

/**
 * Crear universidad - POST /api/universities
 * @route POST /api/universities
 * @access Private (solo admin)
 */
export const createUniversity = async (req, res) => {
  try {
    const { university_id, name } = req.body;

    // Validar datos
    if (!university_id || !name) {
      return res.status(400).json({
        success: false,
        message: 'university_id y name son requeridos',
      });
    }

    // Verificar si ya existe (incluyendo eliminados)
    const existingUniversity = await University.findOne({
      university_id,
      deleted: { $in: [true, false] },
    });

    if (existingUniversity) {
      if (existingUniversity.deleted) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una universidad con ese ID (eliminada). Contacte al administrador para restaurarla.',
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Ya existe una universidad con ese ID',
      });
    }

    // Crear universidad
    const university = new University({
      university_id,
      name,
    });

    await university.save();

    // Crear carpeta en Google Drive (no bloqueante)
    driveService.createUniversityFolder(university_id).catch((err) => {
      console.error('Error al crear carpeta de universidad en Drive:', err);
    });

    res.status(201).json({
      success: true,
      message: 'Universidad creada exitosamente',
      data: university,
    });
  } catch (error) {
    console.error('Error al crear universidad:', error);

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
      message: 'Error al crear universidad',
      error: error.message,
    });
  }
};

/**
 * Actualizar universidad - PUT /api/universities/:id
 * @route PUT /api/universities/:id
 * @access Private (solo admin)
 */
export const updateUniversity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Validar datos
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'name es requerido',
      });
    }

    // Buscar y actualizar
    const university = await University.findById(id);

    if (!university) {
      return res.status(404).json({
        success: false,
        message: 'Universidad no encontrada',
      });
    }

    university.name = name;
    await university.save();

    res.status(200).json({
      success: true,
      message: 'Universidad actualizada exitosamente',
      data: university,
    });
  } catch (error) {
    console.error('Error al actualizar universidad:', error);

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
      message: 'Error al actualizar universidad',
      error: error.message,
    });
  }
};

/**
 * Eliminar universidad (baja lógica) - DELETE /api/universities/:id
 * @route DELETE /api/universities/:id
 * @access Private (solo admin)
 */
export const deleteUniversity = async (req, res) => {
  try {
    const { id } = req.params;

    const university = await University.findById(id);

    if (!university) {
      return res.status(404).json({
        success: false,
        message: 'Universidad no encontrada',
      });
    }

    await university.softDelete();

    res.status(200).json({
      success: true,
      message: 'Universidad eliminada exitosamente',
    });
  } catch (error) {
    console.error('Error al eliminar universidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar universidad',
      error: error.message,
    });
  }
};

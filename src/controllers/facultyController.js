/**
 * Controlador de Facultades
 * Maneja todas las operaciones CRUD de facultades
 */
import Faculty from '../models/Faculty.js';
import * as driveService from '../services/driveService.js';

/**
 * Obtener todas las facultades (con filtros opcionales)
 * @route GET /api/faculties?university_id=...
 */
export const getFaculties = async (req, res) => {
  try {
    const { university_id } = req.query;
    const userRole = req.user.role;

    let faculties;

    // Filtrar según rol del usuario
    if (userRole === 'super-admin') {
      // Super-admin ve todas las facultades
      if (university_id) {
        faculties = await Faculty.findActive(university_id);
      } else {
        faculties = await Faculty.findActive();
      }
    } else if (userRole === 'university-admin') {
      // University-admin solo ve facultades de su universidad
      faculties = await Faculty.findActive(req.user.university_id);
    } else if (userRole === 'faculty-admin') {
      // Faculty-admin solo ve SU facultad
      faculties = await Faculty.find({
        faculty_id: req.user.faculty_id,
        deleted: false
      });
    } else if (userRole === 'professor-admin' || userRole === 'professor') {
      // Professor-admin y professor ven facultades según sus cursos/comisiones
      // Por ahora permiten ver de su universidad
      faculties = await Faculty.findActive(req.user.university_id);
    } else {
      // User no tiene acceso
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para ver facultades',
      });
    }

    res.status(200).json({
      success: true,
      count: faculties.length,
      data: faculties,
    });
  } catch (error) {
    console.error('Error al obtener facultades:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las facultades',
      error: error.message,
    });
  }
};

/**
 * Obtener una facultad por ID
 * @route GET /api/faculties/:id
 */
export const getFacultyById = async (req, res) => {
  try {
    const { id } = req.params;

    const faculty = await Faculty.findById(id);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Facultad no encontrada',
      });
    }

    if (faculty.deleted) {
      return res.status(404).json({
        success: false,
        message: 'Facultad no disponible (eliminada)',
      });
    }

    res.status(200).json({
      success: true,
      data: faculty,
    });
  } catch (error) {
    console.error('Error al obtener facultad:', error);
    res.status(500).json({
      message: 'Error al obtener la facultad',
      error: error.message,
    });
  }
};

/**
 * Crear una nueva facultad
 * @route POST /api/faculties
 * @access Admin only
 */
export const createFaculty = async (req, res) => {
  try {
    const { faculty_id, name, university_id } = req.body;
    const userRole = req.user.role;

    // Validar campos requeridos
    if (!faculty_id || !name || !university_id) {
      return res.status(400).json({
        message: 'Faltan campos requeridos: faculty_id, name, university_id',
      });
    }

    // Validar permisos según rol
    if (userRole === 'super-admin') {
      // Super-admin puede crear en cualquier universidad
    } else if (userRole === 'university-admin') {
      // University-admin solo puede crear en su universidad
      if (university_id !== req.user.university_id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puede crear facultades en su universidad',
        });
      }
    } else {
      // faculty-admin, professor-admin, professor, user NO pueden crear facultades
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para crear facultades',
      });
    }

    // Verificar si ya existe una facultad con ese ID en esa universidad
    const existingFaculty = await Faculty.findOne({
      university_id,
      faculty_id,
      deleted: false,
    });

    if (existingFaculty) {
      return res.status(409).json({
        message: 'Ya existe una facultad con ese ID en esta universidad',
      });
    }

    // Crear la facultad
    const faculty = await Faculty.create({
      faculty_id,
      name,
      university_id,
    });

    // Crear carpeta en Google Drive (no bloqueante)
    driveService.createFacultyFolder(faculty_id, university_id).catch((err) => {
      console.error('Error al crear carpeta de facultad en Drive:', err);
    });

    res.status(201).json({
      success: true,
      message: 'Facultad creada exitosamente',
      data: faculty,
    });
  } catch (error) {
    console.error('Error al crear facultad:', error);

    // Manejar error de clave duplicada
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Ya existe una facultad con ese ID',
        error: 'Clave duplicada',
      });
    }

    res.status(500).json({
      message: 'Error al crear la facultad',
      error: error.message,
    });
  }
};

/**
 * Actualizar una facultad
 * @route PUT /api/faculties/:id
 * @access Admin only
 */
export const updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, university_id } = req.body;

    // Buscar la facultad
    const faculty = await Faculty.findById(id);

    if (!faculty) {
      return res.status(404).json({
        message: 'Facultad no encontrada',
      });
    }

    if (faculty.deleted) {
      return res.status(400).json({
        message: 'No se puede actualizar una facultad eliminada. Restáurela primero.',
      });
    }

    // Actualizar campos (no se puede cambiar faculty_id por integridad)
    if (name) faculty.name = name;
    if (university_id) faculty.university_id = university_id;

    await faculty.save();

    res.status(200).json({
      success: true,
      message: 'Facultad actualizada exitosamente',
      data: faculty,
    });
  } catch (error) {
    console.error('Error al actualizar facultad:', error);
    res.status(500).json({
      message: 'Error al actualizar la facultad',
      error: error.message,
    });
  }
};

/**
 * Eliminar una facultad (soft delete)
 * @route DELETE /api/faculties/:id
 * @access Admin only
 */
export const deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;

    const faculty = await Faculty.findById(id);

    if (!faculty) {
      return res.status(404).json({
        message: 'Facultad no encontrada',
      });
    }

    if (faculty.deleted) {
      return res.status(400).json({
        message: 'La facultad ya está eliminada',
      });
    }

    await faculty.softDelete();

    res.status(200).json({
      success: true,
      message: 'Facultad eliminada exitosamente',
      data: faculty,
    });
  } catch (error) {
    console.error('Error al eliminar facultad:', error);
    res.status(500).json({
      message: 'Error al eliminar la facultad',
      error: error.message,
    });
  }
};

/**
 * Restaurar una facultad eliminada
 * @route PUT /api/faculties/:id/restore
 * @access Admin only
 */
export const restoreFaculty = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar incluyendo eliminadas
    const faculty = await Faculty.findOne({ _id: id, deleted: true });

    if (!faculty) {
      return res.status(404).json({
        message: 'Facultad eliminada no encontrada',
      });
    }

    await faculty.restore();

    res.status(200).json({
      success: true,
      message: 'Facultad restaurada exitosamente',
      data: faculty,
    });
  } catch (error) {
    console.error('Error al restaurar facultad:', error);
    res.status(500).json({
      message: 'Error al restaurar la facultad',
      error: error.message,
    });
  }
};

/**
 * Obtener todas las facultades incluyendo eliminadas
 * @route GET /api/faculties/all
 * @access Admin only
 */
export const getAllFaculties = async (req, res) => {
  try {
    const { university_id } = req.query;

    const query = {};
    if (university_id) {
      query.university_id = university_id;
    }

    const faculties = await Faculty.find(query).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: faculties.length,
      data: faculties,
    });
  } catch (error) {
    console.error('Error al obtener todas las facultades:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener todas las facultades',
      error: error.message,
    });
  }
};

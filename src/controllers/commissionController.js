/**
 * Controlador de Comisiones
 * Maneja todas las operaciones CRUD de comisiones
 */
import Commission from '../models/Commission.js';
import User from '../models/User.js';
import * as driveService from '../services/driveService.js';

/**
 * Obtener todas las comisiones (con filtros opcionales)
 * @route GET /api/commissions?course_id=...&year=...&career_id=...
 * IMPORTANTE: Si se proporciona course_id, es altamente recomendable incluir career_id
 * para evitar duplicados entre carreras que comparten el mismo curso.
 */
export const getCommissions = async (req, res) => {
  try {
    const { course_id, year, career_id, faculty_id, university_id } = req.query;
    const userRole = req.user.role;

    const filters = {};
    if (year) filters.year = parseInt(year);

    // Aplicar filtros según rol del usuario
    if (userRole === 'super-admin') {
      // Super-admin ve todas las comisiones
      if (course_id) filters.course_id = course_id;
      if (career_id) filters.career_id = career_id;
      if (faculty_id) filters.faculty_id = faculty_id;
      if (university_id) filters.university_id = university_id;
    } else if (userRole === 'university-admin') {
      // University-admin solo ve comisiones de su universidad
      filters.university_id = req.user.university_id;
      if (course_id) filters.course_id = course_id;
      if (career_id) filters.career_id = career_id;
      if (faculty_id) filters.faculty_id = faculty_id;
    } else if (userRole === 'faculty-admin') {
      // Faculty-admin solo ve comisiones de su facultad
      filters.university_id = req.user.university_id;
      filters.faculty_id = req.user.faculty_id;
      if (course_id) filters.course_id = course_id;
      if (career_id) filters.career_id = career_id;
    } else if (userRole === 'professor-admin') {
      // Professor-admin solo ve comisiones de SUS cursos
      filters.course_id = { $in: req.user.course_ids };
      if (course_id) {
        // Validar que el course_id solicitado esté en sus cursos
        if (!req.user.course_ids.includes(course_id)) {
          return res.status(403).json({
            success: false,
            message: 'No tiene permisos para ver comisiones de este curso',
          });
        }
        filters.course_id = course_id;
      }
    } else if (userRole === 'professor') {
      // Professor solo ve comisiones donde está asignado
      filters.professors = req.user.userId;
    } else {
      // User no tiene acceso
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para ver comisiones',
      });
    }

    // Advertencia si se filtra por course_id sin career_id (solo super-admin)
    if (course_id && !career_id && userRole === 'super-admin') {
      console.warn(`⚠️  GET /api/commissions: Buscando comisiones por course_id sin career_id. Esto puede devolver duplicados de diferentes carreras.`);
    }

    const commissions = await Commission.findActive(filters);

    res.status(200).json({
      success: true,
      count: commissions.length,
      data: commissions,
    });
  } catch (error) {
    console.error('Error al obtener comisiones:', error);
    res.status(500).json({
      message: 'Error al obtener las comisiones',
      error: error.message,
    });
  }
};

/**
 * Obtener una comisión por ID
 * @route GET /api/commissions/:id
 */
export const getCommissionById = async (req, res) => {
  try {
    const { id } = req.params;

    const commission = await Commission.findById(id);

    if (!commission) {
      return res.status(404).json({
        message: 'Comisión no encontrada',
      });
    }

    if (commission.deleted) {
      return res.status(404).json({
        message: 'Comisión no disponible (eliminada)',
      });
    }

    res.status(200).json({
      success: true,
      data: commission,
    });
  } catch (error) {
    console.error('Error al obtener comisión:', error);
    res.status(500).json({
      message: 'Error al obtener la comisión',
      error: error.message,
    });
  }
};

/**
 * Crear una nueva comisión
 * @route POST /api/commissions
 * @access Admin only
 */
export const createCommission = async (req, res) => {
  try {
    const {
      commission_id,
      name,
      course_id,
      career_id,
      faculty_id,
      university_id,
      professor_name,
      professor_email,
      year,
    } = req.body;

    const userRole = req.user.role;

    // Validar campos requeridos
    if (!commission_id || !name || !course_id || !career_id || !faculty_id || !university_id || !year) {
      return res.status(400).json({
        message:
          'Faltan campos requeridos: commission_id, name, course_id, career_id, faculty_id, university_id, year',
      });
    }

    // Validar permisos según rol
    if (userRole === 'super-admin') {
      // Super-admin puede crear en cualquier curso
    } else if (userRole === 'university-admin') {
      // University-admin solo puede crear en su universidad
      if (university_id !== req.user.university_id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puede crear comisiones en su universidad',
        });
      }
    } else if (userRole === 'faculty-admin') {
      // Faculty-admin solo puede crear en su facultad
      if (university_id !== req.user.university_id || faculty_id !== req.user.faculty_id) {
        return res.status(403).json({
          success: false,
          message: 'Solo puede crear comisiones en su facultad',
        });
      }
    } else if (userRole === 'professor-admin') {
      // Professor-admin solo puede crear comisiones en SUS cursos
      if (!req.user.course_ids.includes(course_id)) {
        return res.status(403).json({
          success: false,
          message: 'Solo puede crear comisiones en sus cursos asignados',
        });
      }
    } else {
      // Professor y user no pueden crear comisiones
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para crear comisiones',
      });
    }

    // Verificar si ya existe una comisión con ese ID en ese curso
    const existingCommission = await Commission.findOne({
      course_id,
      commission_id,
      deleted: false,
    });

    if (existingCommission) {
      return res.status(409).json({
        message: 'Ya existe una comisión con ese ID en este curso',
      });
    }

    // Crear la comisión
    const commission = await Commission.create({
      commission_id,
      name,
      course_id,
      career_id,
      faculty_id,
      university_id,
      professor_name,
      professor_email,
      year,
    });

    // Crear carpeta en Google Drive (no bloqueante)
    // Esta función crea también las subcarpetas "Entregas" y "Rubricas"
    driveService.createCommissionFolder(commission_id, course_id, career_id, faculty_id, university_id).catch((err) => {
      console.error('Error al crear carpeta de comisión en Drive:', err);
    });

    res.status(201).json({
      success: true,
      message: 'Comisión creada exitosamente',
      data: commission,
    });
  } catch (error) {
    console.error('Error al crear comisión:', error);

    // Manejar error de clave duplicada
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Ya existe una comisión con ese ID en este curso',
        error: 'Clave duplicada',
      });
    }

    res.status(500).json({
      message: 'Error al crear la comisión',
      error: error.message,
    });
  }
};

/**
 * Actualizar una comisión
 * @route PUT /api/commissions/:id
 * @access Admin only
 */
export const updateCommission = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      course_id,
      career_id,
      faculty_id,
      university_id,
      professor_name,
      professor_email,
      year,
    } = req.body;

    // Buscar la comisión
    const commission = await Commission.findById(id);

    if (!commission) {
      return res.status(404).json({
        message: 'Comisión no encontrada',
      });
    }

    if (commission.deleted) {
      return res.status(400).json({
        message: 'No se puede actualizar una comisión eliminada. Restáurela primero.',
      });
    }

    // Actualizar campos (no se puede cambiar commission_id por integridad)
    if (name) commission.name = name;
    if (course_id) commission.course_id = course_id;
    if (career_id) commission.career_id = career_id;
    if (faculty_id) commission.faculty_id = faculty_id;
    if (university_id) commission.university_id = university_id;
    if (professor_name !== undefined) commission.professor_name = professor_name;
    if (professor_email !== undefined) commission.professor_email = professor_email;
    if (year) commission.year = year;

    await commission.save();

    res.status(200).json({
      success: true,
      message: 'Comisión actualizada exitosamente',
      data: commission,
    });
  } catch (error) {
    console.error('Error al actualizar comisión:', error);
    res.status(500).json({
      message: 'Error al actualizar la comisión',
      error: error.message,
    });
  }
};

/**
 * Eliminar una comisión (soft delete)
 * @route DELETE /api/commissions/:id
 * @access Admin only
 */
export const deleteCommission = async (req, res) => {
  try {
    const { id } = req.params;

    const commission = await Commission.findById(id);

    if (!commission) {
      return res.status(404).json({
        message: 'Comisión no encontrada',
      });
    }

    if (commission.deleted) {
      return res.status(400).json({
        message: 'La comisión ya está eliminada',
      });
    }

    await commission.softDelete();

    res.status(200).json({
      success: true,
      message: 'Comisión eliminada exitosamente',
      data: commission,
    });
  } catch (error) {
    console.error('Error al eliminar comisión:', error);
    res.status(500).json({
      message: 'Error al eliminar la comisión',
      error: error.message,
    });
  }
};

/**
 * Restaurar una comisión eliminada
 * @route PUT /api/commissions/:id/restore
 * @access Admin only
 */
export const restoreCommission = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar incluyendo eliminadas
    const commission = await Commission.findOne({ _id: id, deleted: true });

    if (!commission) {
      return res.status(404).json({
        message: 'Comisión eliminada no encontrada',
      });
    }

    await commission.restore();

    res.status(200).json({
      success: true,
      message: 'Comisión restaurada exitosamente',
      data: commission,
    });
  } catch (error) {
    console.error('Error al restaurar comisión:', error);
    res.status(500).json({
      message: 'Error al restaurar la comisión',
      error: error.message,
    });
  }
};

/**
 * Obtener todas las comisiones incluyendo eliminadas
 * @route GET /api/commissions/all
 * @access Admin only
 */
export const getAllCommissions = async (req, res) => {
  try {
    const { course_id, year, career_id } = req.query;

    const query = {};
    if (course_id) query.course_id = course_id;
    if (year) query.year = parseInt(year);
    if (career_id) query.career_id = career_id;

    const commissions = await Commission.find(query).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: commissions.length,
      data: commissions,
    });
  } catch (error) {
    console.error('Error al obtener todas las comisiones:', error);
    res.status(500).json({
      message: 'Error al obtener todas las comisiones',
      error: error.message,
    });
  }
};

/**
 * Obtener comisiones por año
 * @route GET /api/commissions/by-year/:year
 */
export const getCommissionsByYear = async (req, res) => {
  try {
    const { year } = req.params;

    const commissions = await Commission.findByYear(parseInt(year));

    res.status(200).json({
      success: true,
      count: commissions.length,
      data: commissions,
    });
  } catch (error) {
    console.error('Error al obtener comisiones por año:', error);
    res.status(500).json({
      message: 'Error al obtener comisiones por año',
      error: error.message,
    });
  }
};

/**
 * Obtener comisiones únicas (sin duplicados por carrera)
 * @route GET /api/commissions/unique?course_id=...&year=...
 * Este endpoint devuelve solo UNA comisión por cada commission_id único,
 * útil cuando no se tiene el career_id pero se quiere evitar duplicados.
 */
export const getUniqueCommissions = async (req, res) => {
  try {
    const { course_id, year } = req.query;

    const filters = { deleted: false };
    if (course_id) filters.course_id = course_id;
    if (year) filters.year = parseInt(year);

    // Usar agregación para obtener solo una comisión por commission_id
    const uniqueCommissions = await Commission.aggregate([
      { $match: filters },
      {
        $group: {
          _id: '$commission_id',
          // Tomar el primer documento de cada grupo
          doc: { $first: '$$ROOT' }
        }
      },
      { $replaceRoot: { newRoot: '$doc' } },
      { $sort: { name: 1 } }
    ]);

    res.status(200).json({
      success: true,
      count: uniqueCommissions.length,
      data: uniqueCommissions,
      note: 'Comisiones únicas (una por commission_id). Para obtener todas las comisiones de una carrera específica, use el parámetro career_id.'
    });
  } catch (error) {
    console.error('Error al obtener comisiones únicas:', error);
    res.status(500).json({
      message: 'Error al obtener comisiones únicas',
      error: error.message,
    });
  }
};

/**
 * Asignar profesor a comisión
 * @route POST /api/commissions/:id/assign-professor
 * @access University-admin, Super-admin
 */
export const assignProfessor = async (req, res) => {
  try {
    const { id } = req.params;
    const { professor_id } = req.body;

    if (!professor_id) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere professor_id',
      });
    }

    // Buscar comisión
    const commission = await Commission.findById(id);

    if (!commission || commission.deleted) {
      return res.status(404).json({
        success: false,
        message: 'Comisión no encontrada',
      });
    }

    // Validar multi-tenant: solo university-admin de la misma universidad o super-admin
    if (req.user.role === 'university-admin') {
      if (commission.university_id !== req.user.university_id) {
        return res.status(403).json({
          success: false,
          message: 'No tiene acceso a esta comisión',
        });
      }
    }

    // Buscar profesor
    const professor = await User.findById(professor_id);

    if (!professor || professor.deleted) {
      return res.status(404).json({
        success: false,
        message: 'Profesor no encontrado',
      });
    }

    // Validar que sea profesor
    if (professor.role !== 'professor') {
      return res.status(400).json({
        success: false,
        message: 'El usuario debe tener rol de profesor',
      });
    }

    // Validar que el profesor sea de la misma universidad
    if (professor.university_id !== commission.university_id) {
      return res.status(400).json({
        success: false,
        message: 'El profesor debe pertenecer a la misma universidad que la comisión',
      });
    }

    // Asignar profesor usando el método del modelo
    await commission.assignProfessor(professor_id);

    // Obtener comisión actualizada con populate
    const updatedCommission = await Commission.findById(id).populate('professors', 'name username email');

    res.status(200).json({
      success: true,
      message: 'Profesor asignado exitosamente',
      data: updatedCommission,
    });
  } catch (error) {
    console.error('Error al asignar profesor:', error);

    // Manejar error de duplicado
    if (error.message.includes('ya está asignado')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al asignar profesor',
      error: error.message,
    });
  }
};

/**
 * Remover profesor de comisión
 * @route DELETE /api/commissions/:id/professors/:professorId
 * @access University-admin, Super-admin
 */
export const removeProfessor = async (req, res) => {
  try {
    const { id, professorId } = req.params;

    // Buscar comisión
    const commission = await Commission.findById(id);

    if (!commission || commission.deleted) {
      return res.status(404).json({
        success: false,
        message: 'Comisión no encontrada',
      });
    }

    // Validar multi-tenant
    if (req.user.role === 'university-admin') {
      if (commission.university_id !== req.user.university_id) {
        return res.status(403).json({
          success: false,
          message: 'No tiene acceso a esta comisión',
        });
      }
    }

    // Remover profesor usando el método del modelo
    await commission.removeProfessor(professorId);

    // Obtener comisión actualizada
    const updatedCommission = await Commission.findById(id).populate('professors', 'name username email');

    res.status(200).json({
      success: true,
      message: 'Profesor removido exitosamente',
      data: updatedCommission,
    });
  } catch (error) {
    console.error('Error al remover profesor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al remover profesor',
      error: error.message,
    });
  }
};

/**
 * Obtener comisiones asignadas al profesor autenticado o todas las comisiones (super-admin)
 * @route GET /api/commissions/my-commissions
 * @access Professor, Professor-Admin, Super-Admin
 */
export const getMyCommissions = async (req, res) => {
  try {
    let commissions;

    // Si es super-admin, devolver TODAS las comisiones de todas las universidades
    if (req.user.role === 'super-admin') {
      commissions = await Commission.find({ deleted: false })
        .sort({ year: -1, commission_id: 1 });

      // Los campos university_id, faculty_id, career_id, course_id son strings, no referencias
      // Por lo tanto no necesitamos populate, solo devolver las comisiones tal cual
    }
    // Si es professor o professor-admin, solo sus comisiones asignadas
    else if (req.user.role === 'professor' || req.user.role === 'professor-admin') {
      commissions = await Commission.findByProfessor(req.user.userId);
    }
    // Otros roles no tienen acceso
    else {
      return res.status(403).json({
        success: false,
        message: 'Solo los profesores y super-admins pueden acceder a esta ruta',
      });
    }

    res.status(200).json({
      success: true,
      count: commissions.length,
      data: commissions,
    });
  } catch (error) {
    console.error('Error al obtener comisiones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener comisiones',
      error: error.message,
    });
  }
};

export default {
  getCommissions,
  getCommissionById,
  createCommission,
  updateCommission,
  deleteCommission,
  restoreCommission,
  getAllCommissions,
  getCommissionsByYear,
  getUniqueCommissions,
  assignProfessor,
  removeProfessor,
  getMyCommissions,
};

/**
 * Middleware Multi-Tenant
 * Control de acceso basado en university_id, faculty_id y roles
 */
import Commission from '../models/Commission.js';
import Faculty from '../models/Faculty.js';
import Course from '../models/Course.js';

/**
 * Verifica que el usuario tenga acceso a la universidad especificada
 * - super-admin: acceso a todo
 * - university-admin: solo su universidad
 * - faculty-admin: solo su universidad (validado por facultad)
 * - professor-admin: solo su universidad (validado por cursos)
 * - professor: solo su universidad
 * - user: solo su universidad
 */
export const checkUniversityAccess = async (req, res, next) => {
  try {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
    }

    // super-admin tiene acceso a todo
    if (req.user.role === 'super-admin') {
      return next();
    }

    // Obtener university_id del body, params o query
    const requestUniversityId =
      req.body.university_id ||
      req.params.university_id ||
      req.query.university_id;

    // Si no hay university_id en el request y no es super-admin, permitir
    // (para casos donde se filtrará en el controlador)
    if (!requestUniversityId) {
      return next();
    }

    // Verificar que el university_id del request coincida con el del usuario
    if (req.user.university_id !== requestUniversityId) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. No tiene permisos para acceder a esta universidad',
      });
    }

    // Validación adicional para faculty-admin: verificar faculty_id
    if (req.user.role === 'faculty-admin') {
      const requestFacultyId = req.body.faculty_id || req.params.faculty_id || req.query.faculty_id;

      if (requestFacultyId && req.user.faculty_id !== requestFacultyId) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado. No tiene permisos para acceder a esta facultad',
        });
      }
    }

    // Validación adicional para professor-admin: verificar course_ids
    if (req.user.role === 'professor-admin') {
      const requestCourseId = req.body.course_id || req.params.course_id || req.query.course_id;

      if (requestCourseId && !req.user.course_ids.includes(requestCourseId)) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado. No tiene permisos para acceder a este curso',
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error en middleware checkUniversityAccess:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar acceso a universidad',
      error: error.message,
    });
  }
};

/**
 * Verifica que el profesor tenga acceso a la comisión especificada
 * - super-admin y university-admin: acceso a todo
 * - professor: solo comisiones donde está asignado
 * - user: acceso denegado
 */
export const checkProfessorAccess = async (req, res, next) => {
  try {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
    }

    // super-admin y university-admin tienen acceso completo
    if (req.user.role === 'super-admin' || req.user.role === 'university-admin') {
      return next();
    }

    // user no tiene acceso
    if (req.user.role === 'user') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requiere rol de profesor o superior',
      });
    }

    // Para profesores, verificar que estén asignados a la comisión
    if (req.user.role === 'professor') {
      const commissionId = req.body.commission_id || req.params.commission_id || req.query.commission_id;

      if (!commissionId) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere commission_id para validar acceso',
        });
      }

      // Buscar la comisión y verificar que el profesor esté asignado
      const commission = await Commission.findOne({
        commission_id: commissionId,
        deleted: false,
      });

      if (!commission) {
        return res.status(404).json({
          success: false,
          message: 'Comisión no encontrada',
        });
      }

      // Verificar que el profesor esté en el array de profesores
      const isAssigned = commission.professors.some(
        (professorId) => professorId.toString() === req.user.userId.toString()
      );

      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado. No está asignado a esta comisión',
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error en middleware checkProfessorAccess:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar acceso a comisión',
      error: error.message,
    });
  }
};

/**
 * Middleware factory para requerir roles específicos
 * @param  {...String} allowedRoles - Roles permitidos
 * @returns {Function} Middleware function
 *
 * @example
 * router.post('/resource', authenticate, requireRoles('super-admin', 'university-admin'), controller)
 */
export const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Verificar que el usuario esté autenticado
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'No autenticado',
        });
      }

      // Verificar que el rol del usuario esté en los roles permitidos
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`,
        });
      }

      next();
    } catch (error) {
      console.error('Error en middleware requireRoles:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar roles',
        error: error.message,
      });
    }
  };
};

/**
 * Verifica que el usuario tenga acceso a una facultad específica
 * - super-admin: acceso a todo
 * - university-admin: solo facultades de su universidad
 * - faculty-admin: solo SU facultad
 * - professor-admin y professor: según sus asignaciones
 * - user: acceso denegado
 */
export const checkFacultyAccess = async (req, res, next) => {
  try {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
    }

    // super-admin tiene acceso a todo
    if (req.user.role === 'super-admin') {
      return next();
    }

    // Obtener faculty_id del body, params o query
    const requestFacultyId = req.body.faculty_id || req.params.faculty_id || req.query.faculty_id;

    if (!requestFacultyId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere faculty_id para validar acceso',
      });
    }

    // Buscar la facultad para obtener su university_id
    const faculty = await Faculty.findOne({ faculty_id: requestFacultyId, deleted: false });

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Facultad no encontrada',
      });
    }

    // university-admin: verificar que la facultad pertenezca a su universidad
    if (req.user.role === 'university-admin') {
      if (faculty.university_id !== req.user.university_id) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado. La facultad no pertenece a su universidad',
        });
      }
      return next();
    }

    // faculty-admin: verificar que sea SU facultad
    if (req.user.role === 'faculty-admin') {
      if (req.user.faculty_id !== requestFacultyId) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado. Solo puede acceder a su facultad',
        });
      }
      return next();
    }

    // professor-admin: verificar que la facultad contenga sus cursos
    if (req.user.role === 'professor-admin') {
      // Aquí podríamos verificar que al menos uno de sus cursos pertenezca a esta facultad
      // Por ahora permitimos si pertenece a su universidad
      if (faculty.university_id !== req.user.university_id) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado. La facultad no pertenece a su universidad',
        });
      }
      return next();
    }

    // professor y user: acceso denegado
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. No tiene permisos para gestionar facultades',
    });
  } catch (error) {
    console.error('Error en middleware checkFacultyAccess:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar acceso a facultad',
      error: error.message,
    });
  }
};

/**
 * Verifica que el usuario tenga acceso a un curso/materia específico
 * - super-admin: acceso a todo
 * - university-admin: solo cursos de su universidad
 * - faculty-admin: solo cursos de su facultad
 * - professor-admin: solo sus cursos asignados (course_ids)
 * - professor: solo cursos donde tiene comisiones asignadas
 * - user: acceso denegado
 */
export const checkCourseAccess = async (req, res, next) => {
  try {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
    }

    // super-admin tiene acceso a todo
    if (req.user.role === 'super-admin') {
      return next();
    }

    // Obtener course_id del body, params o query
    const requestCourseId = req.body.course_id || req.params.course_id || req.query.course_id;

    if (!requestCourseId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere course_id para validar acceso',
      });
    }

    // Buscar el curso para obtener su career_id y university_id
    const course = await Course.findOne({ course_id: requestCourseId, deleted: false });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado',
      });
    }

    // university-admin: verificar que el curso pertenezca a su universidad
    if (req.user.role === 'university-admin') {
      if (course.university_id !== req.user.university_id) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado. El curso no pertenece a su universidad',
        });
      }
      return next();
    }

    // faculty-admin: verificar que el curso pertenezca a su facultad
    if (req.user.role === 'faculty-admin') {
      if (course.university_id !== req.user.university_id) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado. El curso no pertenece a su universidad',
        });
      }
      // Aquí podríamos verificar que el curso pertenezca a una carrera de su facultad
      // Por ahora permitimos si está en su universidad
      return next();
    }

    // professor-admin: verificar que el curso esté en sus course_ids
    if (req.user.role === 'professor-admin') {
      if (!req.user.course_ids.includes(requestCourseId)) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado. No tiene permisos para este curso',
        });
      }
      return next();
    }

    // professor: verificar que tenga comisiones asignadas de ese curso
    if (req.user.role === 'professor') {
      const commission = await Commission.findOne({
        course_id: requestCourseId,
        professors: req.user.userId,
        deleted: false,
      });

      if (!commission) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado. No tiene comisiones asignadas de este curso',
        });
      }
      return next();
    }

    // user: acceso denegado
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. No tiene permisos para gestionar cursos',
    });
  } catch (error) {
    console.error('Error en middleware checkCourseAccess:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar acceso a curso',
      error: error.message,
    });
  }
};

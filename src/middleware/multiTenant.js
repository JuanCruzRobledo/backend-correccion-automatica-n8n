/**
 * Middleware Multi-Tenant
 * Control de acceso basado en university_id y roles
 */
import Commission from '../models/Commission.js';

/**
 * Verifica que el usuario tenga acceso a la universidad especificada
 * - super-admin: acceso a todo
 * - university-admin: solo su universidad
 * - professor: solo su universidad
 * - user: solo su universidad
 */
export const checkUniversityAccess = (req, res, next) => {
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

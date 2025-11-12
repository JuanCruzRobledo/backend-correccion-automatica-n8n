/**
 * Middleware de autenticación JWT
 */
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Verificar token JWT y autenticar usuario
 * Añade req.user si el token es válido
 */
export const authenticate = async (req, res, next) => {
  try {
    // Obtener token del header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No se proporcionó token de autenticación',
      });
    }

    // Extraer token (formato: "Bearer <token>")
    const token = authHeader.substring(7);

    // Verificar y decodificar token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expirado',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Token inválido',
      });
    }

    // Buscar usuario
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Añadir usuario a request
    req.user = {
      userId: user._id,
      username: user.username,
      role: user.role,
      university_id: user.university_id,
    };

    next();
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    res.status(500).json({
      success: false,
      message: 'Error en autenticación',
      error: error.message,
    });
  }
};

/**
 * Middleware para verificar que el usuario es admin (university-admin o super-admin)
 * Debe ejecutarse DESPUÉS del middleware authenticate
 * NOTA: Mantiene compatibilidad con código existente que usa 'admin'
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
  }

  // Permitir super-admin, university-admin y el antiguo 'admin' (compatibilidad)
  const allowedRoles = ['super-admin', 'university-admin', 'admin'];

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requiere rol de administrador',
    });
  }

  next();
};

/**
 * Middleware para verificar que el usuario es university-admin o superior
 * Debe ejecutarse DESPUÉS del middleware authenticate
 */
export const requireUniversityAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'No autenticado',
    });
  }

  const allowedRoles = ['super-admin', 'university-admin'];

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requiere rol de administrador de universidad o superior',
    });
  }

  next();
};

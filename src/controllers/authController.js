/**
 * Controlador de Autenticación
 */
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Generar token JWT
 * @param {String} userId - ID del usuario
 * @param {String} username - Nombre de usuario
 * @param {String} role - Rol del usuario
 * @returns {String} Token JWT
 */
const generateToken = (userId, username, role) => {
  return jwt.sign(
    { userId, username, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Login - POST /api/auth/login
 * @route POST /api/auth/login
 * @access Public
 */
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validar datos
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username y password son requeridos',
      });
    }

    // Buscar usuario (incluir password)
    const user = await User.findByUsername(username);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas',
      });
    }

    // Validar que la cuenta no esté eliminada (soft delete)
    if (user.deleted === true) {
      return res.status(403).json({
        success: false,
        message: 'Esta cuenta ha sido deshabilitada. Contacte al administrador.',
      });
    }

    // Verificar password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas',
      });
    }

    // Generar token
    const token = generateToken(user._id, user.username, user.role);

    // Responder con token y datos del usuario
    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      token,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message,
    });
  }
};

/**
 * Registrar usuario - POST /api/auth/register
 * @route POST /api/auth/register
 * @access Private (solo admin)
 */
export const register = async (req, res) => {
  try {
    const { username, name, password, role } = req.body;

    // Validar datos
    if (!username || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Username, nombre y password son requeridos',
      });
    }

    // Verificar si el usuario ya existe (activo o eliminado)
    const existingUser = await User.findOne({ username: username.toLowerCase() });

    if (existingUser) {
      // Si el usuario existe y está eliminado
      if (existingUser.deleted === true) {
        return res.status(400).json({
          success: false,
          message: 'Este nombre de usuario perteneció a una cuenta eliminada. Contacte al administrador para restaurarla.',
        });
      }

      // Si el usuario existe y está activo (deleted: false o sin campo deleted)
      return res.status(400).json({
        success: false,
        message: 'El nombre de usuario ya está en uso',
      });
    }

    // Crear usuario (siempre con rol 'user' para registro público)
    const user = new User({
      username,
      name,
      password,
      role: 'user',
    });

    await user.save();

    // Responder con datos del usuario (sin password)
    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: user.toPublicJSON(),
    });
  } catch (error) {
    console.error('Error en registro:', error);

    // Manejar errores de validación de Mongoose
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
      message: 'Error en el servidor',
      error: error.message,
    });
  }
};

/**
 * Verificar token - GET /api/auth/verify
 * @route GET /api/auth/verify
 * @access Private
 */
export const verify = async (req, res) => {
  try {
    // req.user ya fue añadido por el middleware authenticate
    res.status(200).json({
      success: true,
      valid: true,
      user: req.user,
    });
  } catch (error) {
    console.error('Error en verify:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message,
    });
  }
};

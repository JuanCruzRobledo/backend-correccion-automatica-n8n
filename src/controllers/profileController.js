/**
 * Profile Controller
 * Gestiona el perfil del usuario autenticado y su API key de Gemini
 */
import User from '../models/User.js';
import { validateGeminiApiKey } from '../services/geminiValidation.js';

/**
 * GET /api/profile
 * Obtener perfil del usuario autenticado
 */
export const getProfile = async (req, res) => {
  try {
    // req.user viene del middleware authenticate
    const userId = req.user.userId;

    // Buscar usuario (incluir gemini_api_key_encrypted para validación)
    const user = await User.findById(userId).select('+gemini_api_key_encrypted');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    if (user.deleted) {
      return res.status(403).json({
        success: false,
        message: 'Usuario eliminado',
      });
    }

    // Preparar respuesta con información del perfil
    const profileData = {
      _id: user._id,
      username: user.username,
      role: user.role,
      hasGeminiApiKey: user.hasValidGeminiApiKey(),
      gemini_api_key: user.getGeminiApiKey(), // Incluir API key desencriptada
      gemini_api_key_last_4: user.getLast4Digits(),
      gemini_api_key_configured_at: user.gemini_api_key_configured_at,
      gemini_api_key_last_validated: user.gemini_api_key_last_validated,
      gemini_api_key_is_valid: user.gemini_api_key_is_valid,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.json({
      success: true,
      data: profileData,
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil',
      error: error.message,
    });
  }
};

/**
 * PUT /api/profile
 * Actualizar datos básicos del perfil (nombre de usuario, etc.)
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { username } = req.body;

    // Buscar usuario
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    if (user.deleted) {
      return res.status(403).json({
        success: false,
        message: 'Usuario eliminado',
      });
    }

    // Actualizar campos permitidos
    if (username) {
      // Validar que no exista otro usuario con ese username
      const existingUser = await User.findOne({
        username: username.toLowerCase(),
        _id: { $ne: userId },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'El nombre de usuario ya está en uso',
        });
      }

      user.username = username.toLowerCase();
    }

    await user.save();

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: user.toPublicJSON(),
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar perfil',
      error: error.message,
    });
  }
};

/**
 * PUT /api/profile/gemini-api-key
 * Configurar API Key de Gemini del usuario
 */
export const setGeminiApiKey = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { api_key } = req.body;

    // Validar que se proporcione la API key
    if (!api_key || typeof api_key !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'La API key es requerida',
      });
    }

    // Validar formato básico
    if (!api_key.startsWith('AIza')) {
      return res.status(400).json({
        success: false,
        message: 'Formato de API key inválido (debe empezar con "AIza")',
      });
    }

    // Buscar usuario (necesitamos incluir gemini_api_key_encrypted para el método)
    const user = await User.findById(userId).select('+gemini_api_key_encrypted');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    if (user.deleted) {
      return res.status(403).json({
        success: false,
        message: 'Usuario eliminado',
      });
    }

    // Validar la API key con Gemini (request de prueba)
    console.log(`🔍 Validando API key de Gemini para usuario: ${user.username}`);
    const validation = await validateGeminiApiKey(api_key);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error || 'API key inválida',
      });
    }

    // Si la validación pasó, guardar la API key
    await user.setGeminiApiKey(api_key);

    console.log(`✅ API key configurada exitosamente para usuario: ${user.username}`);

    res.json({
      success: true,
      message: 'API key de Gemini configurada exitosamente',
      data: {
        hasGeminiApiKey: true,
        gemini_api_key_last_4: user.getLast4Digits(),
        gemini_api_key_configured_at: user.gemini_api_key_configured_at,
        gemini_api_key_is_valid: user.gemini_api_key_is_valid,
      },
    });
  } catch (error) {
    console.error('Error al configurar API key:', error);
    res.status(500).json({
      success: false,
      message: 'Error al configurar API key',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/profile/gemini-api-key
 * Eliminar API Key de Gemini del usuario
 */
export const deleteGeminiApiKey = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Buscar usuario
    const user = await User.findById(userId).select('+gemini_api_key_encrypted');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    if (user.deleted) {
      return res.status(403).json({
        success: false,
        message: 'Usuario eliminado',
      });
    }

    // Verificar que tenga una API key configurada
    if (!user.gemini_api_key_encrypted) {
      return res.status(400).json({
        success: false,
        message: 'No hay API key configurada para eliminar',
      });
    }

    // Eliminar la API key
    await user.clearGeminiApiKey();

    console.log(`🗑️ API key eliminada para usuario: ${user.username}`);

    res.json({
      success: true,
      message: 'API key de Gemini eliminada exitosamente',
      data: {
        hasGeminiApiKey: false,
      },
    });
  } catch (error) {
    console.error('Error al eliminar API key:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar API key',
      error: error.message,
    });
  }
};

export default {
  getProfile,
  updateProfile,
  setGeminiApiKey,
  deleteGeminiApiKey,
};

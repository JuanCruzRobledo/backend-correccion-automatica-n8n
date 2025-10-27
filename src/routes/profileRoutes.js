/**
 * Profile Routes
 * Rutas para gestionar el perfil del usuario y su API key de Gemini
 */
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { apiKeyRateLimit } from '../middleware/rateLimit.js';
import {
  getProfile,
  updateProfile,
  setGeminiApiKey,
  deleteGeminiApiKey,
} from '../controllers/profileController.js';

const router = express.Router();

/**
 * Todas las rutas de perfil requieren autenticación
 */

// GET /api/profile - Obtener perfil del usuario autenticado
router.get('/profile', authenticate, getProfile);

// PUT /api/profile - Actualizar datos básicos del perfil
router.put('/profile', authenticate, updateProfile);

// PUT /api/profile/gemini-api-key - Configurar API key de Gemini
// Rate limit: máximo 5 intentos por hora
router.put('/profile/gemini-api-key', authenticate, apiKeyRateLimit, setGeminiApiKey);

// DELETE /api/profile/gemini-api-key - Eliminar API key de Gemini
router.delete('/profile/gemini-api-key', authenticate, deleteGeminiApiKey);

export default router;

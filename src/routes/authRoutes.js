/**
 * Rutas de Autenticación
 */
import express from 'express';
import { login, register, verify } from '../controllers/authController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Login de usuario
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /api/auth/register
 * @desc    Registrar nuevo usuario
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   GET /api/auth/verify
 * @desc    Verificar token JWT
 * @access  Private
 */
router.get('/verify', authenticate, verify);

export default router;

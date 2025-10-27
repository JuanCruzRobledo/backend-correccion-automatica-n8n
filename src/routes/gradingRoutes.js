/**
 * Grading Routes
 * Rutas para corrección de exámenes
 */
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { gradeSubmission } from '../controllers/gradingController.js';

const router = express.Router();

/**
 * POST /api/grade - Corregir un examen individual
 * Requiere autenticación y API key de Gemini configurada
 */
router.post('/grade', authenticate, gradeSubmission);

export default router;

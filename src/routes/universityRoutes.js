/**
 * Rutas de Universidades
 */
import express from 'express';
import {
  getUniversities,
  getUniversityById,
  createUniversity,
  updateUniversity,
  deleteUniversity,
} from '../controllers/universityController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/universities
 * @desc    Obtener todas las universidades activas
 * @access  Public
 */
router.get('/', getUniversities);

/**
 * @route   GET /api/universities/:id
 * @desc    Obtener una universidad por ID
 * @access  Public
 */
router.get('/:id', getUniversityById);

/**
 * @route   POST /api/universities
 * @desc    Crear nueva universidad
 * @access  Private (solo admin)
 */
router.post('/', authenticate, requireAdmin, createUniversity);

/**
 * @route   PUT /api/universities/:id
 * @desc    Actualizar universidad
 * @access  Private (solo admin)
 */
router.put('/:id', authenticate, requireAdmin, updateUniversity);

/**
 * @route   DELETE /api/universities/:id
 * @desc    Eliminar universidad (baja lógica)
 * @access  Private (solo admin)
 */
router.delete('/:id', authenticate, requireAdmin, deleteUniversity);

export default router;

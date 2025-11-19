/**
 * Rutas de Carreras
 */
import express from 'express';
import {
  getCareers,
  getCareerById,
  createCareer,
  updateCareer,
  deleteCareer,
  restoreCareer,
  getAllCareers,
} from '../controllers/careerController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/careers/all
 * @desc    Obtener todas las carreras (incluyendo eliminadas)
 * @access  Private (solo admin)
 */
router.get('/all', authenticate, requireAdmin, getAllCareers);

/**
 * @route   GET /api/careers
 * @desc    Obtener todas las carreras activas (con filtros opcionales: faculty_id, university_id)
 * @access  Private (requiere autenticación)
 */
router.get('/', authenticate, getCareers);

/**
 * @route   GET /api/careers/:id
 * @desc    Obtener una carrera por ID
 * @access  Private (requiere autenticación)
 */
router.get('/:id', authenticate, getCareerById);

/**
 * @route   POST /api/careers
 * @desc    Crear nueva carrera
 * @access  Private (solo admin)
 */
router.post('/', authenticate, requireAdmin, createCareer);

/**
 * @route   PUT /api/careers/:id
 * @desc    Actualizar carrera
 * @access  Private (solo admin)
 */
router.put('/:id', authenticate, requireAdmin, updateCareer);

/**
 * @route   PUT /api/careers/:id/restore
 * @desc    Restaurar carrera eliminada
 * @access  Private (solo admin)
 */
router.put('/:id/restore', authenticate, requireAdmin, restoreCareer);

/**
 * @route   DELETE /api/careers/:id
 * @desc    Eliminar carrera (baja lógica)
 * @access  Private (solo admin)
 */
router.delete('/:id', authenticate, requireAdmin, deleteCareer);

export default router;

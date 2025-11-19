/**
 * Rutas de Facultades
 */
import express from 'express';
import {
  getFaculties,
  getFacultyById,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  restoreFaculty,
  getAllFaculties,
} from '../controllers/facultyController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/faculties/all
 * @desc    Obtener todas las facultades (incluyendo eliminadas)
 * @access  Private (solo admin)
 */
router.get('/all', authenticate, requireAdmin, getAllFaculties);

/**
 * @route   GET /api/faculties
 * @desc    Obtener todas las facultades activas (con filtros opcionales: university_id)
 * @access  Private (requiere autenticación)
 */
router.get('/', authenticate, getFaculties);

/**
 * @route   GET /api/faculties/:id
 * @desc    Obtener una facultad por ID
 * @access  Private (requiere autenticación)
 */
router.get('/:id', authenticate, getFacultyById);

/**
 * @route   POST /api/faculties
 * @desc    Crear nueva facultad
 * @access  Private (solo admin)
 */
router.post('/', authenticate, requireAdmin, createFaculty);

/**
 * @route   PUT /api/faculties/:id
 * @desc    Actualizar facultad
 * @access  Private (solo admin)
 */
router.put('/:id', authenticate, requireAdmin, updateFaculty);

/**
 * @route   PUT /api/faculties/:id/restore
 * @desc    Restaurar facultad eliminada
 * @access  Private (solo admin)
 */
router.put('/:id/restore', authenticate, requireAdmin, restoreFaculty);

/**
 * @route   DELETE /api/faculties/:id
 * @desc    Eliminar facultad (baja lógica)
 * @access  Private (solo admin)
 */
router.delete('/:id', authenticate, requireAdmin, deleteFaculty);

export default router;

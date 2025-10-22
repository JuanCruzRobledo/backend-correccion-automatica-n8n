/**
 * Rutas de Cursos/Materias
 */
import express from 'express';
import {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} from '../controllers/courseController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/courses?university_id=xxx
 * @desc    Obtener todos los cursos activos (con filtro opcional por universidad)
 * @access  Public
 */
router.get('/', getCourses);

/**
 * @route   GET /api/courses/:id
 * @desc    Obtener un curso por ID
 * @access  Public
 */
router.get('/:id', getCourseById);

/**
 * @route   POST /api/courses
 * @desc    Crear nuevo curso
 * @access  Private (solo admin)
 */
router.post('/', authenticate, requireAdmin, createCourse);

/**
 * @route   PUT /api/courses/:id
 * @desc    Actualizar curso
 * @access  Private (solo admin)
 */
router.put('/:id', authenticate, requireAdmin, updateCourse);

/**
 * @route   DELETE /api/courses/:id
 * @desc    Eliminar curso (baja lógica)
 * @access  Private (solo admin)
 */
router.delete('/:id', authenticate, requireAdmin, deleteCourse);

export default router;

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
 * @route   GET /api/courses
 * @desc    Obtener todos los cursos activos (con filtros opcionales: career_id, year, faculty_id, university_id)
 * @access  Private (requiere autenticación)
 */
router.get('/', authenticate, getCourses);

/**
 * @route   GET /api/courses/:id
 * @desc    Obtener un curso por ID
 * @access  Private (requiere autenticación)
 */
router.get('/:id', authenticate, getCourseById);

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

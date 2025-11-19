/**
 * Rutas de Rúbricas
 */
import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  getRubrics,
  getRubricById,
  createRubric,
  createRubricFromPDF,
  updateRubric,
  deleteRubric,
} from '../controllers/rubricController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Configurar multer para upload de PDFs
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'rubric-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Aceptar PDFs
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  },
});

/**
 * @route   GET /api/rubrics
 * @desc    Obtener todas las rúbricas activas (con filtros opcionales: commission_id, course_id, rubric_type, year, career_id, faculty_id, university_id)
 * @access  Private (requiere autenticación)
 */
router.get('/', authenticate, getRubrics);

/**
 * @route   GET /api/rubrics/:id
 * @desc    Obtener una rúbrica por ID
 * @access  Private (requiere autenticación)
 */
router.get('/:id', authenticate, getRubricById);

/**
 * @route   POST /api/rubrics
 * @desc    Crear nueva rúbrica desde JSON
 * @access  Private (solo admin)
 */
router.post('/', authenticate, requireAdmin, createRubric);

/**
 * @route   POST /api/rubrics/from-pdf
 * @desc    Crear nueva rúbrica desde PDF (llama a n8n)
 * @access  Private (solo admin)
 */
router.post('/from-pdf', authenticate, requireAdmin, upload.single('pdf'), createRubricFromPDF);

/**
 * @route   PUT /api/rubrics/:id
 * @desc    Actualizar rúbrica
 * @access  Private (solo admin)
 */
router.put('/:id', authenticate, requireAdmin, updateRubric);

/**
 * @route   DELETE /api/rubrics/:id
 * @desc    Eliminar rúbrica (baja lógica)
 * @access  Private (solo admin)
 */
router.delete('/:id', authenticate, requireAdmin, deleteRubric);

export default router;

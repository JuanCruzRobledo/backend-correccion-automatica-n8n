/**
 * Rutas de Submissions (Entregas de Alumnos)
 */
import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  getAllSubmissions,
  getSubmissionById,
  createSubmission,
  updateSubmission,
  deleteSubmission,
  createBatchSubmissions,
} from '../controllers/submissionController.js';
import { downloadIndividualDevolutionPdf } from '../controllers/devolutionController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRoles, checkProfessorAccess } from '../middleware/multiTenant.js';

const router = express.Router();

// Configurar multer para upload de archivos .txt
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'submission-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB máximo (para batch)
  },
  fileFilter: (req, file, cb) => {
    // Aceptar archivos .txt y .zip
    const isTxt = file.mimetype === 'text/plain' || file.originalname.endsWith('.txt');
    const isZip = file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || file.originalname.endsWith('.zip');

    if (isTxt || isZip) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos .txt o .zip'));
    }
  },
});

/**
 * @route   GET /api/submissions
 * @desc    Obtener todas las submissions (con filtros multi-tenant)
 * @access  Private (professor, university-admin, super-admin)
 * @query   commission_id, rubric_id, status
 */
router.get(
  '/',
  authenticate,
  requireRoles('professor', 'university-admin', 'super-admin'),
  getAllSubmissions
);

/**
 * @route   GET /api/submissions/:id
 * @desc    Obtener una submission por ID
 * @access  Private (professor, university-admin, super-admin)
 */
router.get(
  '/:id',
  authenticate,
  requireRoles('professor', 'university-admin', 'super-admin'),
  getSubmissionById
);

/**
 * @route   POST /api/submissions
 * @desc    Crear nueva submission (subir entrega de alumno)
 * @access  Private (professor, university-admin, super-admin)
 * @body    multipart/form-data: file, student_name, student_id, rubric_id, commission_id, mode?, customExtensions?, includeTests?, forceOverwrite?
 */
router.post(
  '/',
  authenticate,
  requireRoles('professor', 'university-admin', 'super-admin'),
  upload.single('file'),
  checkProfessorAccess,
  createSubmission
);

/**
 * @route   POST /api/submissions/batch
 * @desc    Crear múltiples submissions (batch de entregas con auto-consolidación)
 * @access  Private (professor, university-admin, super-admin)
 * @body    multipart/form-data: file (ZIP con estructura entregas/), rubric_id, commission_id, mode, customExtensions?, includeTests?, forceOverwrite?, runSimilarityAnalysis?
 */
router.post(
  '/batch',
  authenticate,
  requireRoles('professor', 'university-admin', 'super-admin'),
  upload.single('file'),
  checkProfessorAccess,
  createBatchSubmissions
);

/**
 * @route   PUT /api/submissions/:id
 * @desc    Actualizar submission (estado o corrección)
 * @access  Private (professor, university-admin, super-admin)
 * @body    { status?, correction? }
 */
router.put(
  '/:id',
  authenticate,
  requireRoles('professor', 'university-admin', 'super-admin'),
  updateSubmission
);

/**
 * @route   DELETE /api/submissions/:id
 * @desc    Eliminar submission (soft delete)
 * @access  Private (professor, university-admin, super-admin)
 */
router.delete(
  '/:id',
  authenticate,
  requireRoles('professor', 'university-admin', 'super-admin'),
  deleteSubmission
);

/**
 * @route   GET /api/submissions/:id/devolution-pdf
 * @desc    Descargar PDF de devolución individual para un estudiante
 * @access  Private (professor, university-admin, super-admin)
 */
router.get(
  '/:id/devolution-pdf',
  authenticate,
  requireRoles('professor', 'university-admin', 'super-admin'),
  downloadIndividualDevolutionPdf
);

export default router;

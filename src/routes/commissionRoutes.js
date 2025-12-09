/**
 * Rutas de Comisiones
 */
import express from 'express';
import {
  getCommissions,
  getCommissionById,
  createCommission,
  updateCommission,
  deleteCommission,
  restoreCommission,
  getAllCommissions,
  getCommissionsByYear,
  getUniqueCommissions,
  assignProfessor,
  removeProfessor,
  getMyCommissions,
} from '../controllers/commissionController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { requireRoles } from '../middleware/multiTenant.js';
import {
  getSimilarityAnalysis,
  downloadSimilarityReportPdf,
} from '../controllers/similarityController.js';
import {
  downloadBatchDevolutionPdfs,
  downloadStudentDevolutionPdf,
} from '../controllers/devolutionController.js';

const router = express.Router();

/**
 * @route   GET /api/commissions/all
 * @desc    Obtener todas las comisiones (incluyendo eliminadas)
 * @access  Private (solo admin)
 */
router.get('/all', authenticate, requireAdmin, getAllCommissions);

/**
 * @route   GET /api/commissions/my-commissions
 * @desc    Obtener comisiones asignadas al profesor autenticado
 * @access  Private (professor)
 */
router.get('/my-commissions', authenticate, getMyCommissions);

/**
 * @route   GET /api/commissions/by-year/:year
 * @desc    Obtener comisiones por año
 * @access  Private (requiere autenticación)
 */
router.get('/by-year/:year', authenticate, getCommissionsByYear);

/**
 * @route   GET /api/commissions/unique
 * @desc    Obtener comisiones únicas (sin duplicados por carrera)
 * @access  Private (requiere autenticación)
 */
router.get('/unique', authenticate, getUniqueCommissions);

/**
 * @route   GET /api/commissions
 * @desc    Obtener todas las comisiones activas (con filtros opcionales: course_id, year, career_id, faculty_id, university_id)
 * @access  Private (requiere autenticación)
 */
router.get('/', authenticate, getCommissions);

/**
 * @route   GET /api/commissions/:id
 * @desc    Obtener una comisión por ID
 * @access  Private (requiere autenticación)
 */
router.get('/:id', authenticate, getCommissionById);

/**
 * @route   POST /api/commissions
 * @desc    Crear nueva comisión
 * @access  Private (solo admin)
 */
router.post('/', authenticate, requireAdmin, createCommission);

/**
 * @route   PUT /api/commissions/:id
 * @desc    Actualizar comisión
 * @access  Private (solo admin)
 */
router.put('/:id', authenticate, requireAdmin, updateCommission);

/**
 * @route   PUT /api/commissions/:id/restore
 * @desc    Restaurar comisión eliminada
 * @access  Private (solo admin)
 */
router.put('/:id/restore', authenticate, requireAdmin, restoreCommission);

/**
 * @route   DELETE /api/commissions/:id
 * @desc    Eliminar comisión (baja lógica)
 * @access  Private (solo admin)
 */
router.delete('/:id', authenticate, requireAdmin, deleteCommission);

/**
 * @route   POST /api/commissions/:id/assign-professor
 * @desc    Asignar profesor a comisión
 * @access  Private (university-admin, super-admin)
 * @body    { professor_id }
 */
router.post(
  '/:id/assign-professor',
  authenticate,
  requireRoles('super-admin', 'university-admin'),
  assignProfessor
);

/**
 * @route   DELETE /api/commissions/:id/professors/:professorId
 * @desc    Remover profesor de comisión
 * @access  Private (university-admin, super-admin)
 */
router.delete(
  '/:id/professors/:professorId',
  authenticate,
  requireRoles('super-admin', 'university-admin'),
  removeProfessor
);

/**
 * @route   GET /api/commissions/:commissionId/rubrics/:rubricId/similarity
 * @desc    Obtener análisis de similitud en JSON
 * @access  Private (professor)
 */
router.get(
  '/:commissionId/rubrics/:rubricId/similarity',
  authenticate,
  getSimilarityAnalysis
);

/**
 * @route   GET /api/commissions/:commissionId/rubrics/:rubricId/similarity/pdf
 * @desc    Descargar reporte de similitud en PDF
 * @access  Private (professor)
 */
router.get(
  '/:commissionId/rubrics/:rubricId/similarity/pdf',
  authenticate,
  downloadSimilarityReportPdf
);

/**
 * @route   GET /api/commissions/:commissionId/rubrics/:rubricId/students/:studentName/devolution-pdf
 * @desc    Descargar PDF individual de devolución usando planilla de Drive
 * @access  Private (professor, university-admin, super-admin)
 */
router.get(
  '/:commissionId/rubrics/:rubricId/students/:studentName/devolution-pdf',
  authenticate,
  requireRoles('professor', 'university-admin', 'super-admin'),
  downloadStudentDevolutionPdf
);

/**
 * @route   POST /api/commissions/:commissionId/rubrics/:rubricId/generate-devolution-pdfs
 * @desc    Generar y descargar ZIP con PDFs de devolución para todos los estudiantes
 * @access  Private (professor, university-admin, super-admin)
 */
router.post(
  '/:commissionId/rubrics/:rubricId/generate-devolution-pdfs',
  authenticate,
  requireRoles('professor', 'university-admin', 'super-admin'),
  downloadBatchDevolutionPdfs
);

export default router;

/**
 * Consolidator Routes
 * Rutas para consolidar proyectos en un único archivo
 */
import express from 'express';
import fileUpload from 'express-fileupload';
import { consolidateProject } from '../controllers/consolidatorController.js';
import { batchConsolidate, downloadBatchResult } from '../controllers/batchConsolidatorController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/consolidate - Consolidar un proyecto individual
 * Ruta PÚBLICA (sin autenticación) - Accesible para todos
 *
 * Acepta:
 * - projectZip: archivo ZIP del proyecto (multipart/form-data)
 * - mode: modo de conversión opcional (1-5, default: 5)
 * - customExtensions: extensiones personalizadas separadas por comas (opcional)
 * - includeTests: incluir archivos de test (true/false, default: true)
 */
router.post(
  '/consolidate',
  fileUpload({
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB máximo
    useTempFiles: false,
    abortOnLimit: true,
    parseNested: true
  }),
  consolidateProject
);

/**
 * POST /api/consolidate/batch - Consolidar múltiples entregas (batch)
 * Ruta PROTEGIDA (requiere autenticación) - Solo profesores
 *
 * Acepta:
 * - entregas: archivo ZIP con estructura entregas/{alumno}/proyecto.zip (multipart/form-data)
 * - commissionId: ID de la comisión (required)
 * - rubricId: ID de la rúbrica (required)
 * - mode: modo de conversión opcional (1-5, default: 5)
 * - customExtensions: extensiones personalizadas separadas por comas (opcional)
 * - includeTests: incluir archivos de test (true/false, default: true)
 */
router.post(
  '/consolidate/batch',
  authenticate,
  fileUpload({
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB máximo para batch
    useTempFiles: false,
    abortOnLimit: true,
    parseNested: true
  }),
  batchConsolidate
);

/**
 * GET /api/consolidate/batch/download/:filename - Descargar resultado batch
 * Ruta PROTEGIDA (requiere autenticación)
 */
router.get('/consolidate/batch/download/:filename', authenticate, downloadBatchResult);

export default router;

/**
 * Consolidator Routes
 * Rutas para consolidar proyectos en un único archivo
 */
import express from 'express';
import fileUpload from 'express-fileupload';
import { consolidateProject } from '../controllers/consolidatorController.js';

const router = express.Router();

/**
 * POST /api/consolidate - Consolidar un proyecto
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

export default router;

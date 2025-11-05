/**
 * Consolidator Controller
 * Controlador para consolidar proyectos en un único archivo de texto
 */
import ConsolidatorService from '../services/consolidatorService.js';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);

/**
 * POST /api/consolidate
 * Consolida un proyecto subido (ZIP o carpeta) en un único archivo de texto
 *
 * Body:
 * - projectZip: archivo ZIP del proyecto (multipart/form-data)
 * - mode: modo de conversión (1-5) opcional
 * - customExtensions: extensiones personalizadas separadas por comas opcional
 * - includeTests: incluir archivos de test (true/false) opcional
 */
export const consolidateProject = async (req, res) => {
  let uploadedFilePath = null;
  let extractedPath = null;

  try {
    // Validar que se haya subido un archivo
    if (!req.files || !req.files.projectZip) {
      return res.status(400).json({
        success: false,
        message: 'Debes subir un archivo ZIP del proyecto'
      });
    }

    const projectFile = Array.isArray(req.files.projectZip)
      ? req.files.projectZip[0]
      : req.files.projectZip;

    // Obtener parámetros opcionales
    const mode = req.body.mode || '5';
    const includeTests = req.body.includeTests !== 'false'; // Por defecto true
    const customExtensions = req.body.customExtensions
      ? req.body.customExtensions.split(',').map(ext => ext.trim())
      : null;

    console.log('📦 Procesando proyecto:', projectFile.name);
    console.log('   Modo:', mode);
    console.log('   Incluir tests:', includeTests);
    if (customExtensions) {
      console.log('   Extensiones personalizadas:', customExtensions);
    }

    // Guardar archivo temporalmente
    const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const timestamp = Date.now();
    const fileName = `project_${timestamp}_${projectFile.name}`;
    uploadedFilePath = path.join(uploadDir, fileName);

    // Escribir el archivo
    fs.writeFileSync(uploadedFilePath, projectFile.data);

    // Si es ZIP, extraer
    let projectPath = uploadedFilePath;
    if (projectFile.name.toLowerCase().endsWith('.zip')) {
      const AdmZip = await import('adm-zip');
      const zip = new AdmZip.default(uploadedFilePath);

      extractedPath = path.join(uploadDir, `extracted_${timestamp}`);
      zip.extractAllTo(extractedPath, true);

      // Buscar la carpeta raíz del proyecto (a veces el ZIP tiene una carpeta contenedora)
      const extractedContents = fs.readdirSync(extractedPath);
      if (extractedContents.length === 1 && fs.statSync(path.join(extractedPath, extractedContents[0])).isDirectory()) {
        projectPath = path.join(extractedPath, extractedContents[0]);
      } else {
        projectPath = extractedPath;
      }
    } else if (fs.statSync(uploadedFilePath).isDirectory()) {
      projectPath = uploadedFilePath;
    }

    // Consolidar proyecto
    const result = await ConsolidatorService.consolidateProject(
      projectPath,
      mode,
      customExtensions,
      includeTests
    );

    console.log('✅ Proyecto consolidado exitosamente');
    console.log(`   Archivos procesados: ${result.stats.totalFiles}`);

    // Limpiar archivos temporales
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      await unlink(uploadedFilePath);
    }
    if (extractedPath && fs.existsSync(extractedPath)) {
      // Eliminar directorio recursivamente
      fs.rmSync(extractedPath, { recursive: true, force: true });
    }

    // Devolver el contenido como texto plano
    res.status(200).json({
      success: true,
      content: result.content,
      stats: result.stats,
      message: 'Proyecto consolidado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al consolidar proyecto:', error);

    // Limpiar archivos temporales en caso de error
    try {
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        await unlink(uploadedFilePath);
      }
      if (extractedPath && fs.existsSync(extractedPath)) {
        fs.rmSync(extractedPath, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.error('Error al limpiar archivos temporales:', cleanupError);
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Error al consolidar el proyecto',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export default {
  consolidateProject
};

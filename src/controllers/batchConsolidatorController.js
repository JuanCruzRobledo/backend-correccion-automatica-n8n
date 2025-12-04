/**
 * Batch Consolidator Controller
 * Controlador para consolidar múltiples entregas simultáneamente
 */
import BatchConsolidatorService from '../services/batchConsolidatorService.js';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { promisify } from 'util';

const unlink = promisify(fs.unlink);

/**
 * POST /api/consolidate/batch
 * Consolida múltiples entregas de alumnos
 *
 * Body (multipart/form-data):
 * - entregas: archivo ZIP con estructura entregas/{alumno}/proyecto.zip
 * - commissionId: ID de la comisión (required)
 * - rubricId: ID de la rúbrica (required)
 * - mode: modo de conversión (1-5) opcional, default: 5
 * - customExtensions: extensiones personalizadas separadas por comas (opcional)
 * - includeTests: incluir archivos de test (true/false) opcional, default: true
 */
export const batchConsolidate = async (req, res) => {
  let uploadedFilePath = null;

  try {
    // 1. Validar que se haya subido un archivo
    if (!req.files || !req.files.entregas) {
      return res.status(400).json({
        success: false,
        message: 'Debes subir un archivo ZIP con las entregas',
      });
    }

    // 2. Validar parámetros requeridos
    const { commissionId, rubricId } = req.body;

    if (!commissionId || !rubricId) {
      return res.status(400).json({
        success: false,
        message: 'commissionId y rubricId son requeridos',
      });
    }

    // 3. Obtener archivo subido
    const entregasFile = Array.isArray(req.files.entregas)
      ? req.files.entregas[0]
      : req.files.entregas;

    // Validar que sea ZIP
    if (!entregasFile.name.toLowerCase().endsWith('.zip')) {
      return res.status(400).json({
        success: false,
        message: 'El archivo debe ser un ZIP',
      });
    }

    // 4. Guardar archivo temporalmente
    const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const timestamp = Date.now();
    const fileName = `entregas_${timestamp}_${entregasFile.name}`;
    uploadedFilePath = path.join(uploadDir, fileName);

    fs.writeFileSync(uploadedFilePath, entregasFile.data);

    // 5. Obtener opciones de consolidación
    const options = {
      mode: req.body.mode || '5',
      includeTests: req.body.includeTests !== 'false',
      customExtensions: req.body.customExtensions
        ? req.body.customExtensions.split(',').map((ext) => ext.trim())
        : null,
    };

    console.log('📦 Procesando batch de entregas:', entregasFile.name);
    console.log('   Comisión:', commissionId);
    console.log('   Rúbrica:', rubricId);
    console.log('   Modo:', options.mode);
    console.log('   Incluir tests:', options.includeTests);
    if (options.customExtensions) {
      console.log('   Extensiones personalizadas:', options.customExtensions);
    }
    console.log();

    // 6. Procesar batch
    const result = await BatchConsolidatorService.processBatchSubmissions(
      uploadedFilePath,
      commissionId,
      rubricId,
      options
    );

    // 7. Crear ZIP con archivos consolidados
    console.log('\n📦 Generando ZIP con archivos consolidados...');
    const zipFileName = `consolidados_${commissionId}_${rubricId}_${timestamp}.zip`;
    const zipFilePath = path.join(uploadDir, zipFileName);

    const zip = new AdmZip();

    // Agregar todos los archivos consolidados al ZIP
    const consolidatedDir = result.output_dir;
    const studentDirs = fs.readdirSync(consolidatedDir, { withFileTypes: true });

    for (const studentDir of studentDirs) {
      if (studentDir.isDirectory()) {
        const studentName = studentDir.name;
        const entregaPath = path.join(consolidatedDir, studentName, 'entrega.txt');

        if (fs.existsSync(entregaPath)) {
          const content = fs.readFileSync(entregaPath, 'utf-8');
          zip.addFile(`${studentName}/entrega.txt`, Buffer.from(content, 'utf-8'));
        }
      }
    }

    zip.writeZip(zipFilePath);
    console.log(`✅ ZIP generado: ${zipFileName}`);

    // 8. Enviar ZIP como descarga y JSON con resultados
    res.status(200).json({
      success: true,
      message: `${result.successful} proyectos procesados exitosamente`,
      total_processed: result.total_processed,
      successful: result.successful,
      failed: result.failed,
      results: result.results.map((r) => ({
        student_name: r.student_name,
        status: r.status,
        error: r.error,
        warning: r.warning,
        stats: r.stats,
      })),
      similarity: {
        identical_groups: result.similarity.identicalGroups.length,
        partial_copies: result.similarity.partialCopies.length,
        most_copied_files: result.similarity.mostCopiedFiles.length,
        details: result.similarity,
      },
      download_url: `/api/consolidate/batch/download/${path.basename(zipFilePath)}`,
    });

    // 9. Limpiar archivo de entrada
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      await unlink(uploadedFilePath);
    }
  } catch (error) {
    console.error('❌ Error en batch consolidation:', error);

    // Limpiar archivos temporales en caso de error
    try {
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        await unlink(uploadedFilePath);
      }
    } catch (cleanupError) {
      console.error('Error al limpiar archivos temporales:', cleanupError);
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Error al procesar el batch de entregas',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

/**
 * GET /api/consolidate/batch/download/:filename
 * Descarga el ZIP con archivos consolidados
 */
export const downloadBatchResult = async (req, res) => {
  try {
    const { filename } = req.params;

    // Validar que el nombre de archivo no contenga path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        message: 'Nombre de archivo inválido',
      });
    }

    const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
    const filePath = path.join(uploadDir, filename);

    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado',
      });
    }

    // Enviar archivo
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Error al descargar archivo:', err);
        return res.status(500).json({
          success: false,
          message: 'Error al descargar el archivo',
        });
      }

      // Eliminar archivo después de descargarlo
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️  Archivo temporal eliminado: ${filename}`);
        }
      }, 5000); // 5 segundos después de la descarga
    });
  } catch (error) {
    console.error('Error en downloadBatchResult:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al descargar el archivo',
    });
  }
};

export default {
  batchConsolidate,
  downloadBatchResult,
};

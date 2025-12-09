/**
 * Devolution Controller
 * Controlador para generación de PDFs de devolución individual y batch
 */
import DevolutionPdfService from '../services/devolutionPdfService.js';
import Submission from '../models/Submission.js';
import Commission from '../models/Commission.js';
import Rubric from '../models/Rubric.js';
import NodeDevolutionService from '../services/nodeDevolutionService.js';

const getRubricWithSpreadsheet = async (rubricId) => {
  const rubric = await Rubric.findOne({ rubric_id: rubricId });
  if (!rubric) {
    const error = new Error('Rúbrica no encontrada');
    error.statusCode = 404;
    throw error;
  }
  if (!rubric.spreadsheet_file_id) {
    const error = new Error('La rúbrica no tiene spreadsheet_file_id configurado');
    error.statusCode = 400;
    throw error;
  }
  return rubric;
};

const resolveSheetId = (rubric) => {
  if (rubric.sheet_id) return rubric.sheet_id;
  if (rubric.rubric_json?.sheet_id) return rubric.rubric_json.sheet_id;
  if (rubric.spreadsheet_file_url) {
    const match = rubric.spreadsheet_file_url.match(/gid=([0-9]+)/);
    if (match?.[1]) return match[1];
  }
  return null;
};

/**
 * GET /api/submissions/:submissionId/devolution-pdf
 * Descarga PDF de devolución individual
 */
export const downloadIndividualDevolutionPdf = async (req, res) => {
  try {
    const { submissionId } = req.params;

    console.log(`📄 Generando PDF individual para submission: ${submissionId}`);

    // Obtener submission
    const submission = await Submission.findOne({ submission_id: submissionId, deleted: false });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission no encontrada',
      });
    }

    // Verificar que tenga corrección
    if (!submission.correction || submission.status !== 'corrected') {
      return res.status(400).json({
        success: false,
        message: 'La submission no tiene corrección disponible',
      });
    }

    // Obtener nombres de comisión y rúbrica
    let commissionName = submission.commission_id;
    let rubricName = submission.rubric_id;

    try {
      const commission = await Commission.findOne({ commission_id: submission.commission_id });
      if (commission) commissionName = commission.name || commission.commission_name;

      const rubric = await Rubric.findOne({ rubric_id: submission.rubric_id });
      if (rubric) rubricName = rubric.name || rubric.rubric_name;
    } catch (err) {
      console.warn('No se pudieron obtener nombres de comisión/rúbrica:', err.message);
    }

    // Generar PDF
    const pdfBuffer = await DevolutionPdfService.generateDevolutionPdf(
      submission,
      commissionName,
      rubricName
    );

    // Configurar headers para descarga
    const timestamp = Date.now();
    const fileName = `${submission.student_name.replace(/\s+/g, '_')}_devolucion_${timestamp}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Enviar PDF
    res.send(pdfBuffer);

    console.log(`✅ PDF generado: ${fileName} (${(pdfBuffer.length / 1024).toFixed(2)} KB)`);
  } catch (error) {
    console.error('❌ Error generando PDF individual:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al generar el PDF',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

/**
 * POST /api/commissions/:commissionId/rubrics/:rubricId/generate-devolution-pdfs
 * Genera y descarga un ZIP con todos los PDFs de devolución
 */
export const downloadBatchDevolutionPdfs = async (req, res) => {
  try {
    const { commissionId, rubricId } = req.params;

    // Validar parámetros
    if (!commissionId || !rubricId) {
      return res.status(400).json({
        success: false,
        message: 'commissionId y rubricId son requeridos',
      });
    }

    console.log(`📦 Generando batch de PDFs: ${commissionId} / ${rubricId}`);

    const rubric = await getRubricWithSpreadsheet(rubricId);
    if (rubric.commission_id !== commissionId) {
      return res.status(400).json({
        success: false,
        message: 'La rúbrica no pertenece a la comisión indicada',
      });
    }

    // Generar ZIP con todos los PDFs usando Python + n8n
    const { buffer } = await NodeDevolutionService.generateBatchPdfs(
      commissionId,
      rubricId,
      rubric.spreadsheet_file_id,
      resolveSheetId(rubric),
      rubric.drive_folder_id
    );

    // Configurar headers para descarga
    const timestamp = Date.now();
    const fileName = `devoluciones_${commissionId}_${rubricId}_${timestamp}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);

    // Enviar ZIP
    res.send(buffer);

    console.log(
      `✅ ZIP generado: ${fileName} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`
    );
  } catch (error) {
    console.error('❌ Error generando batch de PDFs:', error);
    const statusCode =
      Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode < 600
        ? error.statusCode
        : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error al generar el ZIP de PDFs',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

/**
 * GET /api/commissions/:commissionId/rubrics/:rubricId/students/:studentName/devolution-pdf
 * Genera y descarga PDF de devolución individual (usando n8n + Python)
 */
export const downloadStudentDevolutionPdf = async (req, res) => {
  try {
    const { commissionId, rubricId, studentName } = req.params;

    if (!studentName) {
      return res.status(400).json({
        success: false,
        message: 'studentName es requerido',
      });
    }

    console.log(`📄 Generando PDF individual via n8n para: ${studentName}`);

    const rubric = await getRubricWithSpreadsheet(rubricId);
    if (rubric.commission_id !== commissionId) {
      return res.status(400).json({
        success: false,
        message: 'La rúbrica no pertenece a la comisión indicada',
      });
    }

    const { buffer } = await NodeDevolutionService.generateIndividualPdf(
      commissionId,
      rubricId,
      studentName,
      rubric.spreadsheet_file_id,
      resolveSheetId(rubric),
      rubric.drive_folder_id
    );

    const timestamp = Date.now();
    const fileName = `${studentName.replace(/\s+/g, '_')}_devolucion_${timestamp}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);

    console.log(`✅ PDF individual generado: ${fileName}`);
  } catch (error) {
    console.error('❌ Error generando PDF individual via n8n:', error);
    const statusCode =
      Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode < 600
        ? error.statusCode
        : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Error al generar el PDF',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

/**
 * POST /api/commissions/:commissionId/rubrics/:rubricId/update-corrections-from-excel
 * Actualiza las correcciones desde un archivo Excel
 * (Funcionalidad opcional para permitir subir un Excel con correcciones y actualizar la BD)
 */
export const updateCorrectionsFromExcel = async (req, res) => {
  try {
    const { commissionId, rubricId } = req.params;

    // Validar que se haya subido un archivo
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un archivo Excel',
      });
    }

    console.log(`📊 Procesando Excel para actualizar correcciones: ${commissionId} / ${rubricId}`);

    // TODO: Implementar parser de Excel usando 'xlsx' o 'exceljs'
    // Por ahora retornamos un mensaje de que la funcionalidad está en desarrollo

    return res.status(501).json({
      success: false,
      message: 'Funcionalidad de importación desde Excel en desarrollo',
      note: 'Por ahora, las correcciones deben actualizarse mediante el endpoint de actualización manual',
    });
  } catch (error) {
    console.error('❌ Error procesando Excel:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al procesar el archivo Excel',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

export default {
  downloadIndividualDevolutionPdf,
  downloadBatchDevolutionPdfs,
  downloadStudentDevolutionPdf,
  updateCorrectionsFromExcel,
};

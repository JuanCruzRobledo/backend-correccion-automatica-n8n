/**
 * Similarity Controller
 * Controlador para análisis de similitud y generación de reportes
 */
import ProjectHash from '../models/ProjectHash.js';
import SimilarityDetectorService from '../services/similarityDetectorService.js';
import SimilarityReportPdfService from '../services/similarityReportPdfService.js';
import Commission from '../models/Commission.js';
import Rubric from '../models/Rubric.js';

/**
 * GET /api/commissions/:commissionId/rubrics/:rubricId/similarity
 * Obtiene el análisis de similitud en formato JSON
 */
export const getSimilarityAnalysis = async (req, res) => {
  try {
    const { commissionId, rubricId } = req.params;

    // Validar parámetros
    if (!commissionId || !rubricId) {
      return res.status(400).json({
        success: false,
        message: 'commissionId y rubricId son requeridos',
      });
    }

    console.log(`📊 Analizando similitud: ${commissionId} / ${rubricId}`);

    // Obtener ProjectHashes
    const projectHashes = await ProjectHash.findByCommissionAndRubric(commissionId, rubricId);

    if (projectHashes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron proyectos para esta comisión y rúbrica',
      });
    }

    // Analizar similitudes
    const similarity = SimilarityDetectorService.detectSimilarities(projectHashes);

    // Obtener nombres de comisión y rúbrica (opcional, para mejor contexto)
    let commissionName = commissionId;
    let rubricName = rubricId;

    try {
      const commission = await Commission.findOne({ commission_id: commissionId });
      if (commission) commissionName = commission.commission_name;

      const rubric = await Rubric.findOne({ rubric_id: rubricId });
      if (rubric) rubricName = rubric.rubric_name;
    } catch (err) {
      // Si falla, usar IDs como fallback
      console.warn('No se pudieron obtener nombres de comisión/rúbrica:', err.message);
    }

    // Responder con análisis
    res.status(200).json({
      success: true,
      generated_at: new Date().toISOString(),
      commission: {
        id: commissionId,
        name: commissionName,
      },
      rubric: {
        id: rubricId,
        name: rubricName,
      },
      total_projects: projectHashes.length,
      identical_groups: similarity.identicalGroups,
      partial_copies: similarity.partialCopies,
      most_copied_files: similarity.mostCopiedFiles,
      summary: {
        total_identical_groups: similarity.identicalGroups.length,
        total_partial_copies: similarity.partialCopies.length,
        total_most_copied_files: similarity.mostCopiedFiles.length,
      },
    });

    console.log('✅ Análisis de similitud completado');
  } catch (error) {
    console.error('❌ Error en análisis de similitud:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al analizar similitud',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

/**
 * GET /api/commissions/:commissionId/rubrics/:rubricId/similarity/pdf
 * Genera y descarga el reporte de similitud en PDF
 */
export const downloadSimilarityReportPdf = async (req, res) => {
  try {
    const { commissionId, rubricId } = req.params;

    // Validar parámetros
    if (!commissionId || !rubricId) {
      return res.status(400).json({
        success: false,
        message: 'commissionId y rubricId son requeridos',
      });
    }

    console.log(`📄 Generando PDF de similitud: ${commissionId} / ${rubricId}`);

    // Obtener nombres de comisión y rúbrica
    let commissionName = commissionId;
    let rubricName = rubricId;

    try {
      const commission = await Commission.findOne({ commission_id: commissionId });
      if (commission) commissionName = commission.commission_name;

      const rubric = await Rubric.findOne({ rubric_id: rubricId });
      if (rubric) rubricName = rubric.rubric_name;
    } catch (err) {
      console.warn('No se pudieron obtener nombres de comisión/rúbrica:', err.message);
    }

    // Generar PDF
    const pdfBuffer = await SimilarityReportPdfService.generateSimilarityReportPdf(
      commissionId,
      rubricId,
      commissionName,
      rubricName
    );

    // Configurar headers para descarga
    const timestamp = Date.now();
    const fileName = `reporte_similitud_${commissionId}_${rubricId}_${timestamp}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Enviar PDF
    res.send(pdfBuffer);

    console.log(`✅ PDF generado: ${fileName} (${(pdfBuffer.length / 1024).toFixed(2)} KB)`);
  } catch (error) {
    console.error('❌ Error generando PDF de similitud:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al generar el PDF',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

export default {
  getSimilarityAnalysis,
  downloadSimilarityReportPdf,
};

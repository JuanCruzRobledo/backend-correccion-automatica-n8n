/**
 * Similarity Controller
 * Controlador para análisis de similitud y generación de reportes
 */
import Commission from '../models/Commission.js';
import Rubric from '../models/Rubric.js';
import NodeSimilarityReportService from '../services/nodeSimilarityReportService.js';

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

    // Ejecutar generador en Node (basado en generate_pdf_report.py)
    const report = await NodeSimilarityReportService.generateReport(commissionId, rubricId);

    // Obtener nombres de comisión y rúbrica (opcional, para mejor contexto)
    let commissionName = commissionId;
    let rubricName = rubricId;

    try {
      const commission = await Commission.findOne({ commission_id: commissionId });
      if (commission) commissionName = commission.name || commission.commission_name;

      const rubric = await Rubric.findOne({ rubric_id: rubricId });
      if (rubric) rubricName = rubric.name || rubric.rubric_name;
    } catch (err) {
      // Si falla, usar IDs como fallback
      console.warn('No se pudieron obtener nombres de comisión/rúbrica:', err.message);
    }

    // Responder con análisis
    res.status(200).json({
      success: true,
      generated_at: report.generado,
      commission: {
        id: commissionId,
        name: commissionName,
      },
      rubric: {
        id: rubricId,
        name: rubricName,
      },
      total_projects: report.total_proyectos_analizados,
      identical_groups: report.proyectos_identicos,
      partial_copies: report.copias_parciales,
      most_copied_files: report.archivos_mas_copiados,
      summary: {
        total_identical_groups: report.total_grupos_identicos,
        total_partial_copies: report.total_copias_parciales,
        total_most_copied_files: report.archivos_mas_copiados?.length || 0,
      },
      report_raw: report,
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
      if (commission) commissionName = commission.name || commission.commission_name;

      const rubric = await Rubric.findOne({ rubric_id: rubricId });
      if (rubric) rubricName = rubric.name || rubric.rubric_name;
    } catch (err) {
      console.warn('No se pudieron obtener nombres de comisión/rúbrica:', err.message);
    }

    // Generar PDF mediante implementación nativa Node (basado en generate_pdf_report.py)
    const { buffer } = await NodeSimilarityReportService.generateReportPdf(commissionId, rubricId);

    // Configurar headers para descarga
    const timestamp = Date.now();
    const fileName = `reporte_similitud_${commissionId}_${rubricId}_${timestamp}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);

    // Enviar PDF
    res.send(buffer);

    console.log(`✅ PDF generado: ${fileName} (${(buffer.length / 1024).toFixed(2)} KB)`);
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

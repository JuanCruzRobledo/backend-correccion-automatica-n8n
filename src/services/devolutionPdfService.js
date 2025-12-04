/**
 * Devolution PDF Service
 * Genera PDFs individuales de devolución para estudiantes con correcciones
 */
import PDFDocument from 'pdfkit';
import Submission from '../models/Submission.js';
import Commission from '../models/Commission.js';
import Rubric from '../models/Rubric.js';
import archiver from 'archiver';

class DevolutionPdfService {
  /**
   * Genera un PDF de devolución individual para un estudiante
   * @param {Object} submission - Documento Submission de MongoDB
   * @param {String} commissionName - Nombre de la comisión (opcional)
   * @param {String} rubricName - Nombre de la rúbrica (opcional)
   * @returns {Promise<Buffer>} - Buffer del PDF generado
   */
  static async generateDevolutionPdf(submission, commissionName = '', rubricName = '') {
    try {
      // Verificar que la submission tenga corrección
      if (!submission.correction || submission.status !== 'corrected') {
        throw new Error('La submission no tiene corrección disponible');
      }

      // Crear documento PDF
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `Devolución - ${submission.student_name}`,
          Author: 'Sistema de Corrección Automática',
          Subject: 'Devolución de Corrección',
        },
      });

      // Generar contenido
      this._generateDevolutionContent(doc, {
        studentName: submission.student_name,
        commissionName: commissionName || submission.commission_id,
        rubricName: rubricName || submission.rubric_id,
        grade: submission.correction.grade,
        criteria: submission.correction.criteria || [],
        strengths: submission.correction.strengths_list || [],
        recommendations: submission.correction.recommendations_list || [],
        generalFeedback: submission.correction.general_feedback || '',
        correctedAt: submission.correction.corrected_at || new Date(),
      });

      // Finalizar documento
      doc.end();

      // Convertir a buffer
      return await this._streamToBuffer(doc);
    } catch (error) {
      console.error('Error generando PDF de devolución:', error);
      throw error;
    }
  }

  /**
   * Genera múltiples PDFs de devolución y los comprime en un ZIP
   * @param {String} commissionId - ID de la comisión
   * @param {String} rubricId - ID de la rúbrica
   * @returns {Promise<Buffer>} - Buffer del archivo ZIP
   */
  static async generateBatchDevolutionPdfs(commissionId, rubricId) {
    try {
      console.log(`📦 Generando PDFs batch para: ${commissionId} / ${rubricId}`);

      // Obtener submissions corregidas
      const submissions = await Submission.find({
        commission_id: commissionId,
        rubric_id: rubricId,
        status: 'corrected',
        deleted: false,
      });

      if (submissions.length === 0) {
        throw new Error('No se encontraron submissions corregidas para esta comisión y rúbrica');
      }

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

      // Crear archivo ZIP
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks = [];

      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('error', (err) => {
        throw err;
      });

      // Generar PDF para cada submission y agregarlo al ZIP
      for (const submission of submissions) {
        try {
          const pdfBuffer = await this.generateDevolutionPdf(submission, commissionName, rubricName);
          const fileName = `${this._sanitizeFileName(submission.student_name)}_devolucion.pdf`;
          archive.append(pdfBuffer, { name: fileName });
          console.log(`✅ PDF agregado: ${fileName}`);
        } catch (err) {
          console.error(`❌ Error generando PDF para ${submission.student_name}:`, err.message);
        }
      }

      // Finalizar ZIP
      await archive.finalize();

      // Esperar a que termine la compresión
      await new Promise((resolve, reject) => {
        archive.on('end', resolve);
        archive.on('error', reject);
      });

      const zipBuffer = Buffer.concat(chunks);
      console.log(
        `✅ ZIP generado: ${submissions.length} PDFs (${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB)`
      );

      return zipBuffer;
    } catch (error) {
      console.error('Error generando batch de PDFs:', error);
      throw error;
    }
  }

  /**
   * Genera el contenido del PDF de devolución
   * @private
   */
  static _generateDevolutionContent(doc, data) {
    const { studentName, commissionName, rubricName, grade, criteria, strengths, recommendations, generalFeedback, correctedAt } = data;

    // --- PORTADA ---
    doc
      .fontSize(24)
      .fillColor('#1f2937')
      .text('Devolución de Corrección', { align: 'center' })
      .moveDown(2);

    // Información básica
    doc
      .fontSize(14)
      .fillColor('#4b5563')
      .text(`Alumno: ${studentName}`, { align: 'left' })
      .moveDown(0.3)
      .fontSize(11)
      .fillColor('#6b7280')
      .text(`Comisión: ${commissionName}`)
      .text(`Rúbrica: ${rubricName}`)
      .moveDown(1);

    // Nota (destacada en verde)
    if (grade !== null && grade !== undefined) {
      doc
        .fontSize(18)
        .fillColor('#059669')
        .text(`Puntaje Total: ${grade}`, { align: 'center' })
        .moveDown(2);
    } else {
      doc.moveDown(1);
    }

    // --- CRITERIOS DE EVALUACIÓN ---
    if (criteria && criteria.length > 0) {
      doc
        .fontSize(16)
        .fillColor('#1f2937')
        .text('Criterios de Evaluación', { underline: true })
        .moveDown(0.5);

      criteria.forEach((criterio) => {
        // Determinar color según status
        let color, symbol;
        switch (criterio.status) {
          case 'ok':
            color = '#059669'; // Verde
            symbol = '✓';
            break;
          case 'error':
            color = '#dc2626'; // Rojo
            symbol = '✗';
            break;
          case 'warning':
            color = '#f59e0b'; // Amarillo
            symbol = '⚠';
            break;
          default:
            color = '#4b5563';
            symbol = '•';
        }

        // Nombre del criterio con símbolo
        const criterionTitle = `${symbol} ${criterio.name || 'Criterio'}`;
        const scoreText =
          criterio.score !== null && criterio.max_score !== null
            ? ` (${criterio.score}/${criterio.max_score})`
            : '';

        doc
          .fontSize(11)
          .fillColor(color)
          .text(criterionTitle + scoreText, { indent: 15 });

        // Feedback del criterio (si existe)
        if (criterio.feedback) {
          doc
            .fontSize(10)
            .fillColor('#6b7280')
            .text(criterio.feedback, { indent: 30 })
            .moveDown(0.3);
        } else {
          doc.moveDown(0.3);
        }
      });

      doc.moveDown(1);
    }

    // --- FORTALEZAS DETECTADAS ---
    if (strengths && strengths.length > 0) {
      doc
        .fontSize(16)
        .fillColor('#1f2937')
        .text('Fortalezas Detectadas', { underline: true })
        .moveDown(0.5);

      strengths.forEach((strength) => {
        doc
          .fontSize(11)
          .fillColor('#374151')
          .text(`• ${strength}`, { indent: 15 })
          .moveDown(0.3);
      });

      doc.moveDown(1);
    }

    // --- RECOMENDACIONES ---
    if (recommendations && recommendations.length > 0) {
      doc
        .fontSize(16)
        .fillColor('#1f2937')
        .text('Recomendaciones', { underline: true })
        .moveDown(0.5);

      recommendations.forEach((recommendation, idx) => {
        doc
          .fontSize(11)
          .fillColor('#374151')
          .text(`${idx + 1}. ${recommendation}`, { indent: 15 })
          .moveDown(0.3);
      });

      doc.moveDown(1);
    }

    // --- FEEDBACK GENERAL ---
    if (generalFeedback) {
      doc
        .fontSize(16)
        .fillColor('#1f2937')
        .text('Comentarios Generales', { underline: true })
        .moveDown(0.5);

      doc
        .fontSize(11)
        .fillColor('#374151')
        .text(generalFeedback, { align: 'left' })
        .moveDown(2);
    }

    // --- PIE DE PÁGINA ---
    doc
      .fontSize(9)
      .fillColor('#9ca3af')
      .text(`Fecha de corrección: ${correctedAt.toLocaleDateString('es-AR')}`, { align: 'center' })
      .moveDown(0.3)
      .text('Sistema de Corrección Automática', { align: 'center' });
  }

  /**
   * Sanitiza el nombre del archivo removiendo caracteres especiales
   * @private
   */
  static _sanitizeFileName(name) {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^a-z0-9-_]/g, '_') // Reemplazar caracteres especiales
      .replace(/_{2,}/g, '_') // Remover underscores consecutivos
      .replace(/^_|_$/g, ''); // Remover underscores al inicio/fin
  }

  /**
   * Convierte un stream a buffer
   * @private
   */
  static _streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}

export default DevolutionPdfService;

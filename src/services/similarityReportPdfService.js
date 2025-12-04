/**
 * Similarity Report PDF Service
 * Genera reportes PDF profesionales del análisis de similitud
 */
import PDFDocument from 'pdfkit';
import ProjectHash from '../models/ProjectHash.js';
import SimilarityDetectorService from './similarityDetectorService.js';

class SimilarityReportPdfService {
  /**
   * Genera un reporte PDF de similitud
   * @param {String} commissionId - ID de la comisión
   * @param {String} rubricId - ID de la rúbrica
   * @returns {Promise<Buffer>} - Buffer del PDF generado
   */
  static async generateSimilarityReportPdf(commissionId, rubricId, commissionName = '', rubricName = '') {
    try {
      // 1. Obtener todos los ProjectHash de la comisión y rúbrica
      const projectHashes = await ProjectHash.findByCommissionAndRubric(commissionId, rubricId);

      if (projectHashes.length === 0) {
        throw new Error('No se encontraron proyectos para esta comisión y rúbrica');
      }

      // 2. Analizar similitudes
      const similarity = SimilarityDetectorService.detectSimilarities(projectHashes);

      // 3. Crear documento PDF
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `Reporte de Similitud - ${commissionName || commissionId}`,
          Author: 'Sistema de Corrección Automática',
          Subject: 'Análisis de Similitud de Proyectos',
        },
      });

      // 4. Generar contenido del PDF
      this._generatePdfContent(doc, {
        commissionId,
        rubricId,
        commissionName,
        rubricName,
        totalProjects: projectHashes.length,
        similarity,
        generatedAt: new Date(),
      });

      // 5. Finalizar documento
      doc.end();

      // 6. Convertir a buffer
      return await this._streamToBuffer(doc);
    } catch (error) {
      console.error('Error generando PDF de similitud:', error);
      throw error;
    }
  }

  /**
   * Genera el contenido del PDF
   * @private
   */
  static _generatePdfContent(doc, data) {
    const { commissionId, rubricId, commissionName, rubricName, totalProjects, similarity, generatedAt } = data;

    // Portada
    this._addCoverPage(doc, { commissionName, rubricName, totalProjects, generatedAt });

    // Nueva página para contenido
    doc.addPage();

    // Resumen Ejecutivo
    this._addExecutiveSummary(doc, { totalProjects, similarity });

    // Proyectos 100% Idénticos
    if (similarity.identicalGroups.length > 0) {
      doc.addPage();
      this._addIdenticalProjectsSection(doc, similarity.identicalGroups);
    }

    // Copias Parciales
    if (similarity.partialCopies.length > 0) {
      doc.addPage();
      this._addPartialCopiesSection(doc, similarity.partialCopies);
    }

    // Archivos Más Copiados
    if (similarity.mostCopiedFiles.length > 0) {
      doc.addPage();
      this._addMostCopiedFilesSection(doc, similarity.mostCopiedFiles);
    }

    // Pie de página final
    doc.addPage();
    doc.fontSize(12).fillColor('#666666').text('— Fin del Reporte —', { align: 'center' });
  }

  /**
   * Agrega la portada
   * @private
   */
  static _addCoverPage(doc, { commissionName, rubricName, totalProjects, generatedAt }) {
    doc
      .fontSize(28)
      .fillColor('#1f2937')
      .text('📊 Reporte de Similitud', { align: 'center' })
      .moveDown(2);

    doc
      .fontSize(16)
      .fillColor('#4b5563')
      .text(`Comisión: ${commissionName}`, { align: 'center' })
      .moveDown(0.5)
      .text(`Rúbrica: ${rubricName}`, { align: 'center' })
      .moveDown(2);

    doc
      .fontSize(12)
      .fillColor('#6b7280')
      .text(`Total de proyectos analizados: ${totalProjects}`, { align: 'center' })
      .moveDown(0.5)
      .text(`Fecha de generación: ${generatedAt.toLocaleString('es-AR')}`, { align: 'center' });

    // Logo o marca de agua (opcional)
    doc.moveDown(4);
    doc
      .fontSize(10)
      .fillColor('#9ca3af')
      .text('Sistema de Corrección Automática', { align: 'center' })
      .text('Análisis de Similitud de Proyectos', { align: 'center' });
  }

  /**
   * Agrega el resumen ejecutivo
   * @private
   */
  static _addExecutiveSummary(doc, { totalProjects, similarity }) {
    doc.fontSize(20).fillColor('#1f2937').text('Resumen Ejecutivo', { underline: true }).moveDown(1);

    // Tabla de métricas
    const metrics = [
      ['Métrica', 'Valor'],
      ['Total de proyectos analizados', totalProjects.toString()],
      ['Grupos con proyectos 100% idénticos', similarity.identicalGroups.length.toString()],
      ['Casos de copias parciales detectados', similarity.partialCopies.length.toString()],
      ['Archivos más copiados (top)', similarity.mostCopiedFiles.length.toString()],
    ];

    this._drawTable(doc, metrics, {
      startY: doc.y,
      headerBg: '#3b82f6',
      headerText: '#ffffff',
      rowBg: ['#f3f4f6', '#ffffff'],
      cellPadding: 8,
    });

    doc.moveDown(2);

    // Alerta si hay copias significativas
    const hasSignificantCopies =
      similarity.identicalGroups.length > 0 || similarity.partialCopies.length > 5;

    if (hasSignificantCopies) {
      doc
        .fontSize(12)
        .fillColor('#dc2626')
        .text('⚠️ ALERTA: Se detectaron casos significativos de similitud entre proyectos', {
          align: 'center',
        })
        .moveDown(1);
    } else {
      doc
        .fontSize(12)
        .fillColor('#059669')
        .text('✅ No se detectaron casos significativos de similitud', { align: 'center' })
        .moveDown(1);
    }
  }

  /**
   * Agrega la sección de proyectos idénticos
   * @private
   */
  static _addIdenticalProjectsSection(doc, identicalGroups) {
    doc
      .fontSize(18)
      .fillColor('#dc2626')
      .text(`⚠️ Proyectos 100% Idénticos (${identicalGroups.length} grupos)`, { underline: true })
      .moveDown(1);

    identicalGroups.forEach((group, idx) => {
      // Encabezado del grupo
      doc
        .fontSize(14)
        .fillColor('#991b1b')
        .text(`Grupo ${idx + 1}`)
        .moveDown(0.5);

      // Información del grupo
      doc
        .fontSize(10)
        .fillColor('#4b5563')
        .text(`Hash del proyecto: ${group.project_hash.substring(0, 16)}...`)
        .text(`Archivos idénticos: ${group.files_count}`)
        .text(`Líneas de código: ${group.lines_count}`)
        .moveDown(0.5);

      // Lista de alumnos
      doc.fontSize(10).fillColor('#991b1b').text('Alumnos involucrados:');
      group.students.forEach((student, studentIdx) => {
        doc
          .fontSize(9)
          .fillColor('#4b5563')
          .text(`   ${studentIdx + 1}. ${student}`);
      });

      doc.moveDown(1);

      // Línea separadora
      doc
        .strokeColor('#e5e7eb')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(562, doc.y)
        .stroke();

      doc.moveDown(1);

      // Salto de página si es necesario
      if (doc.y > 650 && idx < identicalGroups.length - 1) {
        doc.addPage();
      }
    });
  }

  /**
   * Agrega la sección de copias parciales
   * @private
   */
  static _addPartialCopiesSection(doc, partialCopies) {
    // Filtrar solo copias ≥50%
    const relevantCopies = partialCopies.filter((copy) => copy.percentage >= 50);

    if (relevantCopies.length === 0) {
      doc
        .fontSize(18)
        .fillColor('#059669')
        .text('✅ Copias Parciales', { underline: true })
        .moveDown(0.5)
        .fontSize(12)
        .text('No se detectaron copias parciales significativas (≥50%).')
        .moveDown(2);
      return;
    }

    doc
      .fontSize(18)
      .fillColor('#f59e0b')
      .text(`⚠️ Copias Parciales (≥50% similitud) - ${relevantCopies.length} casos`, { underline: true })
      .moveDown(1);

    relevantCopies.forEach((copy, idx) => {
      // Color según severidad
      let color = '#f59e0b'; // Amarillo por defecto
      if (copy.percentage >= 80) color = '#dc2626'; // Rojo
      else if (copy.percentage >= 65) color = '#ea580c'; // Naranja

      // Encabezado del caso
      doc
        .fontSize(14)
        .fillColor(color)
        .text(`Caso ${idx + 1} - ${copy.percentage}% de similitud`)
        .moveDown(0.5);

      // Estudiantes
      doc
        .fontSize(10)
        .fillColor('#4b5563')
        .text(`Estudiantes: ${copy.students[0]} ↔ ${copy.students[1]}`)
        .text(`Archivos copiados: ${copy.total_common_files} archivos`)
        .moveDown(0.5);

      // Archivos detectados (máximo 5)
      if (copy.copied_files && copy.copied_files.length > 0) {
        doc.fontSize(10).fillColor(color).text('Archivos detectados:');
        copy.copied_files.slice(0, 5).forEach((file) => {
          const fileName = file.name.split('/').pop() || file.name;
          doc
            .fontSize(9)
            .fillColor('#4b5563')
            .text(`   • ${fileName}`);
        });

        if (copy.copied_files.length > 5) {
          doc
            .fontSize(9)
            .fillColor('#6b7280')
            .text(`   ... y ${copy.copied_files.length - 5} archivos más`);
        }
      }

      doc.moveDown(1);

      // Línea separadora
      doc
        .strokeColor('#e5e7eb')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(562, doc.y)
        .stroke();

      doc.moveDown(1);

      // Salto de página cada 3 casos
      if (doc.y > 600 && idx < relevantCopies.length - 1 && (idx + 1) % 3 === 0) {
        doc.addPage();
      }
    });
  }

  /**
   * Agrega la sección de archivos más copiados
   * @private
   */
  static _addMostCopiedFilesSection(doc, mostCopiedFiles) {
    const top10 = mostCopiedFiles.slice(0, 10);

    if (top10.length === 0) {
      return;
    }

    doc
      .fontSize(18)
      .fillColor('#8b5cf6')
      .text(`📋 Archivos Más Copiados (Top ${top10.length})`, { underline: true })
      .moveDown(1);

    top10.forEach((file, idx) => {
      doc
        .fontSize(11)
        .fillColor('#4b5563')
        .text(`${idx + 1}. ${file.file_name}`, { continued: true })
        .fillColor('#8b5cf6')
        .text(` - ${file.occurrences} copias`);

      // Muestra de estudiantes (máximo 3)
      const studentsPreview = file.students.slice(0, 3).join(', ');
      const moreCount = file.occurrences - 3;

      doc
        .fontSize(9)
        .fillColor('#6b7280')
        .text(`   Aparece en: ${studentsPreview}${moreCount > 0 ? ` ... (+${moreCount} más)` : ''}`);

      doc.moveDown(0.5);
    });
  }

  /**
   * Dibuja una tabla simple en el PDF
   * @private
   */
  static _drawTable(doc, data, options = {}) {
    const {
      startY = doc.y,
      headerBg = '#3b82f6',
      headerText = '#ffffff',
      rowBg = ['#f3f4f6', '#ffffff'],
      cellPadding = 8,
      colWidths = [250, 150],
    } = options;

    let currentY = startY;

    data.forEach((row, rowIdx) => {
      const isHeader = rowIdx === 0;
      const bgColor = isHeader ? headerBg : rowBg[rowIdx % rowBg.length];
      const textColor = isHeader ? headerText : '#1f2937';
      const fontSize = isHeader ? 11 : 10;
      const fontStyle = isHeader ? 'bold' : 'normal';

      // Dibujar fondo de la fila
      doc
        .rect(50, currentY, colWidths[0] + colWidths[1], 25)
        .fillAndStroke(bgColor, '#d1d5db');

      // Dibujar celdas
      row.forEach((cell, colIdx) => {
        const x = 50 + (colIdx === 0 ? 0 : colWidths[0]);
        const y = currentY + cellPadding;

        doc
          .fontSize(fontSize)
          .fillColor(textColor)
          .font(fontStyle === 'bold' ? 'Helvetica-Bold' : 'Helvetica')
          .text(cell, x + cellPadding, y, {
            width: colWidths[colIdx] - cellPadding * 2,
            align: 'left',
          });
      });

      currentY += 25;
    });

    doc.y = currentY + 10;
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

export default SimilarityReportPdfService;

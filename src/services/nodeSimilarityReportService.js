/**
 * Generador de reporte de similitud en Node (basado en generate_pdf_report.py).
 * Carga los ProjectHash desde Mongo, arma el JSON de reporte y genera el PDF con pdfkit.
 */
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import ProjectHash from '../models/ProjectHash.js';
import SimilarityDetectorService from './similarityDetectorService.js';

const COLORS = {
  primary: '#1a1a1a',
  accent: '#3498db',
  warning: '#c0392b',
  softRed: '#e74c3c',
  softOrange: '#f39c12',
  softYellow: '#fef5e7',
  softPurple: '#9b59b6',
  rowAlt: '#f8f9fa',
};

const buildReport = (commissionId, rubricId, similarity, total) => {
  const proyectos_identicos = (similarity.identicalGroups || []).map((group) => ({
    alumnos: group.students || [],
    hash_proyecto: group.project_hash,
    archivos_identicos: group.files_count || 0,
  }));

  const copias_parciales = (similarity.partialCopies || []).map((item) => ({
    alumnos: item.students || [],
    porcentaje_similitud: item.percentage || 0,
    total_archivos_comunes: item.total_common_files || 0,
    archivos_copiados: (item.copied_files || []).map((f) => ({
      nombre: f.name || '',
    })),
  }));

  const archivos_mas_copiados = (similarity.mostCopiedFiles || []).map((item) => ({
    archivo: item.file_name || '',
    total_copias: item.occurrences || 0,
    aparece_en: item.students || [],
  }));

  return {
    commission_id: commissionId,
    rubric_id: rubricId,
    generado: new Date().toISOString(),
    total_proyectos_analizados: total,
    total_grupos_identicos: proyectos_identicos.length,
    total_copias_parciales: copias_parciales.length,
    proyectos_identicos,
    copias_parciales,
    archivos_mas_copiados,
  };
};

const addSectionTitle = (doc, text) => {
  doc.moveDown(0.5).fontSize(16).fillColor(COLORS.primary).font('Helvetica-Bold').text(text);
};

const addParagraph = (doc, text, options = {}) => {
  doc
    .moveDown(options.gap || 0.2)
    .fontSize(options.size || 10)
    .fillColor(options.color || COLORS.primary)
    .font(options.bold ? 'Helvetica-Bold' : 'Helvetica')
    .text(text, { align: options.align || 'left' });
};

const drawTable = (doc, rows, colWidths, options = {}) => {
  const startX = doc.x;
  const startY = doc.y;
  const rowHeight = options.rowHeight || 18;

  rows.forEach((row, rowIndex) => {
    let x = startX;
    const isHeader = options.header && rowIndex === 0;

    row.forEach((cell, i) => {
      const width = colWidths[i] || 100;
      const cellText = cell ?? '';
      const bgColor = isHeader
        ? options.headerBg || COLORS.accent
        : options.rowBg?.[rowIndex % options.rowBg.length] || '#fff';

      // Fondo
      doc.rect(x, startY + rowIndex * rowHeight, width, rowHeight).fill(bgColor);

      // Texto
      doc
        .fillColor(isHeader ? '#fff' : COLORS.primary)
        .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(isHeader ? 10 : 9)
        .text(String(cellText), x + 6, startY + rowIndex * rowHeight + 5, {
          width: width - 12,
        });

      x += width;
    });
    // Líneas horizontales
    doc
      .strokeColor('#ccc')
      .lineWidth(0.5)
      .moveTo(startX, startY + rowIndex * rowHeight)
      .lineTo(startX + colWidths.reduce((a, b) => a + b, 0), startY + rowIndex * rowHeight)
      .stroke();
  });

  // Última línea
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  doc
    .strokeColor('#ccc')
    .lineWidth(0.5)
    .moveTo(startX, startY + rows.length * rowHeight)
    .lineTo(startX + totalWidth, startY + rows.length * rowHeight)
    .stroke();

  doc.moveDown(rows.length * (rowHeight / 72) * 0.8);
};

const generatePdfBuffer = (report) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 54 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    // Header
    doc.font('Helvetica-Bold').fontSize(24).fillColor(COLORS.primary);
    doc.text('Reporte de Similitud de Proyectos', { align: 'center' });
    doc.moveDown(1);

    // Resumen
    addSectionTitle(doc, 'Resumen');
    drawTable(
      doc,
      [
        ['Métrica', 'Valor'],
        ['Total de proyectos analizados', report.total_proyectos_analizados],
        ['Grupos con proyectos 100% idénticos', report.total_grupos_identicos],
        ['Casos de copias parciales detectados', report.total_copias_parciales],
        ['Fecha de generación', report.generado],
      ],
      [260, 260],
      {
        header: true,
        rowBg: ['#ffffff', COLORS.rowAlt],
        headerBg: COLORS.accent,
      }
    );

    // Proyectos idénticos
    addSectionTitle(doc, 'Proyectos 100% Idénticos');
    if (!report.proyectos_identicos?.length) {
      addParagraph(doc, 'No se detectaron proyectos completamente idénticos.', {
        color: COLORS.warning,
        bold: true,
      });
    } else {
      report.proyectos_identicos.forEach((grupo, idx) => {
        addParagraph(doc, `Grupo ${idx + 1}`, { bold: true });
        addParagraph(doc, `Hash: ${grupo.hash_proyecto}`);
        addParagraph(doc, `Archivos idénticos: ${grupo.archivos_identicos}`);
        grupo.alumnos?.forEach((alumno, i) => addParagraph(doc, `${i + 1}. ${alumno}`));
        doc.moveDown(0.5);
      });
    }

    // Copias parciales
    addSectionTitle(doc, 'Copias Parciales (>=50%)');
    if (!report.copias_parciales?.length) {
      addParagraph(doc, 'No se detectaron copias parciales significativas.', { color: COLORS.accent });
    } else {
      report.copias_parciales.forEach((copia, idx) => {
        const color =
          copia.porcentaje_similitud >= 80
            ? COLORS.softRed
            : copia.porcentaje_similitud >= 65
              ? COLORS.softOrange
              : COLORS.softYellow;
        addParagraph(doc, `Caso ${idx + 1}: ${copia.alumnos?.join(' ↔ ') || ''}`, {
          bold: true,
          color,
        });
        addParagraph(doc, `Similitud: ${copia.porcentaje_similitud}%`);
        addParagraph(doc, `Archivos copiados: ${copia.total_archivos_comunes}`);
        (copia.archivos_copiados || []).slice(0, 5).forEach((file) => {
          addParagraph(doc, `• ${file.nombre || ''}`, { size: 9 });
        });
        doc.moveDown(0.5);
      });
    }

    // Archivos más copiados
    if (report.archivos_mas_copiados?.length) {
      addSectionTitle(doc, 'Archivos Más Copiados (Top 10)');
      const tableRows = [['#', 'Archivo', 'Copias', 'Estudiantes (muestra)']];
      report.archivos_mas_copiados.slice(0, 10).forEach((file, idx) => {
        const students = file.aparece_en?.slice(0, 3).join(', ') || '';
        const extra =
          file.total_copias && file.total_copias > 3
            ? `... (+${file.total_copias - 3})`
            : '';
        tableRows.push([
          String(idx + 1),
          file.archivo,
          String(file.total_copias),
          `${students}${extra}`,
        ]);
      });
      drawTable(doc, tableRows, [30, 200, 60, 230], {
        header: true,
        rowBg: ['#ffffff', COLORS.rowAlt],
        headerBg: COLORS.softPurple,
      });
    }

    doc.end();
  });

export const generateReport = async (commissionId, rubricId) => {
  const projectHashes = await ProjectHash.findByCommissionAndRubric(commissionId, rubricId);
  if (!projectHashes.length) {
    const err = new Error('No se encontraron proyectos para esta comisión y rúbrica');
    err.statusCode = 404;
    throw err;
  }

  const similarity = SimilarityDetectorService.detectSimilarities(projectHashes);
  const report = buildReport(commissionId, rubricId, similarity, projectHashes.length);
  return report;
};

export const generateReportPdf = async (commissionId, rubricId) => {
  const report = await generateReport(commissionId, rubricId);
  const buffer = await generatePdfBuffer(report);
  return { buffer, report };
};

export default {
  generateReport,
  generateReportPdf,
};

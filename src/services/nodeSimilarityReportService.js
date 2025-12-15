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
  const rowHeight = options.rowHeight || 20;
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);

  rows.forEach((row, rowIndex) => {
    let x = startX;
    const isHeader = options.header && rowIndex === 0;
    const isBold = options.boldRows?.includes(rowIndex);

    row.forEach((cell, colIndex) => {
      const width = colWidths[colIndex] || 100;
      const cellText = cell ?? '';

      // Determinar color de fondo
      let bgColor = '#ffffff';
      if (isHeader) {
        bgColor = options.headerBg || COLORS.accent;
      } else if (options.rowBgColors?.[rowIndex]) {
        bgColor = options.rowBgColors[rowIndex];
      } else if (options.rowBg) {
        const bgIndex = (rowIndex - 1) % options.rowBg.length;
        bgColor = options.rowBg[bgIndex];
      }

      // Dibujar fondo
      doc.rect(x, startY + rowIndex * rowHeight, width, rowHeight).fill(bgColor);

      // Determinar estilo de texto
      const textColor = isHeader ? '#ffffff' : (options.textColor || '#2c3e50');
      const fontName = (isHeader || isBold) ? 'Helvetica-Bold' : 'Helvetica';
      const fontSize = isHeader ? 12 : (options.fontSize || 10);

      // Dibujar texto
      doc
        .fillColor(textColor)
        .font(fontName)
        .fontSize(fontSize)
        .text(String(cellText), x + 8, startY + rowIndex * rowHeight + 6, {
          width: width - 16,
          align: options.align?.[colIndex] || 'left',
          lineBreak: false,
          ellipsis: true
        });

      // Dibujar borde vertical
      doc
        .strokeColor('#000000')
        .lineWidth(1)
        .moveTo(x, startY + rowIndex * rowHeight)
        .lineTo(x, startY + (rowIndex + 1) * rowHeight)
        .stroke();

      x += width;
    });

    // Borde vertical derecho
    doc
      .strokeColor('#000000')
      .lineWidth(1)
      .moveTo(startX + totalWidth, startY + rowIndex * rowHeight)
      .lineTo(startX + totalWidth, startY + (rowIndex + 1) * rowHeight)
      .stroke();

    // Línea horizontal
    doc
      .strokeColor('#000000')
      .lineWidth(1)
      .moveTo(startX, startY + rowIndex * rowHeight)
      .lineTo(startX + totalWidth, startY + rowIndex * rowHeight)
      .stroke();
  });

  // Última línea horizontal
  doc
    .strokeColor('#000000')
    .lineWidth(1)
    .moveTo(startX, startY + rows.length * rowHeight)
    .lineTo(startX + totalWidth, startY + rows.length * rowHeight)
    .stroke();

  // Restaurar posición X y actualizar Y
  doc.x = startX;
  doc.y = startY + rows.length * rowHeight + 10;
};

const generatePdfBuffer = (report) =>
  new Promise((resolve, reject) => {
    // Convertir inches a puntos (1 inch = 72 puntos)
    const inchToPt = (inches) => inches * 72;

    const doc = new PDFDocument({
      size: 'LETTER',
      margins: {
        top: inchToPt(0.75),
        bottom: inchToPt(1),
        left: inchToPt(0.75),
        right: inchToPt(0.75)
      }
    });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    // Función para agregar pie de página
    let pageNumber = 1;
    const addFooter = () => {
      const bottom = doc.page.height - inchToPt(0.5);
      const currentY = doc.y;

      doc.fontSize(8).fillColor('#808080').font('Helvetica');
      doc.text(
        `Generado: ${new Date().toLocaleString('es-AR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}`,
        inchToPt(0.75),
        bottom,
        { width: doc.page.width - inchToPt(1.5), align: 'left' }
      );
      doc.text(
        `Página ${pageNumber}`,
        inchToPt(0.75),
        bottom,
        { width: doc.page.width - inchToPt(1.5), align: 'right' }
      );

      doc.y = currentY;
    };

    // Header principal
    doc.font('Helvetica-Bold').fontSize(24).fillColor('#1a1a1a');
    doc.text('Reporte de Similitud de Proyectos', { align: 'center' });
    doc.moveDown(0.5);

    // Resumen
    doc.moveDown(0.3);

    drawTable(
      doc,
      [
        ['Métrica', 'Valor'],
        ['Total de proyectos analizados', String(report.total_proyectos_analizados)],
        ['Grupos con proyectos 100% idénticos', String(report.total_grupos_identicos)],
        ['Casos de copias parciales detectados', String(report.total_copias_parciales)],
        ['Fecha de generación', new Date(report.generado).toLocaleString('es-AR')],
      ],
      [inchToPt(4), inchToPt(2)],
      {
        header: true,
        rowBg: ['#ffffff', '#ecf0f1'],
        headerBg: '#3498db',
      }
    );

    // Alerta si hay casos significativos
    if (report.total_grupos_identicos > 0 || report.total_copias_parciales > 5) {
      doc.fontSize(12).fillColor('#c0392b').font('Helvetica-Bold');
      doc.text('ALERTA: Se detectaron casos significativos de similitud entre proyectos', {
        align: 'left',
        indent: 20
      });
      doc.moveDown(0.5);
    }

    doc.moveDown(0.5);

    // Proyectos idénticos
    const identicos = report.proyectos_identicos || [];
    doc.fontSize(16).fillColor('#2c3e50').font('Helvetica-Bold');

    if (!identicos.length) {
      doc.text('Proyectos 100% Identicos');
      doc.moveDown(0.3);
      doc.fontSize(11).fillColor('#27ae60').font('Helvetica-Bold');
      doc.text('No se detectaron proyectos completamente identicos.', { indent: 15 });
      doc.moveDown(0.5);
    } else {
      doc.text(`Proyectos 100% Identicos (${identicos.length} grupos)`);
      doc.moveDown(0.3);

      identicos.forEach((grupo, idx) => {
        const grupoRows = [
          [`Grupo ${idx + 1}`, ''],
          ['Alumnos involucrados', `${grupo.alumnos?.length || 0} estudiantes`],
          ['Hash del proyecto', grupo.hash_proyecto?.substring(0, 16) + '...' || 'N/A'],
          ['Archivos idénticos', String(grupo.archivos_identicos || 0)],
        ];

        // Agregar alumnos
        (grupo.alumnos || []).forEach((alumno, i) => {
          grupoRows.push([`  ${i + 1}.`, alumno]);
        });

        const rowBgColors = {};
        rowBgColors[0] = '#e74c3c'; // Título
        for (let i = 1; i <= 3; i++) rowBgColors[i] = '#fadbd8'; // Info
        for (let i = 4; i < grupoRows.length; i++) rowBgColors[i] = '#fff5f5'; // Alumnos

        drawTable(doc, grupoRows, [inchToPt(1.5), inchToPt(4.5)], {
          rowBgColors,
          boldRows: [0],
          fontSize: 9
        });

        doc.moveDown(0.3);
      });

      doc.moveDown(0.5);
    }

    // Copias parciales
    doc.fontSize(16).fillColor('#2c3e50').font('Helvetica-Bold');
    const copiasRelevantes = (report.copias_parciales || []).filter(c => c.porcentaje_similitud >= 50);

    if (!copiasRelevantes.length) {
      doc.text('Copias Parciales');
      doc.moveDown(0.3);
      doc.fontSize(11).fillColor('#27ae60').font('Helvetica-Bold');
      doc.text('No se detectaron copias parciales significativas.', { indent: 15 });
      doc.moveDown(0.5);
    } else {
      doc.text(`Copias Parciales (>=50% similitud) - ${copiasRelevantes.length} casos`);
      doc.moveDown(0.3);

      copiasRelevantes.forEach((copia, idx) => {
        // Determinar color según severidad
        let headerBg = '#f39c12'; // Amarillo por defecto
        if (copia.porcentaje_similitud >= 80) {
          headerBg = '#e74c3c'; // Rojo
        } else if (copia.porcentaje_similitud >= 65) {
          headerBg = '#e67e22'; // Naranja
        }

        const casoRows = [
          [`Caso ${idx + 1}`, ''],
          ['Estudiantes', `${copia.alumnos?.[0] || ''} ↔ ${copia.alumnos?.[1] || ''}`],
          ['Similitud', `${copia.porcentaje_similitud}%`],
          ['Archivos copiados', `${copia.total_archivos_comunes} archivos`],
        ];

        // Agregar archivos (máximo 5)
        const archivos = copia.archivos_copiados || [];
        if (archivos.length > 0) {
          casoRows.push(['Archivos detectados:', '']);
          archivos.slice(0, 5).forEach(archivo => {
            const nombre = archivo.nombre?.split(/[/\\]/).pop() || '';
            casoRows.push(['', `• ${nombre}`]);
          });

          if (archivos.length > 5) {
            casoRows.push(['', `... y ${archivos.length - 5} más`]);
          }
        }

        const rowBgColors = {};
        rowBgColors[0] = headerBg; // Título con color según severidad
        for (let i = 1; i <= 3; i++) rowBgColors[i] = '#fef5e7'; // Info principal
        for (let i = 4; i < casoRows.length; i++) rowBgColors[i] = '#ffffff'; // Archivos

        drawTable(doc, casoRows, [inchToPt(1.5), inchToPt(4.5)], {
          rowBgColors,
          boldRows: [0],
          fontSize: 9
        });

        doc.moveDown(0.2);

        // Salto de página cada 3 casos solo si queda contenido y hay espacio insuficiente
        if ((idx + 1) % 3 === 0 && idx < copiasRelevantes.length - 1 && doc.y > doc.page.height - 200) {
          doc.addPage();
          pageNumber++;
        }
      });

      doc.moveDown(0.5);
    }

    // Archivos más copiados
    if (report.archivos_mas_copiados?.length) {
      doc.fontSize(16).fillColor('#2c3e50').font('Helvetica-Bold');
      doc.text('Archivos Mas Copiados (Top 10)');
      doc.moveDown(0.3);

      const tableRows = [['#', 'Archivo', 'Copias', 'Estudiantes (muestra)']];
      report.archivos_mas_copiados.slice(0, 10).forEach((file, idx) => {
        const nombre = file.archivo?.split(/[/\\]/).pop() || file.archivo || '';
        const students = file.aparece_en?.slice(0, 3).join(', ') || '';
        const extra = file.total_copias > 3 ? `... (+${file.total_copias - 3})` : '';

        tableRows.push([
          String(idx + 1),
          nombre,
          String(file.total_copias),
          `${students}${extra}`,
        ]);
      });

      drawTable(doc, tableRows, [inchToPt(0.5), inchToPt(2), inchToPt(0.8), inchToPt(2.7)], {
        header: true,
        rowBg: ['#ffffff', '#f8f9fa'],
        headerBg: '#9b59b6',
        fontSize: 8,
        align: ['center', 'left', 'center', 'left']
      });
    }

    // Footer final
    doc.moveDown(1);
    doc.fontSize(10).fillColor('#2c3e50').font('Helvetica');
    doc.text('-- Fin del Reporte --', { align: 'center' });

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

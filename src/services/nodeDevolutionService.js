/**
 * Generador de PDFs de devolución en Node (basado en generar_pdfs.py de referencia).
 */
import axios from 'axios';
import PDFDocument from 'pdfkit';
import archiver from 'archiver';
import { PassThrough } from 'stream';

const ensureWebhookUrl = (overrideUrl) => {
  const webhook = overrideUrl || process.env.N8N_WEBHOOK_GET_CORRECTIONS || process.env.N8N_WEBHOOK_URL;
  if (!webhook) {
    throw new Error('N8N_WEBHOOK_GET_CORRECTIONS no está configurada en .env');
  }
  return webhook;
};

const fetchCorrections = async (webhookUrl, spreadsheetId, sheetId, driveFolderId, studentName) => {
  const payload = { spreadsheet_id: spreadsheetId };
  if (sheetId) payload.sheet_id = sheetId;
  if (driveFolderId) payload.drive_folder_id = driveFolderId;
  if (studentName) payload.student_name = studentName;

  const response = await axios.post(webhookUrl, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Webhook devolvió error');
  }
  const data = response.data.data;
  if (!Array.isArray(data)) {
    throw new Error('Respuesta inesperada del webhook');
  }
  return data;
};

// ===== Parsers basados en generar_pdfs.py =====
const parsearCriterios = (texto) => {
  if (!texto) return [];
  let t = String(texto);
  t = t.replace(/✅/g, '||OK||')
    .replace(/❌/g, '||ERROR||')
    .replace(/⚠️/g, '||WARNING||')
    .replace(/⚠/g, '||WARNING||');

  const partes = t.split('||');
  const items = [];
  let estado = null;
  for (const parte of partes) {
    if (parte === 'OK') estado = 'ok';
    else if (parte === 'ERROR') estado = 'error';
    else if (parte === 'WARNING') estado = 'warning';
    else if (estado && parte.trim()) {
      const criterio = parte.trim();
      const [titulo = criterio, descripcion = ''] = criterio.split('·');
      items.push({ estado, titulo: titulo.trim(), descripcion: descripcion.trim() });
    }
  }
  return items;
};

const parsearFortalezas = (texto) => {
  if (!texto) return [];
  return texto
    .replace(/🌟/g, '||STAR||')
    .split('||STAR||')
    .map((s) => s.trim())
    .filter(Boolean);
};

const parsearRecomendaciones = (texto) => {
  if (!texto) return [];
  const t = String(texto);
  const numeric = t.split(/(\d+)\.\s*/);
  if (numeric.length > 2) {
    const out = [];
    for (let i = 1; i < numeric.length; i += 2) {
      const rec = numeric[i + 1]?.trim();
      if (rec) out.push(rec);
    }
    if (out.length) return out;
  }
  const toolSplit = t
    .replace(/🛠️/g, '||SEP||')
    .replace(/🛠/g, '||SEP||')
    .replace(/🔧/g, '||SEP||')
    .split('||SEP||')
    .map((s) => s.trim())
    .filter(Boolean);
  if (toolSplit.length) return toolSplit;
  return [t.trim()].filter(Boolean);
};

// ===== PDF helpers =====
const criteriaColor = (estado) => {
  switch (estado) {
    case 'ok':
      return '#059669';  // Verde (igual que Python)
    case 'error':
      return '#dc2626';  // Rojo (igual que Python)
    case 'warning':
      return '#f59e0b';  // Naranja/Amarillo (igual que Python)
    default:
      return '#34495e';
  }
};

const buildPdf = (record, meta) =>
  new Promise((resolve, reject) => {
    // Convertir mm a puntos (1mm = 2.834645669 puntos)
    const mmToPt = (mm) => mm * 2.834645669;

    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: mmToPt(15),
        bottom: mmToPt(15),
        left: mmToPt(15),
        right: mmToPt(15)
      },
      info: {
        Title: `Devolucion - ${record.alumno || record.student_name || ''}`,
        Author: 'Corrección Automática',
      },
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const alumno =
      record.alumno ||
      record.Alumno ||
      record.student_name ||
      record.student ||
      record.ALUMNO ||
      'Sin_nombre';
    const nota = record.puntaje_total || record.nota || record.grade || '';
    const criterios = parsearCriterios(record.criterios || record['Resumen por criterios'] || record.resumen_por_criterios);
    const fortalezas = parsearFortalezas(record.fortalezas || record.Fortalezas || record.FORTALEZAS);
    const recomendaciones = parsearRecomendaciones(record.recomendaciones || record.Recomendaciones || record.RECOMENDACIONES);

    // Función auxiliar para agregar espaciado vertical (en mm)
    const addSpace = (mm) => doc.moveDown(mm / 5); // Aproximación para moveDown

    // Símbolos para criterios
    const getSymbol = (estado) => {
      switch (estado) {
        case 'ok': return '[OK]';
        case 'error': return '[X]';
        case 'warning': return '[!]';
        default: return '•';
      }
    };

    // Título principal
    doc.fontSize(20).fillColor('#1f2937').font('Helvetica-Bold').text('Devolucion de Correccion', {
      align: 'center',
    });
    addSpace(5);

    // Información del alumno
    doc.fontSize(12).fillColor('#1f2937').font('Helvetica');
    doc.text(`Alumno: ${alumno}`, { bold: true });

    // Nota/Puntaje destacado
    if (nota) {
      addSpace(2);
      doc.fontSize(14).fillColor('#059669').font('Helvetica-Bold');
      doc.text(`Puntaje Total: ${nota}`, { align: 'center' });
    }

    addSpace(3);

    // Criterios de Evaluación
    if (criterios.length) {
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#374151').text('Criterios de Evaluacion');
      addSpace(2);

      doc.font('Helvetica').fontSize(11);
      criterios.forEach((c) => {
        const simbolo = getSymbol(c.estado);
        const color = criteriaColor(c.estado);

        // Título del criterio con símbolo
        doc.fillColor(color).text(`${simbolo} ${c.titulo}`, {
          indent: 15,
          continued: false,
        });

        // Descripción (si existe) con indentación adicional
        if (c.descripcion) {
          doc.fillColor('#374151').fontSize(11);
          doc.text(`   ${c.descripcion}`, {
            indent: 15,
            continued: false
          });
        }

        addSpace(0.8);
      });

      addSpace(2);
    }

    // Fortalezas Detectadas
    if (fortalezas.length) {
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#374151').text('Fortalezas Detectadas');
      addSpace(1);

      doc.font('Helvetica').fontSize(11).fillColor('#374151');
      fortalezas.forEach((f) => {
        doc.text(`• ${f}`, {
          indent: 15,
          continued: false
        });
        addSpace(0.5);
      });

      addSpace(2);
    }

    // Recomendaciones
    if (recomendaciones.length) {
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#374151').text('Recomendaciones');
      addSpace(1);

      doc.font('Helvetica').fontSize(11).fillColor('#374151');
      recomendaciones.forEach((rec, idx) => {
        doc.text(`${idx + 1}. ${rec}`, {
          indent: 15,
          continued: false
        });
        addSpace(0.5);
      });
    }

    // Pie de página con fecha
    addSpace(2);
    const fecha = new Date().toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    doc.fontSize(9).fillColor('#6b7280').font('Helvetica').text(fecha, {
      align: 'center'
    });

    doc.end();
  });

const createZipBuffer = (namedBuffers) =>
  new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const pass = new PassThrough();
    const chunks = [];
    pass.on('data', (c) => chunks.push(c));
    pass.on('end', () => resolve(Buffer.concat(chunks)));
    pass.on('error', reject);

    archive.on('error', reject);
    archive.pipe(pass);

    namedBuffers.forEach(({ name, buffer }) => {
      archive.append(buffer, { name });
    });

    archive.finalize();
  });

export const generateIndividualPdf = async (
  commissionId,
  rubricId,
  studentName,
  spreadsheetId,
  sheetId,
  driveFolderId,
  webhookUrlOverride
) => {
  if (!spreadsheetId) throw new Error('spreadsheetId es requerido');
  const webhookUrl = ensureWebhookUrl(webhookUrlOverride);
  const rows = await fetchCorrections(webhookUrl, spreadsheetId, sheetId, driveFolderId, studentName);
  if (!rows.length) {
    const err = new Error('No se encontraron datos para el alumno indicado');
    err.statusCode = 404;
    throw err;
  }
  const meta = { commission_id: commissionId, rubric_id: rubricId, spreadsheet_id: spreadsheetId, sheet_id: sheetId, drive_folder_id: driveFolderId };
  const buffer = await buildPdf(rows[0], meta);
  return { buffer };
};

export const generateBatchPdfs = async (
  commissionId,
  rubricId,
  spreadsheetId,
  sheetId,
  driveFolderId,
  webhookUrlOverride
) => {
  if (!spreadsheetId) throw new Error('spreadsheetId es requerido');
  const webhookUrl = ensureWebhookUrl(webhookUrlOverride);
  const rows = await fetchCorrections(webhookUrl, spreadsheetId, sheetId, driveFolderId, null);
  if (!rows.length) {
    const err = new Error('No se encontraron filas en la planilla');
    err.statusCode = 404;
    throw err;
  }
  const meta = { commission_id: commissionId, rubric_id: rubricId, spreadsheet_id: spreadsheetId, sheet_id: sheetId, drive_folder_id: driveFolderId };
  const namedBuffers = [];
  for (const row of rows) {
    const alumno =
      row.alumno ||
      row.Alumno ||
      row.student_name ||
      row.student ||
      row.ALUMNO ||
      'alumno';
    const safe = String(alumno).trim().replace(/[^a-zA-Z0-9-_]+/g, '_') || 'alumno';
    const buffer = await buildPdf(row, meta);
    namedBuffers.push({ name: `${safe}_devolucion.pdf`, buffer });
  }
  const zipBuffer = await createZipBuffer(namedBuffers);
  return { buffer: zipBuffer };
};

export default {
  generateIndividualPdf,
  generateBatchPdfs,
};

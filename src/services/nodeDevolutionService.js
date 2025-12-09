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
      return '#2ecc71';
    case 'error':
      return '#e74c3c';
    case 'warning':
      return '#f39c12';
    default:
      return '#34495e';
  }
};

const buildPdf = (record, meta) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
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
    const fortalezas = parsearFortalezas(record.fortalezas);
    const recomendaciones = parsearRecomendaciones(record.recomendaciones);

    // Título
    doc.fontSize(20).fillColor('#1f2937').font('Helvetica-Bold').text('Devolución de Corrección', {
      align: 'center',
    });
    doc.moveDown(1);

    // Meta info
    doc.fontSize(11).fillColor('#4b5563').font('Helvetica');
    doc.text(`Alumno: ${alumno}`);
    doc.moveDown(0.5);

    if (nota) {
      doc.fontSize(16).fillColor('#059669').font('Helvetica-Bold');
      doc.text(`Puntaje total: ${nota}`, { align: 'center' });
      doc.moveDown(1);
    }

    // Criterios
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#1f2937').text('Criterios de Evaluación');
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(11);
    criterios.forEach((c) => {
      doc.fillColor(criteriaColor(c.estado)).text(`${c.titulo}`, { continued: false });
      if (c.descripcion) {
        doc.fillColor('#6b7280').fontSize(10).text(c.descripcion, { indent: 10 });
      }
      doc.moveDown(0.2).fontSize(11).fillColor('#1f2937');
    });
    doc.moveDown(0.5);

    // Fortalezas
    if (fortalezas.length) {
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#1f2937').text('Fortalezas');
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(11).fillColor('#374151');
      fortalezas.forEach((f) => doc.text(`• ${f}`));
      doc.moveDown(0.5);
    }

    // Recomendaciones
    if (recomendaciones.length) {
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#1f2937').text('Recomendaciones');
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(11).fillColor('#374151');
      recomendaciones.forEach((rec, idx) => doc.text(`${idx + 1}. ${rec}`));
      doc.moveDown(0.5);
    }
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

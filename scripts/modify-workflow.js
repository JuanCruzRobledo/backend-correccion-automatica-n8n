/**
 * Script para modificar el workflow flujo_correccion_masiva.json
 * FASE 2: Eliminar nodos de creación de spreadsheet
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Leer el workflow
const workflowPath = path.join(__dirname, '../../n8n-workflows/flujo_correccion_masiva.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

console.log(`📄 Workflow cargado: ${workflow.nodes.length} nodos, ${Object.keys(workflow.connections).length} conexiones`);

// Nombres de los nodos a eliminar
const nodesToDelete = [
  'Search files and folders23',
  'If',
  'Create spreadsheet',
  'Move file'
];

// 1. Eliminar nodos
const originalNodeCount = workflow.nodes.length;
workflow.nodes = workflow.nodes.filter(node => {
  if (nodesToDelete.includes(node.name)) {
    console.log(`❌ Eliminando nodo: ${node.name}`);
    return false;
  }
  return true;
});

console.log(`✅ Nodos eliminados: ${originalNodeCount - workflow.nodes.length}`);

// 2. Eliminar conexiones de los nodos eliminados
for (const nodeName of nodesToDelete) {
  if (workflow.connections[nodeName]) {
    delete workflow.connections[nodeName];
    console.log(`❌ Conexiones eliminadas del nodo: ${nodeName}`);
  }
}

// 3. Eliminar conexiones HACIA los nodos eliminados
for (const [sourceName, connections] of Object.entries(workflow.connections)) {
  if (connections.main) {
    connections.main = connections.main.map(connectionArray => {
      if (!connectionArray) return connectionArray;
      return connectionArray.filter(connection => {
        if (nodesToDelete.includes(connection.node)) {
          console.log(`❌ Eliminando conexión: ${sourceName} → ${connection.node}`);
          return false;
        }
        return true;
      });
    });
  }
}

// 4. Modificar el nodo "Append row in sheet2" para que use $('DATOS2').item.json.spreadsheet_id
const appendRowNode = workflow.nodes.find(n => n.name === 'Append row in sheet2');
if (appendRowNode) {
  console.log(`🔧 Modificando nodo: ${appendRowNode.name}`);

  // Buscar el parámetro documentId
  if (appendRowNode.parameters && appendRowNode.parameters.documentId) {
    const oldValue = appendRowNode.parameters.documentId.value;
    appendRowNode.parameters.documentId.value = "={{ $('DATOS2').item.json.spreadsheet_id }}";

    console.log(`  ANTES: ${oldValue}`);
    console.log(`  DESPUÉS: ${appendRowNode.parameters.documentId.value}`);
  } else {
    console.warn(`⚠️ No se encontró el parámetro documentId en el nodo`);
  }
} else {
  console.warn(`⚠️ No se encontró el nodo "Append row in sheet2"`);
}

// 5. Guardar el workflow modificado
fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2), 'utf8');
console.log(`\n✅ Workflow modificado guardado en: ${workflowPath}`);
console.log(`📊 Resumen:`);
console.log(`   - Nodos totales: ${workflow.nodes.length}`);
console.log(`   - Nodos eliminados: ${originalNodeCount - workflow.nodes.length}`);
console.log(`   - Conexiones actualizadas: ✓`);
console.log(`\n🎯 Siguiente paso: Importar el workflow en n8n y activarlo`);

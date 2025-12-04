/**
 * Batch Consolidator Service
 * Procesa múltiples entregas de alumnos simultáneamente
 */
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import AdmZip from 'adm-zip';
import ConsolidatorService from './consolidatorService.js';
import SimilarityDetectorService from './similarityDetectorService.js';
import ProjectHash from '../models/ProjectHash.js';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);

class BatchConsolidatorService {
  /**
   * Sanitiza el nombre del alumno
   * Remueve sufijos como _123456_assignsubmission_file o _assignsubmission_file
   * @param {String} rawName - Nombre de la carpeta
   * @returns {String} - Nombre sanitizado
   */
  static sanitizeStudentName(rawName) {
    if (!rawName) {
      return '';
    }

    // Reemplazar saltos de línea y tabs por espacios
    let name = rawName.replace(/[\r\n\t]+/g, ' ');

    // Remover sufijos tipo _123456_assignsubmission_file o _assignsubmission_file
    name = name.replace(/_\d+_assignsubmission_file$/i, '');
    name = name.replace(/_assignsubmission_file$/i, '');

    // Reemplazar múltiples espacios por uno y limpiar espacios alrededor
    name = name.replace(/\s+/g, ' ').trim();

    return name || rawName.trim();
  }

  /**
   * Encuentra archivos ZIP en una carpeta
   * @param {String} dirPath - Ruta de la carpeta
   * @returns {Array<String>} - Array de rutas de archivos ZIP
   */
  static async findZipFiles(dirPath) {
    try {
      const entries = await readdir(dirPath, { withFileTypes: true });
      const zipFiles = entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.zip'))
        .map((entry) => path.join(dirPath, entry.name));

      return zipFiles;
    } catch (error) {
      return [];
    }
  }

  /**
   * Extrae un archivo ZIP
   * @param {String} zipPath - Ruta del archivo ZIP
   * @param {String} extractTo - Carpeta de destino
   * @returns {String} - Ruta del proyecto extraído
   */
  static extractZip(zipPath, extractTo) {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractTo, true);

    // Buscar la carpeta raíz del proyecto (a veces el ZIP tiene una carpeta contenedora)
    const extractedContents = fs.readdirSync(extractTo);

    if (
      extractedContents.length === 1 &&
      fs.statSync(path.join(extractTo, extractedContents[0])).isDirectory()
    ) {
      return path.join(extractTo, extractedContents[0]);
    }

    return extractTo;
  }

  /**
   * Procesa una entrega individual
   * @param {String} studentDir - Carpeta del alumno
   * @param {String} tempDir - Carpeta temporal
   * @param {Object} options - Opciones de consolidación
   * @returns {Object} - Resultado del procesamiento
   */
  static async processStudentSubmission(studentDir, tempDir, options) {
    const rawStudentName = path.basename(studentDir);
    const studentName = this.sanitizeStudentName(rawStudentName);

    try {
      // 1. Buscar archivo ZIP
      const zipFiles = await this.findZipFiles(studentDir);

      if (zipFiles.length === 0) {
        return {
          student_name: studentName,
          status: 'error',
          error: 'No se encontró archivo ZIP',
        };
      }

      if (zipFiles.length > 1) {
        console.warn(`⚠️  Múltiples ZIPs en ${studentName}, usando el primero: ${zipFiles[0]}`);
      }

      const zipFile = zipFiles[0];

      // 2. Extraer ZIP
      const studentTempDir = path.join(tempDir, `extracted_${Date.now()}_${studentName}`);
      await mkdir(studentTempDir, { recursive: true });

      console.log(`   📦 Extrayendo: ${path.basename(zipFile)}`);
      const projectPath = this.extractZip(zipFile, studentTempDir);

      // 3. Consolidar proyecto
      console.log(`   🔄 Consolidando proyecto...`);
      const consolidationResult = await ConsolidatorService.consolidateProject(
        projectPath,
        options.mode || '5',
        options.customExtensions || null,
        options.includeTests !== false
      );

      if (!consolidationResult.success) {
        throw new Error('Error en consolidación: ' + consolidationResult.message);
      }

      // 4. Extraer archivos .java (o del lenguaje principal) y calcular hashes
      const javaFiles = this.extractJavaFilesFromContent(consolidationResult.content);

      if (Object.keys(javaFiles).length === 0) {
        return {
          student_name: studentName,
          status: 'warning',
          warning: 'No se encontraron archivos .java para análisis de similitud',
          stats: consolidationResult.stats,
          content: consolidationResult.content,
        };
      }

      // 5. Calcular hashes
      const fileHashes = SimilarityDetectorService.calculateFileHashes(javaFiles);
      const projectHash = SimilarityDetectorService.calculateProjectHash(javaFiles);

      console.log(`   🔑 Hash del proyecto: ${projectHash.substring(0, 8)}...`);

      // 6. Limpiar carpeta temporal
      fs.rmSync(studentTempDir, { recursive: true, force: true });

      return {
        student_name: studentName,
        status: 'success',
        stats: consolidationResult.stats,
        content: consolidationResult.content,
        project_hash: projectHash,
        file_hashes: fileHashes,
      };
    } catch (error) {
      console.error(`   ❌ Error procesando ${studentName}:`, error.message);
      return {
        student_name: studentName,
        status: 'error',
        error: error.message,
      };
    }
  }

  /**
   * Extrae contenido de archivos .java del markdown consolidado
   * @param {String} consolidatedContent - Contenido consolidado en markdown
   * @returns {Object} - Objeto con {nombreArchivo: contenido}
   */
  static extractJavaFilesFromContent(consolidatedContent) {
    const javaFiles = {};

    // Regex para encontrar bloques de código Java
    // Formato: ### 📄 `path/to/File.java`\n\n**Líneas:** X | **Tipo:** .java\n\n```java\n<contenido>\n```
    const regex = /### 📄 `([^`]+\.java)`\s+\*\*Líneas:\*\* \d+ \| \*\*Tipo:\*\* \.java\s+```java\s+([\s\S]*?)```/gi;

    let match;
    while ((match = regex.exec(consolidatedContent)) !== null) {
      const fileName = match[1];
      const content = match[2].trim();
      javaFiles[fileName] = content;
    }

    return javaFiles;
  }

  /**
   * Procesa múltiples entregas en batch
   * @param {String} entregasZipPath - Ruta al ZIP con todas las entregas
   * @param {String} commissionId - ID de la comisión
   * @param {String} rubricId - ID de la rúbrica
   * @param {Object} options - Opciones de consolidación
   * @returns {Object} - Resultados del procesamiento batch
   */
  static async processBatchSubmissions(entregasZipPath, commissionId, rubricId, options = {}) {
    const tempDir = path.join(process.cwd(), 'uploads', 'temp', `batch_${Date.now()}`);
    const outputDir = path.join(process.cwd(), 'uploads', 'consolidated', `${commissionId}_${rubricId}`);

    try {
      // 1. Crear directorios temporales
      await mkdir(tempDir, { recursive: true });
      await mkdir(outputDir, { recursive: true });

      // 2. Extraer ZIP principal
      console.log('📦 Extrayendo ZIP principal...');
      const entregasDir = this.extractZip(entregasZipPath, tempDir);

      // 3. Buscar carpeta "entregas" si existe
      let studentDirsPath = entregasDir;
      const subDirs = await readdir(entregasDir, { withFileTypes: true });
      const entregasSubDir = subDirs.find(
        (d) => d.isDirectory() && d.name.toLowerCase() === 'entregas'
      );

      if (entregasSubDir) {
        studentDirsPath = path.join(entregasDir, entregasSubDir.name);
      }

      // 4. Obtener carpetas de alumnos
      const studentDirEntries = await readdir(studentDirsPath, { withFileTypes: true });
      const studentDirs = studentDirEntries
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(studentDirsPath, entry.name));

      if (studentDirs.length === 0) {
        throw new Error('No se encontraron carpetas de alumnos en el ZIP');
      }

      console.log(`✅ Se encontraron ${studentDirs.length} entregas para procesar\n`);
      console.log('='.repeat(70));

      // 5. Procesar cada entrega
      const results = [];
      const projectHashesToSave = [];

      for (const studentDir of studentDirs) {
        const rawStudentName = path.basename(studentDir);
        const studentName = this.sanitizeStudentName(rawStudentName);

        console.log(`\n📂 Procesando: ${studentName}`);
        console.log('-'.repeat(70));

        const result = await this.processStudentSubmission(studentDir, tempDir, options);
        results.push(result);

        // Si fue exitoso, guardar archivo consolidado y preparar ProjectHash
        if (result.status === 'success' || result.status === 'warning') {
          // Guardar archivo consolidado en carpeta por alumno
          const studentOutputDir = path.join(outputDir, studentName);
          await mkdir(studentOutputDir, { recursive: true });

          const outputFilePath = path.join(studentOutputDir, 'entrega.txt');
          await writeFile(outputFilePath, result.content, 'utf-8');

          console.log(`   💾 Archivo guardado: ${path.relative(outputDir, outputFilePath)}`);

          // Preparar ProjectHash para guardar en MongoDB
          if (result.project_hash && result.file_hashes) {
            projectHashesToSave.push({
              commission_id: commissionId,
              rubric_id: rubricId,
              student_name: studentName.toLowerCase(),
              project_hash: result.project_hash,
              file_hashes: result.file_hashes,
              stats: {
                total_files: result.stats?.totalFiles || 0,
                total_lines: 0, // Se puede agregar si consolidatorService lo provee
                java_files: Object.keys(result.file_hashes).length,
                other_files: (result.stats?.totalFiles || 0) - Object.keys(result.file_hashes).length,
              },
              metadata: {
                project_name: result.stats?.projectName || studentName,
                mode: result.stats?.mode || options.mode || 'Proyecto completo',
                extensions: result.stats?.extensions || [],
                include_tests: options.includeTests !== false,
              },
            });
          }
        }

        console.log(`   📊 Estado: ${result.status}`);
      }

      // 6. Guardar ProjectHashes en MongoDB
      console.log('\n='.repeat(70));
      console.log('💾 Guardando hashes en MongoDB...');

      const savedProjectHashes = [];
      for (const projectHashData of projectHashesToSave) {
        try {
          const projectHash = await ProjectHash.findOrCreate(projectHashData);
          savedProjectHashes.push(projectHash);
          console.log(`   ✅ Hash guardado: ${projectHashData.student_name}`);
        } catch (error) {
          console.error(`   ❌ Error guardando hash de ${projectHashData.student_name}:`, error.message);
        }
      }

      // 7. Analizar similitudes
      console.log('\n='.repeat(70));
      console.log('🔍 Analizando similitudes...');

      const similarity = SimilarityDetectorService.detectSimilarities(savedProjectHashes);

      console.log(`   Proyectos 100% idénticos: ${similarity.identicalGroups.length} grupos`);
      console.log(`   Copias parciales detectadas: ${similarity.partialCopies.length} casos`);
      console.log(`   Archivos más copiados: ${similarity.mostCopiedFiles.length} archivos`);

      // 8. Limpiar directorio temporal
      console.log('\n🧹 Limpiando archivos temporales...');
      fs.rmSync(tempDir, { recursive: true, force: true });

      // 9. Retornar resultados
      const successful = results.filter((r) => r.status === 'success' || r.status === 'warning').length;
      const failed = results.filter((r) => r.status === 'error').length;

      console.log('\n='.repeat(70));
      console.log('📊 RESUMEN DEL PROCESAMIENTO');
      console.log('='.repeat(70));
      console.log(`✅ Exitosos: ${successful}`);
      console.log(`❌ Fallidos: ${failed}`);
      console.log(`📁 Total procesados: ${results.length}`);
      console.log(`\n💾 Archivos consolidados en: ${outputDir}`);
      console.log('='.repeat(70));

      return {
        success: true,
        total_processed: results.length,
        successful,
        failed,
        results,
        similarity,
        output_dir: outputDir,
      };
    } catch (error) {
      // Limpiar en caso de error
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }

      throw error;
    }
  }
}

export default BatchConsolidatorService;

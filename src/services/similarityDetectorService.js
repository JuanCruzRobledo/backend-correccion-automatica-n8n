/**
 * Similarity Detector Service
 * Detecta copias totales y parciales entre proyectos usando hashes SHA256
 */
import crypto from 'crypto';

class SimilarityDetectorService {
  /**
   * Calcula el hash SHA256 de un contenido normalizado
   * @param {String} content - Contenido del archivo
   * @returns {String} - Hash SHA256 en hexadecimal
   */
  static calculateFileHash(content) {
    if (!content || typeof content !== 'string') {
      return null;
    }

    // Normalizar contenido: remover espacios al inicio/final de líneas y líneas vacías
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const normalized = lines.join('\n');

    // Calcular hash SHA256
    return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
  }

  /**
   * Calcula el hash del proyecto completo
   * @param {Object} filesMap - Objeto con {nombreArchivo: contenido}
   * @returns {String} - Hash SHA256 del proyecto completo
   */
  static calculateProjectHash(filesMap) {
    if (!filesMap || typeof filesMap !== 'object') {
      return null;
    }

    // Ordenar archivos alfabéticamente para consistencia
    const sortedFiles = Object.keys(filesMap)
      .sort()
      .map((fileName) => {
        const content = filesMap[fileName];
        return `${fileName}:${content}`;
      })
      .join('');

    // Calcular hash SHA256
    return crypto.createHash('sha256').update(sortedFiles, 'utf8').digest('hex');
  }

  /**
   * Calcula hashes de múltiples archivos
   * @param {Object} filesMap - Objeto con {nombreArchivo: contenido}
   * @returns {Object} - Objeto con {nombreArchivo: hash}
   */
  static calculateFileHashes(filesMap) {
    if (!filesMap || typeof filesMap !== 'object') {
      return {};
    }

    const fileHashes = {};
    for (const [fileName, content] of Object.entries(filesMap)) {
      fileHashes[fileName] = this.calculateFileHash(content);
    }

    return fileHashes;
  }

  /**
   * Detecta similitudes entre múltiples proyectos
   * @param {Array<Object>} projectHashDocs - Array de documentos ProjectHash
   * @returns {Object} - Análisis completo de similitud
   */
  static detectSimilarities(projectHashDocs) {
    if (!Array.isArray(projectHashDocs) || projectHashDocs.length === 0) {
      return {
        identicalGroups: [],
        partialCopies: [],
        mostCopiedFiles: [],
      };
    }

    // 1. Encontrar proyectos 100% idénticos
    const identicalGroups = this.findIdenticalProjects(projectHashDocs);

    // 2. Encontrar copias parciales (excluyendo proyectos idénticos)
    const partialCopies = this.findPartialCopies(projectHashDocs);

    // 3. Encontrar archivos más copiados
    const mostCopiedFiles = this.findMostCopiedFiles(projectHashDocs);

    return {
      identicalGroups,
      partialCopies,
      mostCopiedFiles,
    };
  }

  /**
   * Encuentra proyectos 100% idénticos (mismo hash de proyecto)
   * @param {Array<Object>} projectHashDocs - Array de documentos ProjectHash
   * @returns {Array<Object>} - Grupos de proyectos idénticos
   */
  static findIdenticalProjects(projectHashDocs) {
    const hashGroups = {};

    // Agrupar por project_hash
    for (const project of projectHashDocs) {
      const hash = project.project_hash;
      if (!hashGroups[hash]) {
        hashGroups[hash] = [];
      }
      hashGroups[hash].push(project);
    }

    // Filtrar solo grupos con más de 1 proyecto (copias)
    const identicalGroups = [];

    for (const [projectHash, projects] of Object.entries(hashGroups)) {
      if (projects.length > 1) {
        // Obtener datos del primer proyecto (todos son iguales)
        const firstProject = projects[0];

        identicalGroups.push({
          project_hash: projectHash,
          students: projects.map((p) => p.student_name),
          files_count: firstProject.stats?.total_files || 0,
          lines_count: firstProject.stats?.total_lines || 0,
          percentage: 100,
        });
      }
    }

    return identicalGroups;
  }

  /**
   * Encuentra copias parciales (≥50% similitud pero no 100% idénticos)
   * @param {Array<Object>} projectHashDocs - Array de documentos ProjectHash
   * @returns {Array<Object>} - Pares de proyectos con copias parciales
   */
  static findPartialCopies(projectHashDocs) {
    const partialCopies = [];
    const processed = new Set(); // Para evitar duplicados A-B y B-A

    for (let i = 0; i < projectHashDocs.length; i++) {
      for (let j = i + 1; j < projectHashDocs.length; j++) {
        const projectA = projectHashDocs[i];
        const projectB = projectHashDocs[j];

        // Saltar si son proyectos 100% idénticos
        if (projectA.project_hash === projectB.project_hash) {
          continue;
        }

        // Crear clave única para este par
        const pairKey = [projectA.student_name, projectB.student_name].sort().join('|');
        if (processed.has(pairKey)) {
          continue;
        }
        processed.add(pairKey);

        // Obtener hashes de archivos
        const fileHashesA = projectA.getFileHashesAsObject();
        const fileHashesB = projectB.getFileHashesAsObject();

        // Crear sets de hashes únicos
        const hashesA = new Set(Object.values(fileHashesA));
        const hashesB = new Set(Object.values(fileHashesB));

        // Encontrar hashes comunes
        const commonHashes = [...hashesA].filter((h) => hashesB.has(h));

        // Si tienen al menos 3 archivos en común
        if (commonHashes.length >= 3) {
          // Calcular porcentaje de similitud
          const totalFilesMin = Math.min(hashesA.size, hashesB.size);
          const percentage =
            totalFilesMin > 0 ? Math.round((commonHashes.length / totalFilesMin) * 100) : 0;

          // Solo incluir si ≥50% similitud
          if (percentage >= 50) {
            // Construir lista de archivos copiados (un ejemplo por hash)
            const copiedFiles = [];
            for (const commonHash of commonHashes.slice(0, 10)) {
              // Máximo 10
              // Encontrar un archivo con este hash en projectA
              for (const [fileName, hash] of Object.entries(fileHashesA)) {
                if (hash === commonHash) {
                  copiedFiles.push({
                    name: fileName,
                    hash: commonHash.substring(0, 16) + '...',
                  });
                  break; // Solo necesitamos un ejemplo
                }
              }
            }

            partialCopies.push({
              students: [projectA.student_name, projectB.student_name],
              copied_files: copiedFiles,
              percentage: percentage,
              total_common_files: commonHashes.length,
            });
          }
        }
      }
    }

    // Ordenar por porcentaje descendente
    return partialCopies.sort((a, b) => b.percentage - a.percentage);
  }

  /**
   * Encuentra los archivos más copiados (que aparecen en 3+ proyectos)
   * @param {Array<Object>} projectHashDocs - Array de documentos ProjectHash
   * @returns {Array<Object>} - Top archivos más copiados
   */
  static findMostCopiedFiles(projectHashDocs) {
    const fileHashMap = {}; // { hash: { fileName: String, students: Set } }

    // Mapear hashes de archivos individuales
    for (const project of projectHashDocs) {
      const fileHashes = project.getFileHashesAsObject();

      for (const [fileName, hash] of Object.entries(fileHashes)) {
        if (!fileHashMap[hash]) {
          fileHashMap[hash] = {
            fileName: fileName,
            students: new Set(),
          };
        }
        fileHashMap[hash].students.add(project.student_name);
      }
    }

    // Filtrar archivos que aparecen en 3+ proyectos
    const mostCopiedFiles = [];

    for (const [hash, data] of Object.entries(fileHashMap)) {
      if (data.students.size >= 3) {
        // Usar el nombre de archivo más común (o el primero)
        const fileName = data.fileName.split('/').pop() || data.fileName; // Solo nombre, sin path

        mostCopiedFiles.push({
          file_name: fileName,
          hash: hash.substring(0, 16) + '...',
          occurrences: data.students.size,
          students: Array.from(data.students).slice(0, 5), // Máximo 5 ejemplos
        });
      }
    }

    // Ordenar por número de copias descendente
    return mostCopiedFiles.sort((a, b) => b.occurrences - a.occurrences).slice(0, 20); // Top 20
  }

  /**
   * Analiza similitud entre dos proyectos específicos
   * @param {Object} projectA - Documento ProjectHash A
   * @param {Object} projectB - Documento ProjectHash B
   * @returns {Object} - Análisis de similitud entre ambos
   */
  static analyzePairSimilarity(projectA, projectB) {
    if (!projectA || !projectB) {
      return null;
    }

    // Si son idénticos (100%)
    if (projectA.project_hash === projectB.project_hash) {
      return {
        percentage: 100,
        identical: true,
        common_files: projectA.stats?.total_files || 0,
        files: [],
      };
    }

    // Obtener hashes de archivos
    const fileHashesA = projectA.getFileHashesAsObject();
    const fileHashesB = projectB.getFileHashesAsObject();

    const hashesA = new Set(Object.values(fileHashesA));
    const hashesB = new Set(Object.values(fileHashesB));

    const commonHashes = [...hashesA].filter((h) => hashesB.has(h));

    // Calcular porcentaje
    const totalFilesMin = Math.min(hashesA.size, hashesB.size);
    const percentage = totalFilesMin > 0 ? Math.round((commonHashes.length / totalFilesMin) * 100) : 0;

    // Encontrar archivos comunes
    const commonFiles = [];
    for (const commonHash of commonHashes.slice(0, 10)) {
      for (const [fileName, hash] of Object.entries(fileHashesA)) {
        if (hash === commonHash) {
          commonFiles.push(fileName);
          break;
        }
      }
    }

    return {
      percentage,
      identical: false,
      common_files: commonHashes.length,
      files: commonFiles,
    };
  }
}

export default SimilarityDetectorService;

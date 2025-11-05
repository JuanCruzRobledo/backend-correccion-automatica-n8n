/**
 * Consolidator Service
 * Servicio universal para consolidar proyectos en un único archivo de texto formato Markdown
 * Adaptado del script Python consolidator.py
 */
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

class ConsolidatorService {
  // Directorios que siempre se excluyen
  static EXCLUDED_DIRS = new Set([
    '.git', '.idea', '.vscode', '.settings', '.vs',
    'target', 'build', 'out', 'bin', 'dist',
    'node_modules', '.gradle', '.mvn',
    '__pycache__', '.pytest_cache', 'venv', 'env',
    '.next', 'coverage', '.nuxt'
  ]);

  // Extensiones binarias que se excluyen
  static BINARY_EXTENSIONS = new Set([
    '.class', '.jar', '.war', '.ear',
    '.zip', '.tar', '.gz', '.7z', '.rar',
    '.exe', '.dll', '.so', '.dylib',
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.mp3', '.mp4', '.avi', '.mov', '.wav',
    '.pyc', '.pyo', '.pyd'
  ]);

  // Modos de conversión predefinidos
  static CONVERSION_MODES = {
    '1': {
      name: 'Solo código fuente (Java)',
      description: 'Incluye únicamente archivos .java',
      extensions: new Set(['.java'])
    },
    '2': {
      name: 'Solo código fuente (JavaScript/TypeScript)',
      description: 'Incluye archivos .js, .jsx, .ts, .tsx',
      extensions: new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])
    },
    '3': {
      name: 'Solo código fuente (Python)',
      description: 'Incluye archivos .py',
      extensions: new Set(['.py'])
    },
    '4': {
      name: 'Proyecto web completo',
      description: 'Incluye HTML, CSS, JS, TS, JSON, etc.',
      extensions: new Set([
        '.html', '.css', '.scss', '.sass', '.less',
        '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
        '.json', '.yaml', '.yml', '.md', '.txt'
      ])
    },
    '5': {
      name: 'Proyecto completo (cualquier lenguaje)',
      description: 'Incluye código fuente y archivos de configuración',
      extensions: new Set([
        '.java', '.js', '.jsx', '.ts', '.tsx', '.py',
        '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs', '.rb', '.php',
        '.xml', '.properties', '.yaml', '.yml', '.json',
        '.gradle', '.kts', '.md', '.txt', '.sql',
        '.sh', '.bat', '.cmd', '.html', '.css', '.scss'
      ])
    }
  };

  /**
   * Detecta el tipo de proyecto basado en archivos presentes
   */
  static async detectProjectType(projectPath) {
    try {
      const files = await readdir(projectPath);

      if (files.includes('pom.xml')) return 'Maven (Java)';
      if (files.some(f => f.startsWith('build.gradle'))) return 'Gradle (Java/Kotlin)';
      if (files.includes('build.xml')) return 'Ant (Java)';
      if (files.includes('package.json')) {
        const packageJson = JSON.parse(
          await readFile(path.join(projectPath, 'package.json'), 'utf-8')
        );
        if (packageJson.dependencies?.react || packageJson.devDependencies?.react) {
          return 'React (JavaScript/TypeScript)';
        }
        if (packageJson.dependencies?.vue || packageJson.devDependencies?.vue) {
          return 'Vue.js (JavaScript/TypeScript)';
        }
        if (packageJson.dependencies?.next || packageJson.devDependencies?.next) {
          return 'Next.js (React)';
        }
        return 'Node.js (JavaScript/TypeScript)';
      }
      if (files.includes('requirements.txt') || files.includes('setup.py')) {
        return 'Python';
      }
      if (files.includes('Cargo.toml')) return 'Rust';
      if (files.includes('go.mod')) return 'Go';
      if (files.includes('Gemfile')) return 'Ruby';
      if (files.includes('composer.json')) return 'PHP';
      if (files.some(f => f.endsWith('.sln'))) return 'C# (.NET)';
      if (files.includes('CMakeLists.txt')) return 'C/C++ (CMake)';

      return 'Proyecto genérico';
    } catch (error) {
      return 'Proyecto genérico';
    }
  }

  /**
   * Escanea recursivamente el proyecto y retorna lista de archivos
   */
  static async scanFiles(projectPath, extensions, includeTests = true) {
    const files = [];

    async function walkDir(currentPath, relativePath = '') {
      const entries = await readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;

        if (entry.isDirectory()) {
          // Excluir directorios predefinidos
          if (ConsolidatorService.EXCLUDED_DIRS.has(entry.name)) {
            continue;
          }

          // Si no se incluyen tests, excluir carpetas de test
          if (!includeTests && entry.name.toLowerCase().includes('test')) {
            continue;
          }

          // Recursión en subdirectorios
          await walkDir(fullPath, relPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();

          // Excluir archivos binarios
          if (ConsolidatorService.BINARY_EXTENSIONS.has(ext)) {
            continue;
          }

          // Incluir solo las extensiones seleccionadas
          // También incluir archivos de configuración importantes sin extensión
          const importantFiles = new Set(['dockerfile', 'makefile', 'rakefile', 'gemfile']);
          const isImportantFile = importantFiles.has(entry.name.toLowerCase());

          if (extensions.has(ext) || isImportantFile) {
            files.push({
              fullPath,
              relativePath: relPath,
              extension: ext
            });
          }
        }
      }
    }

    await walkDir(projectPath);
    return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  }

  /**
   * Lee un archivo de forma segura manejando diferentes encodings
   */
  static async readFileSafely(filePath) {
    const encodings = ['utf-8', 'latin1', 'ascii'];

    for (const encoding of encodings) {
      try {
        return await readFile(filePath, encoding);
      } catch (error) {
        continue;
      }
    }

    return '[Error: No se pudo leer el archivo con encodings comunes]';
  }

  /**
   * Mapea extensiones a lenguajes para resaltado de sintaxis
   */
  static getLanguageFromExtension(extension) {
    const langMap = {
      '.java': 'java',
      '.js': 'javascript',
      '.jsx': 'jsx',
      '.ts': 'typescript',
      '.tsx': 'tsx',
      '.py': 'python',
      '.c': 'c',
      '.cpp': 'cpp',
      '.h': 'c',
      '.hpp': 'cpp',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust',
      '.rb': 'ruby',
      '.php': 'php',
      '.xml': 'xml',
      '.properties': 'properties',
      '.gradle': 'gradle',
      '.kts': 'kotlin',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.json': 'json',
      '.sql': 'sql',
      '.md': 'markdown',
      '.sh': 'bash',
      '.bat': 'batch',
      '.cmd': 'batch',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.vue': 'vue',
      '.svelte': 'svelte',
      '.txt': 'text'
    };

    return langMap[extension.toLowerCase()] || 'text';
  }

  /**
   * Genera el árbol de directorios
   */
  static generateDirectoryTree(files) {
    const dirs = new Set();

    for (const file of files) {
      const parts = file.relativePath.split(path.sep);
      for (let i = 0; i < parts.length; i++) {
        const dirPath = parts.slice(0, i + 1).join(path.sep);
        dirs.add(dirPath);
      }
    }

    const sortedDirs = Array.from(dirs).sort();
    const lines = [];

    for (const dirPath of sortedDirs.slice(0, 100)) { // Limitar a 100 para no saturar
      const level = dirPath.split(path.sep).length - 1;
      const indent = '  '.repeat(level);
      const name = path.basename(dirPath);

      // Verificar si es archivo o directorio
      const isFile = files.some(f => f.relativePath === dirPath);
      const prefix = isFile ? '📄 ' : '📁 ';

      lines.push(`${indent}${prefix}${name}`);
    }

    if (sortedDirs.length > 100) {
      lines.push(`\n... y ${sortedDirs.length - 100} elementos más`);
    }

    return lines.join('\n');
  }

  /**
   * Genera el contenido consolidado en formato Markdown
   */
  static async generateConsolidatedContent(projectPath, projectName, files, modeName) {
    const lines = [];
    const now = new Date();

    // Encabezado
    lines.push('# Proyecto Consolidado\n');
    lines.push(`**Generado:** ${now.toISOString().replace('T', ' ').substring(0, 19)}\n`);
    lines.push(`**Proyecto:** ${projectName}\n`);
    lines.push(`**Ruta:** \`${projectPath}\`\n`);
    lines.push(`**Modo de conversión:** ${modeName}\n`);

    // Detectar tipo de proyecto
    const projectType = await ConsolidatorService.detectProjectType(projectPath);

    // Metadata del proyecto
    lines.push('## 📋 Metadata del Proyecto\n');
    lines.push(`- **Tipo de proyecto:** ${projectType}`);
    lines.push(`- **Total de archivos:** ${files.length}\n`);

    // Estructura de directorios
    lines.push('## 📁 Estructura de Directorios\n');
    lines.push('```');
    lines.push(ConsolidatorService.generateDirectoryTree(files));
    lines.push('```\n');

    // Contenido de archivos
    lines.push('## 📄 Contenido de Archivos\n');
    lines.push('---\n');

    let totalLines = 0;
    const extensionCounts = {};

    for (const file of files) {
      const content = await ConsolidatorService.readFileSafely(file.fullPath);
      const lineCount = content.split('\n').length;
      totalLines += lineCount;

      // Contar por extensión
      extensionCounts[file.extension] = (extensionCounts[file.extension] || 0) + 1;

      // Detectar lenguaje para resaltado
      const lang = ConsolidatorService.getLanguageFromExtension(file.extension);

      lines.push(`### 📄 \`${file.relativePath}\`\n`);
      lines.push(`**Líneas:** ${lineCount} | **Tipo:** ${file.extension}\n`);
      lines.push(`\`\`\`${lang}`);
      lines.push(content);
      if (!content.endsWith('\n')) {
        lines.push('');
      }
      lines.push('```\n');
      lines.push('---\n');
    }

    // Estadísticas finales
    lines.push('## 📊 Estadísticas del Proyecto\n');
    lines.push(`- **Total de archivos procesados:** ${files.length}`);
    lines.push(`- **Total de líneas de código:** ${totalLines.toLocaleString()}`);

    // Desglose por extensión
    lines.push('\n### Desglose por tipo de archivo:\n');
    const sortedExtensions = Object.entries(extensionCounts)
      .sort((a, b) => b[1] - a[1]);

    for (const [ext, count] of sortedExtensions) {
      lines.push(`- **${ext}:** ${count} archivo${count > 1 ? 's' : ''}`);
    }

    return lines.join('\n');
  }

  /**
   * Método principal para consolidar un proyecto
   */
  static async consolidateProject(projectPath, mode = '5', customExtensions = null, includeTests = true) {
    try {
      // Verificar que la ruta existe
      const stats = await stat(projectPath);
      if (!stats.isDirectory()) {
        throw new Error('La ruta no es un directorio válido');
      }

      // Obtener configuración del modo
      let extensions;
      let modeName;

      if (customExtensions && Array.isArray(customExtensions) && customExtensions.length > 0) {
        // Modo personalizado
        extensions = new Set(
          customExtensions.map(ext => ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`)
        );
        modeName = 'Personalizado';
      } else {
        // Modo predefinido
        const modeConfig = ConsolidatorService.CONVERSION_MODES[mode] || ConsolidatorService.CONVERSION_MODES['5'];
        extensions = modeConfig.extensions;
        modeName = modeConfig.name;
      }

      // Escanear archivos
      const files = await ConsolidatorService.scanFiles(projectPath, extensions, includeTests);

      if (files.length === 0) {
        throw new Error('No se encontraron archivos con las extensiones seleccionadas');
      }

      // Nombre del proyecto
      const projectName = path.basename(projectPath);

      // Generar contenido consolidado
      const content = await ConsolidatorService.generateConsolidatedContent(
        projectPath,
        projectName,
        files,
        modeName
      );

      return {
        success: true,
        content,
        stats: {
          totalFiles: files.length,
          projectName,
          mode: modeName,
          extensions: Array.from(extensions)
        }
      };
    } catch (error) {
      console.error('Error en consolidateProject:', error);
      throw error;
    }
  }
}

export default ConsolidatorService;

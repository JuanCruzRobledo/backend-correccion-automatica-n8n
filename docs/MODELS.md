# 📚 Documentación de Modelos de Datos

## Tabla de Contenidos
- [ProjectHash](#projecthash)
- [Submission (Extendido)](#submission-extendido)
- [Relaciones entre Modelos](#relaciones-entre-modelos)
- [Índices y Performance](#índices-y-performance)
- [Queries Comunes](#queries-comunes)

---

## ProjectHash

**Colección:** `projecthashes`

**Descripción:** Almacena hashes SHA256 de proyectos de alumnos para detección de similitud y copias.

### Schema

```javascript
{
  _id: ObjectId,

  // Referencias
  commission_id: String (required, indexed),
  rubric_id: String (required, indexed),
  student_id: String (optional, indexed),
  student_name: String (required, lowercase, indexed),
  student_email: String (optional, lowercase),
  submission_id: String (optional, indexed),

  // Hashes
  project_hash: String (required, indexed),
  file_hashes: Map<String, String> (required),

  // Estadísticas
  stats: {
    total_files: Number,
    total_lines: Number,
    java_files: Number,
    other_files: Number
  },

  // Metadata
  metadata: {
    project_name: String,
    mode: String,
    extensions: [String],
    include_tests: Boolean
  },

  // Timestamps
  processed_at: Date,
  updated_at: Date
}
```

### Campos

#### Referencias
- **commission_id**: ID de la comisión a la que pertenece el proyecto
- **rubric_id**: ID de la rúbrica específica
- **student_id**: ID del estudiante (puede ser null si no está registrado)
- **student_name**: Nombre del alumno (normalizado a lowercase)
- **student_email**: Email del alumno (opcional)
- **submission_id**: Referencia a Submission (si fue subido por el sistema)

#### Hashes
- **project_hash**: Hash SHA256 del proyecto completo (todos los archivos concatenados)
- **file_hashes**: Mapa de archivos individuales con sus hashes
  ```javascript
  {
    "src/Main.java": "abc123...",
    "src/User.java": "def456...",
    "src/Utils.java": "ghi789..."
  }
  ```

#### Estadísticas
- **stats.total_files**: Número total de archivos procesados
- **stats.total_lines**: Líneas totales de código
- **stats.java_files**: Archivos .java (o del lenguaje principal)
- **stats.other_files**: Otros archivos (configs, etc.)

#### Metadata
- **metadata.project_name**: Nombre del proyecto
- **metadata.mode**: Modo de consolidación usado
- **metadata.extensions**: Extensiones de archivos procesados
- **metadata.include_tests**: Si se incluyeron tests

### Índices

```javascript
// Índices simples
{ commission_id: 1 }
{ rubric_id: 1 }
{ student_id: 1 }
{ student_name: 1 }
{ submission_id: 1 }
{ project_hash: 1 }

// Índices compuestos
{ commission_id: 1, rubric_id: 1 }
{ student_name: 1, commission_id: 1 }
{ commission_id: 1, rubric_id: 1, student_name: 1 } // unique
```

### Métodos Estáticos

#### `findByCommissionAndRubric(commissionId, rubricId)`
Encuentra todos los proyectos de una comisión y rúbrica específica.

```javascript
const projects = await ProjectHash.findByCommissionAndRubric('K1052', 'rubric-001');
// Returns: Array<ProjectHash>
```

#### `findByProjectHash(projectHash)`
Encuentra todos los proyectos con un hash idéntico (100% iguales).

```javascript
const identicalProjects = await ProjectHash.findByProjectHash('abc123...');
// Returns: Array<ProjectHash> - Proyectos con el mismo hash
```

#### `findByStudent(studentName, commissionId?)`
Encuentra todos los proyectos de un estudiante.

```javascript
const studentProjects = await ProjectHash.findByStudent('juan pérez', 'K1052');
// Returns: Array<ProjectHash>
```

#### `findOrCreate(projectData)`
Busca un proyecto existente o crea uno nuevo (upsert).

```javascript
const project = await ProjectHash.findOrCreate({
  commission_id: 'K1052',
  rubric_id: 'rubric-001',
  student_name: 'Juan Pérez',
  project_hash: 'abc123...',
  // ... otros campos
});
// Returns: ProjectHash (existente o nuevo)
```

#### `getStatsByCommissionAndRubric(commissionId, rubricId)`
Obtiene estadísticas agregadas de una comisión/rúbrica.

```javascript
const stats = await ProjectHash.getStatsByCommissionAndRubric('K1052', 'rubric-001');
// Returns:
{
  total_projects: 30,
  unique_projects: 28,
  duplicate_groups: 2,
  avg_files_per_project: 15,
  avg_lines_per_project: 450
}
```

### Métodos de Instancia

#### `updateHashes(projectHash, fileHashes)`
Actualiza los hashes del proyecto.

```javascript
await projectHashDoc.updateHashes('new-hash', {
  'src/Main.java': 'hash1',
  'src/User.java': 'hash2'
});
```

#### `updateStats(stats)`
Actualiza las estadísticas del proyecto.

```javascript
await projectHashDoc.updateStats({
  totalFiles: 20,
  totalLines: 500,
  javaFiles: 15,
  otherFiles: 5
});
```

#### `getFileHashesAsObject()`
Convierte el Map de file_hashes a un objeto plano.

```javascript
const fileHashes = projectHashDoc.getFileHashesAsObject();
// Returns: { "src/Main.java": "hash1", ... }
```

---

## Submission (Extendido)

**Colección:** `submissions`

**Descripción:** Modelo existente de entregas, extendido con campos para detección de similitud y generación de PDFs de devolución.

### Campos Nuevos

#### `project_hash_id`
```javascript
project_hash_id: ObjectId (ref: 'ProjectHash', optional, indexed)
```

Referencia al documento `ProjectHash` asociado a esta entrega.

**Uso:**
```javascript
const submission = await Submission.findById(id).populate('project_hash_id');
console.log(submission.project_hash_id.project_hash); // Hash del proyecto
```

#### `correction.criteria` (Array)
```javascript
correction.criteria: [
  {
    id: String,
    name: String,
    score: Number,
    max_score: Number,
    status: 'ok' | 'error' | 'warning',
    feedback: String
  }
]
```

Criterios de evaluación detallados con colores:
- `ok` (✅): Verde
- `error` (❌): Rojo
- `warning` (⚠️): Amarillo

**Ejemplo:**
```javascript
await submission.addCorrection({
  grade: 8,
  corrected_by: professorId,
  criteria: [
    {
      id: 'C1.1',
      name: 'Implementación de clases',
      score: 3,
      max_score: 3,
      status: 'ok',
      feedback: 'Excelente implementación de POO'
    },
    {
      id: 'C2.1',
      name: 'Manejo de excepciones',
      score: 1,
      max_score: 2,
      status: 'warning',
      feedback: 'Faltan try-catch en algunos métodos'
    }
  ]
});
```

#### `correction.strengths_list` (Array)
```javascript
correction.strengths_list: [String]
```

Lista de fortalezas del alumno.

**Ejemplo:**
```javascript
correction.strengths_list = [
  'Código limpio y bien estructurado',
  'Buena documentación con Javadoc',
  'Tests unitarios completos'
]
```

#### `correction.recommendations_list` (Array)
```javascript
correction.recommendations_list: [String]
```

Lista de recomendaciones para mejorar.

**Ejemplo:**
```javascript
correction.recommendations_list = [
  'Implementar manejo de excepciones en métodos críticos',
  'Agregar validaciones de entrada',
  'Mejorar nombres de variables para mayor claridad'
]
```

#### `correction.general_feedback` (String)
```javascript
correction.general_feedback: String
```

Feedback general adicional.

### Compatibilidad con Campos Antiguos

Los campos antiguos se mantienen para retrocompatibilidad:
- `correction.summary` → Se puede parsear para extraer criteria
- `correction.strengths` → Se puede parsear para extraer strengths_list
- `correction.recommendations` → Se puede parsear para extraer recommendations_list

---

## Relaciones entre Modelos

```
┌─────────────────────────────────────────────────────────────┐
│                        Submission                            │
├─────────────────────────────────────────────────────────────┤
│  submission_id: String                                       │
│  commission_id: String ──┐                                   │
│  rubric_id: String ──────┼──┐                                │
│  student_name: String ───┼──┼──┐                             │
│  project_hash_id: ObjectId ──┼──┼──┐                         │
│  correction: {...}        │  │  │  │                         │
└───────────────────────────┼──┼──┼──┼─────────────────────────┘
                            │  │  │  │
                            │  │  │  └──────────────┐
                            │  │  │                 ▼
┌───────────────────────────┼──┼──┼─────────────────────────────┐
│                        ProjectHash                            │
├───────────────────────────┼──┼──┼─────────────────────────────┤
│  _id: ObjectId ◄──────────┘  │  │                             │
│  commission_id: String ◄─────┘  │                             │
│  rubric_id: String ◄────────────┘                             │
│  student_name: String                                         │
│  project_hash: String                                         │
│  file_hashes: Map                                             │
│  stats: {...}                                                 │
└─────────────────────────────────────────────────────────────┘
```

### Ejemplo de Uso con Relaciones

```javascript
// 1. Crear ProjectHash durante batch consolidation
const projectHash = await ProjectHash.create({
  commission_id: 'K1052',
  rubric_id: 'rubric-001',
  student_name: 'juan pérez',
  project_hash: 'abc123...',
  file_hashes: { ... },
  stats: { ... }
});

// 2. Asociar con Submission existente
const submission = await Submission.findOne({
  commission_id: 'K1052',
  rubric_id: 'rubric-001',
  student_name: 'juan pérez'
});

submission.project_hash_id = projectHash._id;
await submission.save();

// 3. Query con populate
const submissionWithHash = await Submission.findById(submission._id)
  .populate('project_hash_id');

console.log(submissionWithHash.project_hash_id.project_hash);
console.log(submissionWithHash.project_hash_id.stats.total_files);
```

---

## Índices y Performance

### ProjectHash

**Índices importantes:**
1. `{ commission_id: 1, rubric_id: 1 }` - Query principal para análisis de similitud
2. `{ project_hash: 1 }` - Encontrar proyectos idénticos (O(1))
3. `{ commission_id: 1, rubric_id: 1, student_name: 1 }` - Unique constraint

**Tamaño estimado por documento:**
- Campos fijos: ~500 bytes
- file_hashes (50 archivos): ~3KB
- Total: ~3.5KB por proyecto

**Capacidad:**
- 10,000 proyectos = ~35MB
- 100,000 proyectos = ~350MB

### Submission

**Nuevo índice:**
```javascript
{ project_hash_id: 1 }
```

Permite queries rápidas de submissions con similitud.

---

## Queries Comunes

### 1. Análisis de Similitud por Comisión/Rúbrica

```javascript
// Obtener todos los proyectos de una rúbrica
const projects = await ProjectHash.findByCommissionAndRubric(
  'K1052',
  'rubric-001'
);

// Agrupar por hash para encontrar idénticos
const hashGroups = {};
projects.forEach(p => {
  if (!hashGroups[p.project_hash]) {
    hashGroups[p.project_hash] = [];
  }
  hashGroups[p.project_hash].push(p.student_name);
});

// Filtrar grupos con más de 1 estudiante (copias)
const identicalGroups = Object.entries(hashGroups)
  .filter(([hash, students]) => students.length > 1);

console.log('Proyectos idénticos:', identicalGroups);
```

### 2. Encontrar Copias Parciales

```javascript
const projects = await ProjectHash.findByCommissionAndRubric('K1052', 'rubric-001');

const partialCopies = [];

for (let i = 0; i < projects.length; i++) {
  for (let j = i + 1; j < projects.length; j++) {
    const fileHashesA = new Set(Object.values(projects[i].getFileHashesAsObject()));
    const fileHashesB = new Set(Object.values(projects[j].getFileHashesAsObject()));

    const commonHashes = [...fileHashesA].filter(h => fileHashesB.has(h));
    const similarity = (commonHashes.length / Math.min(fileHashesA.size, fileHashesB.size)) * 100;

    if (similarity >= 50 && projects[i].project_hash !== projects[j].project_hash) {
      partialCopies.push({
        students: [projects[i].student_name, projects[j].student_name],
        similarity: Math.round(similarity),
        commonFiles: commonHashes.length
      });
    }
  }
}

console.log('Copias parciales (≥50%):', partialCopies);
```

### 3. Submissions con Similitud

```javascript
// Obtener submissions con información de similitud
const submissions = await Submission.find({
  commission_id: 'K1052',
  rubric_id: 'rubric-001'
}).populate('project_hash_id');

const withSimilarity = submissions.map(s => {
  // Encontrar otros proyectos con hash similar
  const similarProjects = projects.filter(p =>
    p.project_hash === s.project_hash_id?.project_hash &&
    p.student_name !== s.student_name
  );

  return {
    student: s.student_name,
    grade: s.correction?.grade,
    similarTo: similarProjects.map(p => p.student_name),
    similarity: similarProjects.length > 0 ? 100 : 0
  };
});

console.log('Submissions con similitud:', withSimilarity);
```

### 4. Estadísticas de una Comisión

```javascript
const stats = await ProjectHash.getStatsByCommissionAndRubric('K1052', 'rubric-001');

console.log(`
Total proyectos: ${stats.total_projects}
Proyectos únicos: ${stats.unique_projects}
Grupos duplicados: ${stats.duplicate_groups}
Promedio archivos: ${stats.avg_files_per_project}
Promedio líneas: ${stats.avg_lines_per_project}
`);
```

### 5. Top Archivos Más Copiados

```javascript
const projects = await ProjectHash.findByCommissionAndRubric('K1052', 'rubric-001');

const fileOccurrences = {};

projects.forEach(project => {
  const fileHashes = project.getFileHashesAsObject();
  Object.entries(fileHashes).forEach(([fileName, hash]) => {
    if (!fileOccurrences[hash]) {
      fileOccurrences[hash] = {
        fileName,
        students: new Set()
      };
    }
    fileOccurrences[hash].students.add(project.student_name);
  });
});

const topCopiedFiles = Object.entries(fileOccurrences)
  .filter(([hash, data]) => data.students.size >= 3)
  .sort((a, b) => b[1].students.size - a[1].students.size)
  .slice(0, 10)
  .map(([hash, data]) => ({
    file: data.fileName,
    occurrences: data.students.size,
    students: Array.from(data.students).slice(0, 3)
  }));

console.log('Top 10 archivos más copiados:', topCopiedFiles);
```

---

## Migración de Datos Existentes

Si tienes submissions existentes sin `project_hash_id`, puedes ejecutar:

```javascript
// scripts/migrateProjectHashes.js
import Submission from '../src/models/Submission.js';
import ProjectHash from '../src/models/ProjectHash.js';

async function migrate() {
  const submissions = await Submission.find({ project_hash_id: null });

  for (const submission of submissions) {
    // Buscar ProjectHash correspondiente
    const projectHash = await ProjectHash.findOne({
      commission_id: submission.commission_id,
      rubric_id: submission.rubric_id,
      student_name: submission.student_name
    });

    if (projectHash) {
      submission.project_hash_id = projectHash._id;
      await submission.save();
      console.log(`✅ Migrado: ${submission.student_name}`);
    }
  }

  console.log('✅ Migración completada');
}

migrate();
```

---

## Consideraciones de Seguridad

1. **Sanitización de Nombres**: Los nombres de estudiantes se guardan en lowercase y trimmed para evitar duplicados por diferencias de capitalización.

2. **Índices Únicos**: El índice único `{ commission_id, rubric_id, student_name }` previene duplicados accidentales.

3. **Soft Deletes**: Los ProjectHash no tienen soft delete por diseño, ya que son datos de auditoría.

4. **Privacidad**: Los hashes no revelan el contenido del código, solo permiten detectar similitud.

---

**Última actualización:** 2025-12-02
**Versión:** 1.0

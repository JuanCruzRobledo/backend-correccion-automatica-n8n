# API: Batch Consolidator

Documentación de los endpoints para consolidación batch de múltiples entregas.

---

## 📋 Tabla de Contenidos
- [POST /api/consolidate/batch](#post-apiconsolidatebatch)
- [GET /api/consolidate/batch/download/:filename](#get-apiconsolidatebatchdownloadfilename)
- [Formato del ZIP de Entrada](#formato-del-zip-de-entrada)
- [Estructura de Respuestas](#estructura-de-respuestas)
- [Ejemplos de Uso](#ejemplos-de-uso)
- [Códigos de Error](#códigos-de-error)

---

## POST /api/consolidate/batch

Consolida múltiples entregas de alumnos en un solo proceso. Detecta automáticamente similitud entre proyectos.

### Autenticación
✅ **Requerida** - Solo usuarios autenticados (profesores)

### Headers
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

### Body Parameters

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `entregas` | File (ZIP) | ✅ Sí | Archivo ZIP con estructura `entregas/{alumno}/proyecto.zip` |
| `commissionId` | String | ✅ Sí | ID de la comisión |
| `rubricId` | String | ✅ Sí | ID de la rúbrica |
| `mode` | String | ❌ No | Modo de conversión: `1` a `5` (default: `5`) |
| `customExtensions` | String | ❌ No | Extensiones personalizadas separadas por comas (ej: `.java,.xml`) |
| `includeTests` | Boolean | ❌ No | Incluir archivos de test (default: `true`) |

### Límites
- **Tamaño máximo del ZIP:** 500MB
- **Timeout:** 10 minutos

### Response (200 OK)

```json
{
  "success": true,
  "message": "30 proyectos procesados exitosamente",
  "total_processed": 30,
  "successful": 28,
  "failed": 2,
  "results": [
    {
      "student_name": "juan perez",
      "status": "success",
      "stats": {
        "totalFiles": 15,
        "projectName": "mi-proyecto",
        "mode": "Solo código fuente (Java)",
        "extensions": [".java"]
      }
    },
    {
      "student_name": "maria gomez",
      "status": "success",
      "stats": {
        "totalFiles": 18,
        "projectName": "proyecto-java",
        "mode": "Solo código fuente (Java)",
        "extensions": [".java"]
      }
    },
    {
      "student_name": "pedro lopez",
      "status": "error",
      "error": "No se encontró archivo ZIP"
    }
  ],
  "similarity": {
    "identical_groups": 1,
    "partial_copies": 3,
    "most_copied_files": 5,
    "details": {
      "identicalGroups": [
        {
          "project_hash": "abc123...",
          "students": ["juan perez", "maria gomez"],
          "files_count": 15,
          "lines_count": 450,
          "percentage": 100
        }
      ],
      "partialCopies": [
        {
          "students": ["pedro lopez", "ana martinez"],
          "copied_files": [
            {
              "name": "src/Main.java",
              "hash": "def456..."
            },
            {
              "name": "src/User.java",
              "hash": "ghi789..."
            }
          ],
          "percentage": 67,
          "total_common_files": 10
        }
      ],
      "mostCopiedFiles": [
        {
          "file_name": "Utils.java",
          "hash": "jkl012...",
          "occurrences": 8,
          "students": ["juan perez", "maria gomez", "pedro lopez", "ana martinez", "luis garcia"]
        }
      ]
    }
  },
  "download_url": "/api/consolidate/batch/download/consolidados_K1052_rubric001_1234567890.zip"
}
```

### Response Errors

#### 400 Bad Request
```json
{
  "success": false,
  "message": "commissionId y rubricId son requeridos"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "No autorizado"
}
```

#### 413 Payload Too Large
```json
{
  "success": false,
  "message": "Archivo demasiado grande (máx 500MB)"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Error al procesar el batch de entregas",
  "error": "<stack trace en development>"
}
```

---

## GET /api/consolidate/batch/download/:filename

Descarga el archivo ZIP con todos los archivos consolidados generados.

### Autenticación
✅ **Requerida** - Solo usuarios autenticados

### Headers
```
Authorization: Bearer <token>
```

### Path Parameters

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `filename` | String | Nombre del archivo ZIP a descargar |

### Response (200 OK)

Devuelve el archivo ZIP con Content-Disposition:

```
Content-Type: application/zip
Content-Disposition: attachment; filename="consolidados_K1052_rubric001_1234567890.zip"
```

**Estructura del ZIP:**
```
consolidados_K1052_rubric001_1234567890.zip
├── juan perez/
│   └── entrega.txt
├── maria gomez/
│   └── entrega.txt
└── pedro lopez/
    └── entrega.txt
```

### Response Errors

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Nombre de archivo inválido"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Archivo no encontrado"
}
```

---

## Formato del ZIP de Entrada

El archivo ZIP de entregas debe seguir esta estructura:

### Estructura Esperada

```
entregas.zip
└── entregas/                                    (opcional)
    ├── Juan_Perez_123456_assignsubmission_file/
    │   └── proyecto.zip
    ├── Maria_Gomez_789012_assignsubmission_file/
    │   └── mi-trabajo.zip
    └── Pedro_Lopez/
        └── tp-final.zip
```

### Reglas

1. **Carpeta principal opcional:** Puede llamarse `entregas/` o no existir (usar directamente las carpetas de alumnos)

2. **Carpetas de alumnos:**
   - Cada carpeta representa un alumno
   - El nombre de la carpeta será sanitizado automáticamente
   - Se remueven sufijos como `_123456_assignsubmission_file`

3. **Archivo del proyecto:**
   - Debe ser un archivo `.zip`
   - Si hay múltiples ZIPs, se usa el primero
   - El nombre del ZIP puede ser cualquiera

4. **Contenido del ZIP del alumno:**
   - Estructura típica de proyecto (ej: carpeta `src/`)
   - Puede tener una carpeta contenedora o archivos directos

### Ejemplo de Sanitización de Nombres

| Nombre Original | Nombre Sanitizado |
|----------------|-------------------|
| `Juan_Perez_123456_assignsubmission_file` | `juan perez` |
| `Maria_Gomez_assignsubmission_file` | `maria gomez` |
| `Pedro_Lopez` | `pedro lopez` |
| `Ana  Martinez` | `ana martinez` |

---

## Estructura de Respuestas

### Objeto `result` (por alumno)

```typescript
interface StudentResult {
  student_name: string;
  status: 'success' | 'error' | 'warning';
  error?: string;           // Si status === 'error'
  warning?: string;         // Si status === 'warning'
  stats?: {
    totalFiles: number;
    projectName: string;
    mode: string;
    extensions: string[];
  };
}
```

### Objeto `similarity`

```typescript
interface SimilarityAnalysis {
  identical_groups: number;        // Cantidad de grupos idénticos
  partial_copies: number;          // Cantidad de copias parciales
  most_copied_files: number;       // Cantidad de archivos repetidos
  details: {
    identicalGroups: IdenticalGroup[];
    partialCopies: PartialCopy[];
    mostCopiedFiles: CopiedFile[];
  };
}

interface IdenticalGroup {
  project_hash: string;
  students: string[];
  files_count: number;
  lines_count: number;
  percentage: 100;
}

interface PartialCopy {
  students: [string, string];
  copied_files: {
    name: string;
    hash: string;
  }[];
  percentage: number;          // 50-99
  total_common_files: number;
}

interface CopiedFile {
  file_name: string;
  hash: string;
  occurrences: number;         // ≥3
  students: string[];          // Muestra máximo 5
}
```

---

## Ejemplos de Uso

### Ejemplo 1: curl

```bash
curl -X POST "http://localhost:5000/api/consolidate/batch" \
  -H "Authorization: Bearer <token>" \
  -F "entregas=@./entregas.zip" \
  -F "commissionId=K1052" \
  -F "rubricId=rubric-001" \
  -F "mode=1" \
  -F "includeTests=true"
```

### Ejemplo 2: JavaScript (fetch)

```javascript
const formData = new FormData();
formData.append('entregas', fileInput.files[0]);
formData.append('commissionId', 'K1052');
formData.append('rubricId', 'rubric-001');
formData.append('mode', '1');
formData.append('includeTests', 'true');

const response = await fetch('http://localhost:5000/api/consolidate/batch', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log(result);
```

### Ejemplo 3: Axios

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const formData = new FormData();
formData.append('entregas', fs.createReadStream('./entregas.zip'));
formData.append('commissionId', 'K1052');
formData.append('rubricId', 'rubric-001');
formData.append('mode', '1');

const response = await axios.post(
  'http://localhost:5000/api/consolidate/batch',
  formData,
  {
    headers: {
      ...formData.getHeaders(),
      'Authorization': `Bearer ${token}`
    }
  }
);

console.log(response.data);
```

### Ejemplo 4: Descargar Resultado

```javascript
// Primero, obtener la URL de descarga de la respuesta del batch
const downloadUrl = result.download_url; // "/api/consolidate/batch/download/consolidados_..."

// Luego, descargar el ZIP
const response = await fetch(`http://localhost:5000${downloadUrl}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const blob = await response.blob();
const url = URL.createObjectURL(blob);

// Descargar en el navegador
const a = document.createElement('a');
a.href = url;
a.download = 'consolidados.zip';
a.click();
```

---

## Códigos de Error

| Código | Descripción | Solución |
|--------|-------------|----------|
| 400 | ZIP no válido | Verificar estructura del ZIP |
| 400 | Faltan parámetros | Incluir `commissionId` y `rubricId` |
| 401 | No autenticado | Incluir token válido en header `Authorization` |
| 413 | Archivo muy grande | Reducir tamaño del ZIP (máx 500MB) |
| 500 | Error de servidor | Ver logs del servidor, contactar soporte |

---

## Notas Importantes

### Sanitización de Nombres
- Los nombres de alumnos se convierten a lowercase
- Se remueven sufijos de Moodle (`_123456_assignsubmission_file`)
- Se remueven espacios múltiples y caracteres especiales

### Detección de Similitud
- **100% Idéntico:** Todos los archivos tienen el mismo hash
- **Copia Parcial (≥50%):** Al menos 50% de archivos en común
- **Archivo Copiado:** Aparece en 3 o más proyectos

### Performance
- Procesamiento paralelo de entregas
- Tiempo estimado: ~3-5 segundos por proyecto
- Batch de 30 proyectos: ~2-3 minutos

### Almacenamiento
- Los archivos consolidados se guardan en:
  ```
  uploads/consolidated/{commissionId}_{rubricId}/{alumno}/entrega.txt
  ```
- Los ZIPs temporales se eliminan automáticamente después de 5 segundos de la descarga

### Persistencia
- Los hashes de proyectos se guardan en MongoDB (`projecthashes` collection)
- Permite análisis multi-sesión (comparar entregas de diferentes momentos)

---

## Troubleshooting

### Problema: "No se encontró archivo ZIP"
**Causa:** La carpeta del alumno no contiene un archivo .zip

**Solución:** Verificar que cada carpeta de alumno tenga un archivo .zip con el proyecto

---

### Problema: "Error en consolidación"
**Causa:** El ZIP del alumno está corrupto o tiene estructura inesperada

**Solución:**
1. Extraer manualmente el ZIP del alumno
2. Verificar que contenga archivos de código
3. Re-comprimir si es necesario

---

### Problema: "Proyectos no detectados como idénticos pero lo son visualmente"
**Causa:** Los archivos tienen diferencias de espaciado o comentarios

**Solución:** La normalización debería manejar esto. Si persiste, revisar el algoritmo de hashing en `SimilarityDetectorService`.

---

**Última actualización:** 2025-12-02
**Versión:** 1.0

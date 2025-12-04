# API de PDFs de Devolución

Este documento describe los endpoints para generar y descargar PDFs de devolución de correcciones.

---

## 📋 Tabla de Contenidos

1. [Endpoint Individual](#endpoint-individual)
2. [Endpoint Batch (ZIP)](#endpoint-batch-zip)
3. [Estructura del PDF](#estructura-del-pdf)
4. [Ejemplos de Uso](#ejemplos-de-uso)

---

## Endpoint Individual

### `GET /api/submissions/:submissionId/devolution-pdf`

Descarga el PDF de devolución individual para una submission específica.

#### Parámetros de Ruta

| Parámetro      | Tipo   | Descripción                           |
| -------------- | ------ | ------------------------------------- |
| `submissionId` | String | ID de la submission (ej: `comm-001`) |

#### Headers Requeridos

```http
Authorization: Bearer <JWT_TOKEN>
```

#### Respuesta Exitosa

**Código:** `200 OK`
**Content-Type:** `application/pdf`
**Content-Disposition:** `attachment; filename="juan_perez_devolucion_1234567890.pdf"`

**Body:** Archivo PDF binario

#### Errores

| Código | Descripción                                |
| ------ | ------------------------------------------ |
| `400`  | La submission no tiene corrección          |
| `401`  | No autenticado                             |
| `403`  | Sin permisos                               |
| `404`  | Submission no encontrada                   |
| `500`  | Error interno al generar el PDF            |

#### Ejemplo de Request

```bash
curl -X GET \
  'http://localhost:5000/api/submissions/comm-001-juan-perez-1234567890/devolution-pdf' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  --output juan_perez_devolucion.pdf
```

---

## Endpoint Batch (ZIP)

### `POST /api/commissions/:commissionId/rubrics/:rubricId/generate-devolution-pdfs`

Genera y descarga un archivo ZIP con los PDFs de devolución de todos los estudiantes de una comisión y rúbrica.

#### Parámetros de Ruta

| Parámetro      | Tipo   | Descripción                           |
| -------------- | ------ | ------------------------------------- |
| `commissionId` | String | ID de la comisión (ej: `comm-001`)   |
| `rubricId`     | String | ID de la rúbrica (ej: `rubric-001`)  |

#### Headers Requeridos

```http
Authorization: Bearer <JWT_TOKEN>
```

#### Respuesta Exitosa

**Código:** `200 OK`
**Content-Type:** `application/zip`
**Content-Disposition:** `attachment; filename="devoluciones_comm-001_rubric-001_1234567890.zip"`

**Body:** Archivo ZIP binario conteniendo múltiples PDFs

#### Estructura del ZIP

```
devoluciones_comm-001_rubric-001_1234567890.zip
├── juan_perez_devolucion.pdf
├── maria_gomez_devolucion.pdf
├── carlos_rodriguez_devolucion.pdf
└── ...
```

#### Errores

| Código | Descripción                                  |
| ------ | -------------------------------------------- |
| `400`  | Parámetros faltantes (commissionId, rubricId)|
| `401`  | No autenticado                               |
| `403`  | Sin permisos                                 |
| `404`  | No se encontraron submissions corregidas     |
| `500`  | Error interno al generar el ZIP              |

#### Ejemplo de Request

```bash
curl -X POST \
  'http://localhost:5000/api/commissions/comm-001/rubrics/rubric-001/generate-devolution-pdfs' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  --output devoluciones.zip
```

---

## Estructura del PDF

### Secciones del PDF

Los PDFs de devolución contienen las siguientes secciones:

#### 1. Portada

- **Título:** "Devolución de Corrección"
- **Alumno:** Nombre del estudiante
- **Comisión:** Nombre de la comisión
- **Rúbrica:** Nombre de la rúbrica
- **Puntaje Total:** Nota final (destacada en verde)

#### 2. Criterios de Evaluación

Lista de criterios evaluados con:
- **Estado visual:** ✓ (ok), ✗ (error), ⚠ (warning)
- **Color:** Verde (ok), Rojo (error), Amarillo (warning)
- **Puntaje:** Ej: "(8/10)"
- **Feedback:** Comentario específico del criterio

**Ejemplo:**
```
✓ C1.1 — Implementación correcta (10/10)
   El código implementa correctamente la funcionalidad solicitada

✗ C2.3 — Manejo de excepciones (0/5)
   No se implementó manejo de errores
```

#### 3. Fortalezas Detectadas

Lista con viñetas de las fortalezas identificadas:

```
• Código limpio y bien estructurado
• Buena documentación en comentarios
• Uso apropiado de patrones de diseño
```

#### 4. Recomendaciones

Lista numerada de mejoras sugeridas:

```
1. Implementar validación de entrada de datos
2. Agregar tests unitarios para casos edge
3. Mejorar el manejo de errores en operaciones críticas
```

#### 5. Comentarios Generales

Feedback adicional del profesor (si existe).

#### 6. Pie de Página

- Fecha de corrección
- "Sistema de Corrección Automática"

---

## Ejemplos de Uso

### Ejemplo 1: Descargar PDF Individual desde Frontend

```typescript
const downloadDevolutionPdf = async (submissionId: string) => {
  try {
    const response = await fetch(
      `${API_URL}/submissions/${submissionId}/devolution-pdf`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Error al descargar PDF');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devolucion_${submissionId}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Ejemplo 2: Descargar ZIP Batch desde Frontend

```typescript
const downloadBatchDevolutionPdfs = async (
  commissionId: string,
  rubricId: string
) => {
  try {
    const response = await fetch(
      `${API_URL}/commissions/${commissionId}/rubrics/${rubricId}/generate-devolution-pdfs`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Error al generar PDFs');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devoluciones_${commissionId}_${rubricId}.zip`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Ejemplo 3: Estructura de Datos en MongoDB

Para que los PDFs se generen correctamente, las submissions deben tener el siguiente formato en el campo `correction`:

```javascript
{
  submission_id: "comm-001-juan-perez-1234567890",
  student_name: "juan perez",
  commission_id: "comm-001",
  rubric_id: "rubric-001",
  status: "corrected",
  correction: {
    corrected_at: new Date("2025-12-02"),
    corrected_by: ObjectId("..."),
    grade: 85,

    // Criterios con estado y feedback
    criteria: [
      {
        id: "c1.1",
        name: "Implementación correcta",
        score: 10,
        max_score: 10,
        status: "ok",
        feedback: "El código implementa correctamente la funcionalidad"
      },
      {
        id: "c2.3",
        name: "Manejo de excepciones",
        score: 0,
        max_score: 5,
        status: "error",
        feedback: "No se implementó manejo de errores"
      },
      {
        id: "c3.1",
        name: "Documentación",
        score: 7,
        max_score: 10,
        status: "warning",
        feedback: "La documentación es incompleta"
      }
    ],

    // Fortalezas (array de strings)
    strengths_list: [
      "Código limpio y bien estructurado",
      "Buena documentación en comentarios",
      "Uso apropiado de patrones de diseño"
    ],

    // Recomendaciones (array de strings)
    recommendations_list: [
      "Implementar validación de entrada de datos",
      "Agregar tests unitarios para casos edge",
      "Mejorar el manejo de errores en operaciones críticas"
    ],

    // Feedback general (opcional)
    general_feedback: "Buen trabajo en general. Se nota esfuerzo en la implementación."
  }
}
```

---

## Notas Técnicas

### Generación de PDFs

- **Librería:** PDFKit
- **Tamaño de página:** A4
- **Márgenes:** 50px (todos los lados)
- **Fuentes:** Helvetica (regular y bold)

### Compresión del ZIP

- **Librería:** archiver
- **Nivel de compresión:** 9 (máximo)
- **Formato:** ZIP estándar

### Sanitización de Nombres

Los nombres de archivo se sanean automáticamente:
- Se remueven acentos
- Se reemplazan caracteres especiales por `_`
- Se remueven underscores consecutivos
- Todo en minúsculas

**Ejemplo:**
```
"María José Pérez" → "maria_jose_perez_devolucion.pdf"
```

---

## Roles y Permisos

| Endpoint                    | Roles Permitidos                                    |
| --------------------------- | --------------------------------------------------- |
| PDF Individual              | `professor`, `university-admin`, `super-admin`      |
| PDF Batch (ZIP)             | `professor`, `university-admin`, `super-admin`      |

---

## FAQ

### ¿Qué pasa si una submission no tiene corrección?

El endpoint individual retorna un error `400 Bad Request` con el mensaje "La submission no tiene corrección disponible".

### ¿El ZIP incluye submissions sin corregir?

No, el endpoint batch solo incluye submissions con `status: 'corrected'`.

### ¿Puedo personalizar el formato del PDF?

Sí, puedes modificar el servicio `DevolutionPdfService` para cambiar colores, fuentes, layout, etc.

### ¿Hay límite en el tamaño del ZIP?

No hay límite configurado, pero considera la memoria del servidor al generar ZIPs con muchos PDFs.

---

**Última actualización:** 2025-12-02

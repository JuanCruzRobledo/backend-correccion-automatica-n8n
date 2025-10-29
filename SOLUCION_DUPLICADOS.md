# Solución al Problema de Comisiones Duplicadas

## Problema Identificado

Al buscar comisiones por `course_id`, se devuelven **comisiones duplicadas** porque el mismo curso (`2025-programacion-1`) existe en múltiples carreras:
- `isi-frm` (Facultad Regional Mendoza)
- `isi-frsn` (Facultad Regional San Nicolás)  
- `isi-fra` (Facultad Regional Avellaneda)
- `isi-frba` (Facultad Regional Buenos Aires)

Cada carrera tiene sus propias comisiones con el mismo `commission_id`, lo que causa que aparezcan 4 veces en la lista.

## Causa Raíz

El frontend está haciendo peticiones GET a `/api/commissions?course_id=2025-programacion-1` **sin incluir el parámetro `career_id`**.

## Solución

### Opción 1: Filtrar por career_id (RECOMENDADO - Solución permanente)

El frontend debe incluir el `career_id` al buscar comisiones:

```javascript
// ❌ INCORRECTO - Devuelve duplicados
GET /api/commissions?course_id=2025-programacion-1

// ✅ CORRECTO - Devuelve solo las comisiones de esa carrera
GET /api/commissions?course_id=2025-programacion-1&career_id=isi-frm
```

**Implementación en el frontend:**

```javascript
// Asumiendo que tienes el career_id seleccionado previamente
const selectedCareer = 'isi-frm'; // Debe venir del estado del formulario
const selectedCourse = '2025-programacion-1';

// Petición correcta
const response = await fetch(
  `/api/commissions?course_id=${selectedCourse}&career_id=${selectedCareer}`
);
```

### Opción 2: Usar el endpoint de comisiones únicas (Solución rápida temporal)

He agregado un nuevo endpoint que devuelve solo UNA comisión por cada `commission_id`:

```javascript
// ✅ Devuelve comisiones únicas (sin duplicados)
GET /api/commissions/unique?course_id=2025-programacion-1
```

**Ventajas:**
- ✅ No requiere cambios en el frontend
- ✅ Elimina duplicados automáticamente
- ✅ Solución inmediata

**Desventajas:**
- ⚠️ Puede devolver comisiones de carreras no seleccionadas
- ⚠️ No es la solución arquitecturalmente correcta

**Implementación en el frontend:**

```javascript
// Cambiar el endpoint de /api/commissions a /api/commissions/unique
const response = await fetch(
  `/api/commissions/unique?course_id=${selectedCourse}`
);
```

### Opción 3: Cambio estructural en la base de datos

Si **NO** quieres que las comisiones se compartan entre carreras, debes hacer que el `commission_id` sea único por carrera.

Ejecuta el script de corrección:

```bash
node scripts/fixDuplicateCommissions.js
```

Esto agregará el sufijo de la carrera al `commission_id`:
- Antes: `2025-programacion-1-comision-1`
- Después: `2025-programacion-1-comision-1-frm`

⚠️ **ADVERTENCIA**: Esto romperá las referencias existentes en rúbricas y otros documentos que usen el `commission_id` antiguo.

### Opción 3: Re-ejecutar el seed con estructura correcta

Si estás en fase de desarrollo y puedes borrar la base de datos:

```bash
node scripts/seedDatabase.js
```

Y luego modifica el seed para que cree `commission_id` únicos:

```javascript
commission_id: `${course.course_id}-comision-${i}-${course.career_id.split('-')[1]}`,
// Ejemplo: 2025-programacion-1-comision-1-frm
```

## Recomendación Final

**Para solución inmediata (HOY):** Usa la **Opción 2** cambiando el endpoint a `/api/commissions/unique`

**Para solución permanente (MEJOR PRÁCTICA):** Implementa la **Opción 1** para que el frontend siempre envíe el `career_id`

**Opción 1** es la mejor solución a largo plazo porque:
1. ✅ No requiere cambios en la base de datos
2. ✅ No rompe referencias existentes
3. ✅ Respeta la jerarquía: Universidad → Facultad → Carrera → Curso → Comisión
4. ✅ Solo requiere que el frontend envíe el `career_id` (que ya debería tener)

## Cambios Realizados en el Backend

1. ✅ Agregado warning en el controller cuando se busca sin `career_id`
2. ✅ Documentación actualizada en el endpoint
3. ✅ **Nuevo endpoint**: `GET /api/commissions/unique` - Devuelve comisiones sin duplicados
4. ✅ Scripts de diagnóstico creados:
   - `scripts/checkDuplicates.js` - Detecta duplicados
   - `scripts/fixDuplicateCommissions.js` - Corrige duplicados (Opción 3)

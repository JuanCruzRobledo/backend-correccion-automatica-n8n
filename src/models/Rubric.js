/**
 * Modelo de Rúbrica
 */
import mongoose from 'mongoose';

// Tipos de rúbrica disponibles
const RUBRIC_TYPES = {
  TP: 'tp',
  PARCIAL_1: 'parcial-1',
  PARCIAL_2: 'parcial-2',
  RECUPERATORIO_1: 'recuperatorio-1',
  RECUPERATORIO_2: 'recuperatorio-2',
  FINAL: 'final',
  GLOBAL: 'global'
};

const rubricSchema = new mongoose.Schema(
  {
    rubric_id: {
      type: String,
      required: [true, 'El ID de la rúbrica es requerido'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'El nombre de la rúbrica es requerido'],
      trim: true,
    },
    commission_id: {
      type: String,
      required: [true, 'El ID de la comisión es requerido'],
      index: true,
    },
    course_id: {
      type: String,
      required: [true, 'El ID del curso es requerido'],
      index: true,
    },
    career_id: {
      type: String,
      required: [true, 'El ID de la carrera es requerido'],
      index: true,
    },
    faculty_id: {
      type: String,
      required: [true, 'El ID de la facultad es requerido'],
      index: true,
    },
    university_id: {
      type: String,
      required: [true, 'El ID de la universidad es requerido'],
      index: true,
    },
    rubric_type: {
      type: String,
      enum: Object.values(RUBRIC_TYPES),
      required: [true, 'El tipo de rúbrica es requerido'],
      index: true,
    },
    rubric_number: {
      type: Number,
      required: [true, 'El número de rúbrica es requerido'],
      min: [1, 'El número debe ser al menos 1'],
      default: 1,
    },
    year: {
      type: Number,
      required: [true, 'El año es requerido'],
      min: [2020, 'El año debe ser 2020 o posterior'],
      max: [2100, 'El año debe ser anterior a 2100'],
      index: true,
    },
    rubric_json: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'El JSON de la rúbrica es requerido'],
      validate: {
        validator: function (v) {
          // Validar que sea un objeto y tenga las propiedades mínimas
          return v && typeof v === 'object' && v.rubric_id;
        },
        message: 'El JSON de la rúbrica debe tener al menos rubric_id',
      },
    },
    source: {
      type: String,
      enum: ['pdf', 'json', 'manual'],
      required: [true, 'La fuente de la rúbrica es requerida'],
      default: 'manual',
    },
    original_file_url: {
      type: String,
      trim: true,
      default: null,
    },
    drive_folder_id: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices compuestos para consultas eficientes
rubricSchema.index({ rubric_id: 1, deleted: 1 });
rubricSchema.index({ commission_id: 1, rubric_type: 1, rubric_number: 1, deleted: 1 });
rubricSchema.index({ course_id: 1, year: 1, deleted: 1 });
rubricSchema.index({ rubric_type: 1, year: 1, deleted: 1 });
rubricSchema.index({ commission_id: 1, deleted: 1 });

// Evitar duplicados: comisión + tipo + número debe ser único
rubricSchema.index(
  { commission_id: 1, rubric_type: 1, rubric_number: 1 },
  { unique: true }
);

/**
 * Método estático para obtener rúbricas activas
 * @param {Object} filters - Filtros opcionales { commission_id, course_id, rubric_type, year }
 * @returns {Promise<Array>}
 */
rubricSchema.statics.findActive = function (filters = {}) {
  const query = { deleted: false };
  if (filters.commission_id) {
    query.commission_id = filters.commission_id;
  }
  if (filters.course_id) {
    query.course_id = filters.course_id;
  }
  if (filters.rubric_type) {
    query.rubric_type = filters.rubric_type;
  }
  if (filters.year) {
    query.year = filters.year;
  }
  if (filters.career_id) {
    query.career_id = filters.career_id;
  }
  if (filters.faculty_id) {
    query.faculty_id = filters.faculty_id;
  }
  if (filters.university_id) {
    query.university_id = filters.university_id;
  }
  return this.find(query).sort({ rubric_type: 1, rubric_number: 1, name: 1 });
};

/**
 * Método estático para obtener rúbricas por tipo
 * @param {String} commissionId
 * @param {String} rubricType
 * @returns {Promise<Array>}
 */
rubricSchema.statics.findByType = function (commissionId, rubricType) {
  return this.find({
    commission_id: commissionId,
    rubric_type: rubricType,
    deleted: false
  }).sort({ rubric_number: 1 });
};

/**
 * Método estático para generar un ID único de rúbrica
 * @param {String} commissionId
 * @param {String} rubricType
 * @param {String} name - Nombre de la rúbrica
 * @param {Number} rubricNumber
 * @returns {String}
 */
rubricSchema.statics.generateRubricId = function (commissionId, rubricType, name, rubricNumber) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  // Normalizar el nombre: convertir a minúsculas, reemplazar espacios y caracteres especiales por guiones
  const normalizedName = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres especiales y espacios por guiones
    .replace(/^-+|-+$/g, ''); // Eliminar guiones al inicio y final
  return `${commissionId}-${rubricType}-${normalizedName}-${rubricNumber}-${timestamp}-${random}`;
};

/**
 * Exportar constante de tipos para uso en controladores
 */
export { RUBRIC_TYPES };

/**
 * Método de instancia para soft delete
 * @returns {Promise<Document>}
 */
rubricSchema.methods.softDelete = function () {
  this.deleted = true;
  return this.save();
};

/**
 * Método de instancia para restaurar
 * @returns {Promise<Document>}
 */
rubricSchema.methods.restore = function () {
  this.deleted = false;
  return this.save();
};

// Evitar que documentos eliminados aparezcan en consultas por defecto
rubricSchema.pre(/^find/, function (next) {
  if (!this.getQuery().hasOwnProperty('deleted')) {
    this.where({ deleted: false });
  }
  next();
});

const Rubric = mongoose.model('Rubric', rubricSchema);

export default Rubric;

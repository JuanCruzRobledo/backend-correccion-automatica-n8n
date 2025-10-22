/**
 * Modelo de Rúbrica
 */
import mongoose from 'mongoose';

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
    university_id: {
      type: String,
      required: [true, 'El ID de la universidad es requerido'],
      index: true,
    },
    course_id: {
      type: String,
      required: [true, 'El ID del curso es requerido'],
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
rubricSchema.index({ university_id: 1, course_id: 1, deleted: 1 });

// Evitar duplicados por universidad + curso + rubric_id
rubricSchema.index({ university_id: 1, course_id: 1, rubric_id: 1 }, { unique: true });

/**
 * Método estático para obtener rúbricas activas
 * @param {Object} filters - Filtros opcionales { university_id, course_id }
 * @returns {Promise<Array>}
 */
rubricSchema.statics.findActive = function (filters = {}) {
  const query = { deleted: false };
  if (filters.university_id) {
    query.university_id = filters.university_id;
  }
  if (filters.course_id) {
    query.course_id = filters.course_id;
  }
  return this.find(query).sort({ name: 1 });
};

/**
 * Método estático para generar un ID único de rúbrica
 * @param {String} universityId
 * @param {String} courseId
 * @returns {String}
 */
rubricSchema.statics.generateRubricId = function (universityId, courseId) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${universityId}-${courseId}-${timestamp}-${random}`;
};

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

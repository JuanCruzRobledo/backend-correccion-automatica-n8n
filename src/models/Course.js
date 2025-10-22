/**
 * Modelo de Curso/Materia
 */
import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    course_id: {
      type: String,
      required: [true, 'El ID del curso es requerido'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, 'El ID debe contener solo letras minúsculas, números y guiones'],
    },
    name: {
      type: String,
      required: [true, 'El nombre del curso es requerido'],
      trim: true,
    },
    university_id: {
      type: String,
      required: [true, 'El ID de la universidad es requerido'],
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
courseSchema.index({ course_id: 1, deleted: 1 });
courseSchema.index({ university_id: 1, deleted: 1 });

/**
 * Método estático para obtener cursos activos
 * @param {String} universityId - ID de la universidad (opcional)
 * @returns {Promise<Array>}
 */
courseSchema.statics.findActive = function (universityId = null) {
  const query = { deleted: false };
  if (universityId) {
    query.university_id = universityId;
  }
  return this.find(query).sort({ name: 1 });
};

/**
 * Método de instancia para soft delete
 * @returns {Promise<Document>}
 */
courseSchema.methods.softDelete = function () {
  this.deleted = true;
  return this.save();
};

/**
 * Método de instancia para restaurar
 * @returns {Promise<Document>}
 */
courseSchema.methods.restore = function () {
  this.deleted = false;
  return this.save();
};

// Evitar que documentos eliminados aparezcan en consultas por defecto
courseSchema.pre(/^find/, function (next) {
  if (!this.getQuery().hasOwnProperty('deleted')) {
    this.where({ deleted: false });
  }
  next();
});

const Course = mongoose.model('Course', courseSchema);

export default Course;

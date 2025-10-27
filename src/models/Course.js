/**
 * Modelo de Curso/Materia
 */
import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    course_id: {
      type: String,
      required: [true, 'El ID del curso es requerido'],
      trim: true,
      lowercase: true,
      // Formato esperado: YYYY-nombre-del-curso (ej: 2025-programacion-ii)
      match: [/^[0-9]{4}-[a-z0-9-]+$/, 'El ID debe tener formato YYYY-nombre-del-curso'],
    },
    name: {
      type: String,
      required: [true, 'El nombre del curso es requerido'],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, 'El año es requerido'],
      min: [2020, 'El año debe ser 2020 o posterior'],
      max: [2100, 'El año debe ser anterior a 2100'],
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
courseSchema.index({ career_id: 1, year: 1, deleted: 1 });
courseSchema.index({ faculty_id: 1, deleted: 1 });
courseSchema.index({ university_id: 1, deleted: 1 });
courseSchema.index({ year: 1, deleted: 1 });

// Evita duplicados: career_id + course_id debe ser único
courseSchema.index({ career_id: 1, course_id: 1 }, { unique: true });

/**
 * Método estático para obtener cursos activos
 * @param {Object} filters - Filtros opcionales { career_id, year, faculty_id, university_id }
 * @returns {Promise<Array>}
 */
courseSchema.statics.findActive = function (filters = {}) {
  const query = { deleted: false };
  if (filters.career_id) {
    query.career_id = filters.career_id;
  }
  if (filters.year) {
    query.year = filters.year;
  }
  if (filters.faculty_id) {
    query.faculty_id = filters.faculty_id;
  }
  if (filters.university_id) {
    query.university_id = filters.university_id;
  }
  return this.find(query).sort({ name: 1 });
};

/**
 * Método estático para obtener cursos por año
 * @param {Number} year
 * @returns {Promise<Array>}
 */
courseSchema.statics.findByYear = function (year) {
  return this.find({ year, deleted: false }).sort({ name: 1 });
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

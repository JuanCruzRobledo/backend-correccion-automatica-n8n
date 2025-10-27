/**
 * Modelo de Carrera
 * Representa una carrera dentro de una facultad
 */
import mongoose from 'mongoose';

const careerSchema = new mongoose.Schema(
  {
    career_id: {
      type: String,
      required: [true, 'El ID de la carrera es requerido'],
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, 'El ID debe contener solo letras minúsculas, números y guiones'],
    },
    name: {
      type: String,
      required: [true, 'El nombre de la carrera es requerido'],
      trim: true,
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
careerSchema.index({ career_id: 1, deleted: 1 });
careerSchema.index({ faculty_id: 1, deleted: 1 });
careerSchema.index({ university_id: 1, deleted: 1 });

// Evitar duplicados: facultad + career_id debe ser único
careerSchema.index({ faculty_id: 1, career_id: 1 }, { unique: true });

/**
 * Método estático para obtener carreras activas
 * @param {String} facultyId - ID de la facultad (opcional)
 * @returns {Promise<Array>}
 */
careerSchema.statics.findActive = function (facultyId = null) {
  const query = { deleted: false };
  if (facultyId) {
    query.faculty_id = facultyId;
  }
  return this.find(query).sort({ name: 1 });
};

/**
 * Método de instancia para soft delete
 * @returns {Promise<Document>}
 */
careerSchema.methods.softDelete = function () {
  this.deleted = true;
  return this.save();
};

/**
 * Método de instancia para restaurar
 * @returns {Promise<Document>}
 */
careerSchema.methods.restore = function () {
  this.deleted = false;
  return this.save();
};

// Evitar que documentos eliminados aparezcan en consultas por defecto
careerSchema.pre(/^find/, function (next) {
  if (!this.getQuery().hasOwnProperty('deleted')) {
    this.where({ deleted: false });
  }
  next();
});

const Career = mongoose.model('Career', careerSchema);

export default Career;

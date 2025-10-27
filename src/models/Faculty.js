/**
 * Modelo de Facultad
 * Representa una facultad dentro de una universidad
 */
import mongoose from 'mongoose';

const facultySchema = new mongoose.Schema(
  {
    faculty_id: {
      type: String,
      required: [true, 'El ID de la facultad es requerido'],
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, 'El ID debe contener solo letras minúsculas, números y guiones'],
    },
    name: {
      type: String,
      required: [true, 'El nombre de la facultad es requerido'],
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
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
  }
);

// Índice compuesto para consultas eficientes
facultySchema.index({ faculty_id: 1, deleted: 1 });
facultySchema.index({ university_id: 1, deleted: 1 });

// Evitar duplicados: universidad + faculty_id debe ser único
facultySchema.index({ university_id: 1, faculty_id: 1 }, { unique: true });

/**
 * Método estático para obtener facultades activas
 * @param {String} universityId - ID de la universidad (opcional)
 * @returns {Promise<Array>}
 */
facultySchema.statics.findActive = function (universityId = null) {
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
facultySchema.methods.softDelete = function () {
  this.deleted = true;
  return this.save();
};

/**
 * Método de instancia para restaurar
 * @returns {Promise<Document>}
 */
facultySchema.methods.restore = function () {
  this.deleted = false;
  return this.save();
};

// Evitar que documentos eliminados aparezcan en consultas por defecto
facultySchema.pre(/^find/, function (next) {
  // Solo aplicar si no se está consultando explícitamente por deleted
  if (!this.getQuery().hasOwnProperty('deleted')) {
    this.where({ deleted: false });
  }
  next();
});

const Faculty = mongoose.model('Faculty', facultySchema);

export default Faculty;
